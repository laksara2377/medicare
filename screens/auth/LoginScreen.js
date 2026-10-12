import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Button from '../../components/Button';
import Header from '../../components/Header';
import dbService from '../../services/db';
import { getFirebaseServices } from '../../firebase/firebaseConfig';
import { authErrorMessage, normalizeEmail, validateEmail, validatePassword } from '../../utils/authValidation';

export default function LoginScreen({ navigation, onLoginSuccess, route }) {
  const routeRole = route?.params?.role;
  const [activeRole, setActiveRole] = useState(routeRole === 'caregiver' ? 'caregiver' : 'patient');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [hasError, setHasError] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (loading) return;
    setHasError(false);
    setErrorText('');
    const validationError = validateEmail(emailOrPhone) || validatePassword(password);
    if (validationError) {
      setHasError(true);
      setErrorText(validationError);
      return;
    }

    setLoading(true);
    try {
      const user = await dbService.signInFirebase(
        normalizeEmail(emailOrPhone),
        password,
        activeRole
      );

      if (user) {
        if (onLoginSuccess) {
          onLoginSuccess(user);
        } else {
          if (user.role === 'caregiver') {
            navigation?.navigate('CaregiverProfiles');
          } else {
            navigation?.navigate('TodaysSchedule');
          }
        }
        return;
      }
      setHasError(true);
      setErrorText("That password doesn't match. Check it and try again.");
    } catch (error) {
      setHasError(true);
      setErrorText(authErrorMessage(error, 'Something went wrong. Try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const emailError = validateEmail(emailOrPhone);
    if (emailError) {
      setHasError(true);
      setErrorText(emailError);
      return;
    }
    try {
      await sendPasswordResetEmail(getFirebaseServices().auth, normalizeEmail(emailOrPhone));
      setHasError(true);
      setErrorText('Password reset email sent. Check your inbox.');
    } catch (error) {
      setHasError(true);
      setErrorText(error.code === 'auth/user-not-found' ? 'No account was found for this email.' : 'Could not send the reset email. Try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Welcome back"
        subtitle="Sign in to your account"
        onBack={() => navigation?.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Role Selector Tabs (Patient / Caregiver) */}
        <View style={styles.roleTabsContainer}>
          <TouchableOpacity
            style={[styles.roleTab, activeRole === 'patient' && styles.activeRoleTab]}
            onPress={() => {
              setActiveRole('patient');
              setEmailOrPhone('');
            }}
          >
            <Text style={[styles.roleTabText, activeRole === 'patient' && styles.activeRoleTabText]}>
              Patient
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roleTab, activeRole === 'caregiver' && styles.activeRoleTab]}
            onPress={() => {
              setActiveRole('caregiver');
              setEmailOrPhone('');
            }}
          >
            <Text style={[styles.roleTabText, activeRole === 'caregiver' && styles.activeRoleTabText]}>
              Caregiver
            </Text>
          </TouchableOpacity>
        </View>

        {/* Email */}
        <View style={styles.fieldGroup}>
          <TextInput
            style={styles.input}
            value={emailOrPhone}
            onChangeText={(value) => { setEmailOrPhone(value); setHasError(false); setErrorText(''); }}
            placeholder="Email address"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Password */}
        <View style={styles.fieldGroup}>
          <TextInput
            style={[styles.input, hasError && styles.inputError]}
            value={password}
            onChangeText={(val) => {
              setPassword(val);
              setHasError(false);
            }}
            placeholder="Password"
            secureTextEntry
          />

          {/* Plain error text under field (UI-04) */}
          {hasError && (
            <View style={styles.errorRow}>
              <Text style={styles.errorIcon}>🔒</Text>
              <Text style={styles.errorText}>{errorText}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.forgotBtn} onPress={handleForgotPassword}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>
        </View>

        <Button title={loading ? 'Signing in...' : 'Sign in'} onPress={handleSignIn} style={styles.signInBtn} disabled={loading} />

        <View style={styles.signUpRow}>
          <Text style={styles.signUpQuestion}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation?.navigate('SignUp', { role: activeRole })}>
            <Text style={styles.signUpLink}>Sign up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  roleTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    padding: 4,
    marginBottom: 24,
  },
  roleTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeRoleTab: {
    backgroundColor: '#0D8F7A',
  },
  roleTabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  activeRoleTabText: {
    color: '#FFFFFF',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  inputError: {
    borderColor: '#EF4444',
    borderWidth: 1.5,
    backgroundColor: '#FFF5F5',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  errorIcon: {
    fontSize: 13,
    marginRight: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0D8F7A',
  },
  signInBtn: {
    marginTop: 12,
    marginBottom: 20,
  },
  signUpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpQuestion: {
    fontSize: 14,
    color: '#64748B',
  },
  signUpLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0D8F7A',
  },
});
