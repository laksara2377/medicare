import React, { useEffect, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheetConfirmation from '../../components/BottomSheetConfirmation';
import Button from '../../components/Button';
import FiveTabBottomBar from '../../components/FiveTabBottomBar';
import Header from '../../components/Header';
import ProfilePhotoActionModal from '../../components/ProfilePhotoActionModal';
import authService from '../../services/authService';
import dbService from '../../services/db';
import Text from '../../components/PatientText';
import { useT } from '../../i18n/LanguageContext';

export default function PatientProfileScreen({
  navigation,
  onNavigateTab,
  onLogout,
  userPreferences = {},
  currentUser,
}) {
  const t = useT();
  const [user, setUser] = useState(null);
  const [showLogoutSheet, setShowLogoutSheet] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showDeleteConfirmSheet, setShowDeleteConfirmSheet] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    const u = dbService.getUserById(currentUser?.id) || currentUser || dbService.getUserById('usr-patient-1');
    if (u) setUser(u);
  }, [currentUser?.id]);

  if (!user) return null;

  const handleSelectPhoto = async (photoUri) => {
    try {
      await dbService.updateUser(user.id, { profileImageUrl: photoUri });
      setUser((prev) => ({ ...prev, profileImageUrl: photoUri }));
      if (currentUser) {
        currentUser.profileImageUrl = photoUri;
      }
      setStatusMessage(t('photoUpdated') || 'Profile photo updated successfully');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (err) {
      console.error('Error updating patient profile photo:', err);
      setStatusMessage('Failed to update profile photo.');
    }
  };

  const handleDeletePhoto = async () => {
    setShowDeleteConfirmSheet(false);
    try {
      await dbService.updateUser(user.id, { profileImageUrl: null });
      setUser((prev) => ({ ...prev, profileImageUrl: null }));
      if (currentUser) {
        currentUser.profileImageUrl = null;
      }
      setStatusMessage(t('photoRemoved') || 'Profile photo removed');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (err) {
      console.error('Error removing patient profile photo:', err);
      setStatusMessage('Failed to remove profile photo.');
    }
  };

  const handleConfirmLogout = async () => {
    setShowLogoutSheet(false);
    await authService.logout(navigation);
  };

  return (
    <View style={styles.container}>
      <Header
        title={t('myProfile')}
        subtitle={t('careConnected')}
        onBack={() => navigation?.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {statusMessage ? (
          <View style={styles.statusBanner}>
            <Text style={styles.statusText}>✓ {statusMessage}</Text>
          </View>
        ) : null}

        {/* Avatar & Header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={() => setShowPhotoModal(true)}
            activeOpacity={0.8}
            accessibilityLabel="Change profile photo"
          >
            {user.profileImageUrl ? (
              <Image source={{ uri: user.profileImageUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{user.name ? user.name.charAt(0) : 'P'}</Text>
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowPhotoModal(true)}
            style={styles.photoActionLink}
            activeOpacity={0.7}
          >
            <Text style={styles.photoActionText}>
              {user.profileImageUrl ? (t('changePhoto') || 'Change photo') : (t('addPhoto') || 'Add photo')}
            </Text>
          </TouchableOpacity>

          <Text style={styles.name}>{user.name}</Text>
          <View style={styles.roleTag}>
            <Text style={styles.roleTagText}>{t('patientOwner')}</Text>
          </View>
        </View>

        {/* Personal Info Box */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>{t('personalInformation')}</Text>
          <View style={styles.infoField}>
            <Text style={styles.infoValue}>{user.phone}</Text>
          </View>
          <View style={styles.infoField}>
            <Text style={styles.infoValue}>{user.email}</Text>
          </View>
          <View style={styles.infoField}>
            <Text style={styles.infoValue}>
              {user.gender} · {user.age}
            </Text>
          </View>
        </View>

        {/* Settings Links */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>{t('settings')}</Text>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => navigation?.navigate('ShareWithDoctor')}
          >
            <Text style={styles.settingIcon}>📱</Text>
            <Text style={styles.settingText}>{t('shareDoctor')}</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => navigation?.navigate('MyPrescriptions')}
          >
            <Text style={styles.settingIcon}>📜</Text>
            <Text style={styles.settingText}>{t('myPrescriptions')}</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => navigation?.navigate('AccessibilityDisplay')}
          >
            <Text style={styles.settingIcon}>⚙️</Text>
            <Text style={styles.settingText}>{t('accessibilitySettings')}</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => navigation?.navigate('ManageAccess')}
          >
            <Text style={styles.settingIcon}>👥</Text>
            <Text style={styles.settingText}>{t('manageCaregiverAccess')}</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => navigation?.navigate('PatientCareNotes')}
          >
            <Text style={styles.settingIcon}>📝</Text>
            <Text style={styles.settingText}>Care notes</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        <Button
          title={t('logOut')}
          variant="danger-outline"
          onPress={() => setShowLogoutSheet(true)}
          style={styles.logoutBtn}
        />
      </ScrollView>

      {/* Profile Photo Action Modal */}
      <ProfilePhotoActionModal
        visible={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onSelectImage={handleSelectPhoto}
        onDeleteImage={() => setShowDeleteConfirmSheet(true)}
        hasImage={Boolean(user.profileImageUrl)}
        title={t('profilePhoto') || 'Profile photo'}
        colorScheme="green"
      />

      {/* Delete Photo Confirmation */}
      <BottomSheetConfirmation
        visible={showDeleteConfirmSheet}
        title={t('deletePhotoConfirmTitle') || 'Remove profile photo?'}
        message={t('deletePhotoConfirmMessage') || 'Are you sure you want to remove your profile photo?'}
        confirmLabel={t('remove') || 'Remove'}
        cancelLabel={t('cancel') || 'Cancel'}
        onConfirm={handleDeletePhoto}
        onCancel={() => setShowDeleteConfirmSheet(false)}
      />

      {/* Logout Confirmation Sheet */}
      <BottomSheetConfirmation
        visible={showLogoutSheet}
        title={t('logoutConfirmTitle')}
        message={t('logoutPatientMessage')}
        confirmLabel={t('logOut')}
        cancelLabel={t('cancel')}
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutSheet(false)}
      />

      <FiveTabBottomBar
        activeTab="profile"
        onSelectTab={(tabKey) => onNavigateTab && onNavigateTab(tabKey)}
        language={userPreferences.language}
        isLargeText={userPreferences.largeText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  statusBanner: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  statusText: {
    color: '#15803D',
    fontSize: 13,
    fontWeight: '700',
  },
  profileHeader: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EAF5F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E2E8F0',
  },
  avatarText: {
    fontSize: 34,
    fontWeight: '800',
    color: '#0D8F7A',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#0D8F7A',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  photoActionLink: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#EAF5F2',
    marginBottom: 10,
  },
  photoActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D8F7A',
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  roleTag: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  roleTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  sectionBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  infoField: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  settingIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  settingText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  chevron: {
    fontSize: 18,
    color: '#CBD5E1',
  },
  logoutBtn: {
    marginTop: 8,
    marginBottom: 20,
  },
});
