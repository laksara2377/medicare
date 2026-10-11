import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

/**
 * Resizes and compresses an image URI into a compact base64 JPEG string.
 */
async function processImageUri(uri) {
  const prepared = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 320 } }],
    {
      compress: 0.55,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    }
  );

  if (!prepared.base64) {
    throw new Error('Could not process the selected image.');
  }

  return `data:image/jpeg;base64,${prepared.base64}`;
}

/**
 * Launches the camera to capture a new profile photo.
 */
export async function takeProfilePhoto() {
  if (Platform.OS !== 'web') {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Camera permission is required to take a profile photo.');
    }
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });

  if (result.canceled || !result.assets?.[0]?.uri) {
    return null;
  }

  return processImageUri(result.assets[0].uri);
}

/**
 * Opens the photo library to pick an existing image.
 */
export async function pickProfilePhotoFromLibrary() {
  if (Platform.OS !== 'web') {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Photo library permission is required to select a profile photo.');
    }
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });

  if (result.canceled || !result.assets?.[0]?.uri) {
    return null;
  }

  return processImageUri(result.assets[0].uri);
}
