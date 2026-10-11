import React, { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheetConfirmation from '../../components/BottomSheetConfirmation';
import Button from '../../components/Button';
import Header from '../../components/Header';
import ProfilePhotoActionModal from '../../components/ProfilePhotoActionModal';
import authService from '../../services/authService';
import dbService from '../../services/db';

export default function NurseProfileScreen({ navigation, route, onLogout, currentUser }) {
  const nurse = currentUser || route?.params?.nurse || dbService.getUserById('usr-nurse-1') || {
    id: 'usr-nurse-1',
    name: 'Nurse Dilani',
    age: '34',
    email: 'dilani@careteam.lk',
    phone: '+94 77 123 4567',
    nurseId: 'N-2041',
  };

  const [nurseUser, setNurseUser] = useState(nurse);
  const [profileImage, setProfileImage] = useState(nurse.profileImageUrl || null);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(nurse.name || '');
  const [age, setAge] = useState(nurse.age || '');
  const [email, setEmail] = useState(nurse.email || '');
  const [phone, setPhone] = useState(nurse.phone || '');
  const [nurseId, setNurseId] = useState(nurse.nurseId ? nurse.nurseId : '');
  const [showLogoutSheet, setShowLogoutSheet] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [formError, setFormError] = useState('');
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handlePhotoSelected = async (newUri) => {
    setProfileImage(newUri);
    try {
      await dbService.updateUser(nurseUser.id, {
        profileImageUrl: newUri,
      });
      setNurseUser((prev) => ({ ...prev, profileImageUrl: newUri }));
      if (currentUser) {
        currentUser.profileImageUrl = newUri;
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving nurse profile photo:', err);
      setFormError('Failed to update profile photo.');
    }
  };

  const handlePhotoDeleted = async () => {
    setShowDeleteConfirm(false);
    setProfileImage(null);
    try {
      await dbService.updateUser(nurseUser.id, {
        profileImageUrl: null,
      });
      setNurseUser((prev) => ({ ...prev, profileImageUrl: null }));
      if (currentUser) {
        currentUser.profileImageUrl = null;
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Error removing nurse profile photo:', err);
      setFormError('Failed to remove profile photo.');
    }
  };

  const handleSaveDetails = async () => {
    setFormError('');
    
    // Validation
    if (!name.trim()) {
      setFormError('Name is required');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setFormError('Please enter a valid email address');
      return;
    }
    
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      setFormError('Please enter a valid phone number');
      return;
    }
    
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 18 || ageNum > 100) {
      setFormError('Age must be between 18 and 100');
      return;
    }

    try {
      await dbService.updateUser(nurseUser.id, {
        name: name.trim(),
        age: age.trim(),
        email: email.trim(),
        phone: phone.trim(),
        profileImageUrl: profileImage,
      });

      setNurseUser((prev) => ({
        ...prev,
        name: name.trim(),
        age: age.trim(),
        email: email.trim(),
        phone: phone.trim(),
        profileImageUrl: profileImage,
      }));

      if (currentUser) {
        currentUser.name = name.trim();
        currentUser.age = age.trim();
        currentUser.email = email.trim();
        currentUser.phone = phone.trim();
        currentUser.profileImageUrl = profileImage;
      }
      
      setSavedSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      setFormError('Failed to save profile changes.');
    }
  };

  const handleCancelEdit = () => {
    setName(nurseUser.name || '');
    setAge(nurseUser.age || '');
    setEmail(nurseUser.email || '');
    setPhone(nurseUser.phone || '');
    setProfileImage(nurseUser.profileImageUrl || null);
    setFormError('');
    setIsEditing(false);
  };

  const handleConfirmLogout = async () => {
    setShowLogoutSheet(false);
    if (onLogout) {
      onLogout();
    } else {
      await authService.logout(navigation);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Nurse profile"
        subtitle="Manage care team profile"
        onBack={() => navigation?.goBack()}
        colorScheme="blue"
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {savedSuccess && (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>✓ Profile details updated successfully!</Text>
          </View>
        )}

        {/* Avatar & Header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={() => setShowPhotoModal(true)}
            activeOpacity={0.8}
            accessibilityLabel="Change profile photo"
          >
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{name ? name.charAt(0) : 'N'}</Text>
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
              {profileImage ? 'Change photo' : 'Add photo'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.name}>{name || nurseUser.name || 'Nurse Dilani'}</Text>
          <View style={styles.roleTag}>
            <Text style={styles.roleTagText}>Nurse · Care team</Text>
          </View>
        </View>

        {/* Form Fields */}
        <View style={styles.formCard}>
          {isEditing ? (
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>PROFILE PHOTO</Text>
                <View style={styles.photoEditRow}>
                  {profileImage ? (
                    <Image source={{ uri: profileImage }} style={styles.previewImage} />
                  ) : (
                    <View style={styles.previewPlaceholder}>
                      <Text style={styles.previewPlaceholderText}>{name ? name.charAt(0) : 'N'}</Text>
                    </View>
                  )}
                  <View style={styles.photoEditActions}>
                    <TouchableOpacity
                      style={styles.changePhotoBtn}
                      onPress={() => setShowPhotoModal(true)}
                    >
                      <Text style={styles.changePhotoBtnText}>
                        {profileImage ? 'Change photo' : 'Add photo'}
                      </Text>
                    </TouchableOpacity>
                    {profileImage ? (
                      <TouchableOpacity
                        style={styles.deletePhotoBtn}
                        onPress={() => setShowDeleteConfirm(true)}
                      >
                        <Text style={styles.deletePhotoBtnText}>Remove photo</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>FULL NAME</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter full name"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>AGE</Text>
                <TextInput
                  style={styles.input}
                  value={age}
                  onChangeText={setAge}
                  placeholder="Age"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>EMAIL</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>PHONE NUMBER</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Phone number"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>NURSE ID</Text>
                <View style={styles.lockedField}>
                  <TextInput
                    style={[styles.input, styles.lockedInput]}
                    value={nurseId}
                    editable={false}
                  />
                  <Text style={styles.lockIcon}>🔒</Text>
                </View>
              </View>

              {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

              <View style={styles.editActionsRow}>
                <Button
                  title="Save changes"
                  colorScheme="blue"
                  onPress={handleSaveDetails}
                  style={styles.saveBtn}
                />
                <Button
                  title="Cancel"
                  variant="outline"
                  colorScheme="blue"
                  onPress={handleCancelEdit}
                  style={styles.cancelBtn}
                />
              </View>
            </>
          ) : (
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>FULL NAME</Text>
                <Text style={styles.value}>{nurseUser.name || '—'}</Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>AGE</Text>
                <Text style={styles.value}>{nurseUser.age || '—'}</Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>EMAIL</Text>
                <Text style={styles.value}>{nurseUser.email || '—'}</Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>PHONE NUMBER</Text>
                <Text style={styles.value}>{nurseUser.phone || '—'}</Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>NURSE ID</Text>
                <View style={styles.lockedField}>
                  <Text style={[styles.value, styles.lockedValue]}>{nurseUser.nurseId || '—'}</Text>
                  <Text style={styles.lockIcon}>🔒</Text>
                </View>
              </View>

              <Button
                title="Edit details"
                variant="outline"
                colorScheme="blue"
                onPress={() => setIsEditing(true)}
                style={styles.editBtn}
              />
            </>
          )}
        </View>

        <Button
          title="Log out"
          style={styles.logoutBtn}
          textStyle={styles.logoutBtnText}
          onPress={() => setShowLogoutSheet(true)}
        />
      </ScrollView>

      {/* Profile Photo Action Modal */}
      <ProfilePhotoActionModal
        visible={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onSelectImage={handlePhotoSelected}
        onDeleteImage={() => setShowDeleteConfirm(true)}
        hasImage={Boolean(profileImage)}
        title="Nurse profile photo"
        colorScheme="blue"
      />

      {/* Delete Photo Confirmation */}
      <BottomSheetConfirmation
        visible={showDeleteConfirm}
        title="Remove profile photo?"
        message="Are you sure you want to remove your profile photo?"
        confirmLabel="Remove"
        cancelLabel="Cancel"
        colorScheme="blue"
        onConfirm={handlePhotoDeleted}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* Logout Confirmation Sheet */}
      <BottomSheetConfirmation
        visible={showLogoutSheet}
        title="Log out of Nurse Portal?"
        message="You will need to sign back in with your Nurse ID."
        confirmLabel="Log out"
        cancelLabel="Cancel"
        colorScheme="blue"
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutSheet(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  successBanner: {
    backgroundColor: '#EFF6FF',
    borderColor: '#007AFF',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  successText: {
    color: '#007AFF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  profileHeader: {
    alignItems: 'center',
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
    backgroundColor: '#EFF6FF',
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
    color: '#007AFF',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007AFF',
    width: 26,
    height: 26,
    borderRadius: 13,
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
    backgroundColor: '#EFF6FF',
    marginBottom: 8,
  },
  photoActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#007AFF',
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  roleTag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  roleTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#007AFF',
  },
  photoEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 10,
  },
  previewImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 14,
  },
  previewPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  previewPlaceholderText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
  },
  photoEditActions: {
    flex: 1,
  },
  changePhotoBtn: {
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  changePhotoBtnText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '700',
  },
  deletePhotoBtn: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  deletePhotoBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  value: {
    fontSize: 15,
    color: '#0F172A',
  },
  lockedField: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockedInput: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  lockedValue: {
    flex: 1,
    color: '#64748B',
  },
  lockIcon: {
    fontSize: 16,
    marginLeft: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    marginBottom: 12,
  },
  editActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  saveBtn: {
    flex: 1,
    marginBottom: 0,
  },
  cancelBtn: {
    flex: 1,
    marginBottom: 0,
  },
  editBtn: {
    marginTop: 6,
  },
  logoutBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#EF4444',
    marginTop: 8,
  },
  logoutBtnText: {
    color: '#EF4444',
  },
});
