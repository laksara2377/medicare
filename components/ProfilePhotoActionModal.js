import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { takeProfilePhoto, pickProfilePhotoFromLibrary } from '../utils/profilePhotoHelper';

export default function ProfilePhotoActionModal({
  visible,
  onClose,
  onSelectImage,
  onDeleteImage,
  hasImage = false,
  title = 'Profile photo',
  subtitle,
  colorScheme = 'green',
}) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!visible) return null;

  const isBlue = colorScheme === 'blue';
  const primaryColor = isBlue ? '#007AFF' : '#0D8F7A';
  const resolvedTitle = title || (hasImage ? 'Change or remove photo' : 'Add profile photo');
  const resolvedSubtitle = subtitle || (hasImage
    ? 'Choose a new photo or remove your current photo'
    : 'Take a photo or choose one from your gallery');

  const handleTakeCamera = async () => {
    try {
      setErrorMessage('');
      setLoading(true);
      const uri = await takeProfilePhoto();
      if (uri) {
        onSelectImage(uri);
        onClose();
      }
    } catch (err) {
      setErrorMessage(err.message || 'Could not take photo.');
    } finally {
      setLoading(false);
    }
  };

  const handlePickGallery = async () => {
    try {
      setErrorMessage('');
      setLoading(true);
      const uri = await pickProfilePhotoFromLibrary();
      if (uri) {
        onSelectImage(uri);
        onClose();
      }
    } catch (err) {
      setErrorMessage(err.message || 'Could not select photo.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    setErrorMessage('');
    onClose();
    // Let the photo picker modal close before opening a confirmation sheet.
    // This avoids stacked native/web modals swallowing the remove action.
    setTimeout(() => onDeleteImage?.(), 0);
  };

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <View style={styles.sheetContainer}>
        <View style={styles.handle} />
        <Text style={styles.title}>{resolvedTitle}</Text>
        <Text style={styles.subtitle}>{resolvedSubtitle}</Text>

        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={primaryColor} />
            <Text style={styles.loadingText}>Processing photo...</Text>
          </View>
        ) : (
          <View style={styles.optionsList}>
            {/* Take Photo */}
            <TouchableOpacity
              style={styles.optionRow}
              onPress={handleTakeCamera}
              activeOpacity={0.7}
            >
              <View style={[styles.iconCircle, { backgroundColor: isBlue ? '#EFF6FF' : '#EAF5F2' }]}>
                <Ionicons name="camera-outline" size={22} color={primaryColor} />
              </View>
              <View style={styles.optionTextCol}>
                <Text style={styles.optionTitle}>{hasImage ? 'Take new photo' : 'Take photo'}</Text>
                <Text style={styles.optionSub}>{hasImage ? 'Replace your current photo using the camera' : 'Use the camera to add a profile photo'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            {/* Choose from Gallery */}
            <TouchableOpacity
              style={styles.optionRow}
              onPress={handlePickGallery}
              activeOpacity={0.7}
            >
              <View style={[styles.iconCircle, { backgroundColor: isBlue ? '#EFF6FF' : '#EAF5F2' }]}>
                <Ionicons name="images-outline" size={22} color={primaryColor} />
              </View>
              <View style={styles.optionTextCol}>
                <Text style={styles.optionTitle}>{hasImage ? 'Choose replacement' : 'Choose from gallery'}</Text>
                <Text style={styles.optionSub}>{hasImage ? 'Replace your current photo from the gallery' : 'Select a profile photo from your device'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            {/* Remove Photo (if image exists) */}
            {hasImage ? (
              <TouchableOpacity
                style={[styles.optionRow, styles.deleteOptionRow]}
                onPress={handleDelete}
                activeOpacity={0.7}
              >
                <View style={[styles.iconCircle, styles.deleteIconCircle]}>
                  <Ionicons name="trash-outline" size={22} color="#DC2626" />
                </View>
                <View style={styles.optionTextCol}>
                  <Text style={styles.deleteOptionTitle}>Remove photo</Text>
                  <Text style={styles.optionSub}>Delete your current profile photo</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#FCA5A5" />
              </TouchableOpacity>
            ) : null}

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 12,
  },
  handle: {
    width: 44,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
    width: '100%',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  optionsList: {
    width: '100%',
    marginTop: 4,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  deleteOptionRow: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FEE2E2',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  deleteIconCircle: {
    backgroundColor: '#FEE2E2',
  },
  optionTextCol: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  deleteOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 2,
  },
  optionSub: {
    fontSize: 12,
    color: '#64748B',
  },
  cancelButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
  },
});
