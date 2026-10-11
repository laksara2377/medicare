import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import Button from '../../components/Button';
import Header from '../../components/Header';
import PrescriptionCard from '../../components/PrescriptionCard';
import dbService, { getActivePatientId } from '../../services/db';

export default function MyPrescriptionsScreen({ navigation, route, currentUser }) {
  const [activeTab, setActiveTab] = useState('Active');
  const [prescriptions, setPrescriptions] = useState([]);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const patientId = getActivePatientId(currentUser);

  useEffect(() => {
    if (!route?.params?.prescriptionAdded) return undefined;
    setToastVisible(true);
    const timer = setTimeout(() => setToastVisible(false), 2500);
    return () => clearTimeout(timer);
  }, [route?.params?.prescriptionAdded]);

  useEffect(() => {
    if (!patientId) {
      setErrorMessage('No linked patient is available for this account.');
      setPrescriptions([]);
      return undefined;
    }
    setErrorMessage('');
    return dbService.subscribeToPrescriptions(
      patientId,
      activeTab.toLowerCase(),
      setPrescriptions,
      (error) => setErrorMessage(error.message || 'Could not load prescriptions.')
    );
  }, [activeTab, patientId]);

  const handleDownload = async (imageUrl) => {
    if (!imageUrl) {
      Alert.alert('No file attached', 'No file attached to this prescription.');
      return;
    }
    try {
      if (typeof window !== 'undefined' && window.document) {
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error(`Download failed: ${response.status}`);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const anchor = window.document.createElement('a');
        anchor.href = blobUrl;
        anchor.download = `prescription-${Date.now()}.jpg`;
        window.document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.URL.revokeObjectURL(blobUrl);
        return;
      }
      const localUri = `${FileSystem.cacheDirectory}prescription-${Date.now()}.jpg`;
      if (imageUrl.startsWith('data:image/')) {
        await FileSystem.writeAsStringAsync(localUri, imageUrl.split(',')[1], {
          encoding: FileSystem.EncodingType.Base64,
        });
      } else {
        await FileSystem.downloadAsync(imageUrl, localUri);
      }
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(localUri, { mimeType: 'image/jpeg' });
      } else {
        Alert.alert('Sharing unavailable', 'Image sharing is not available on this device.');
      }
    } catch (error) {
      console.error('[UI] Error downloading prescription:', {
        code: error?.code,
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
      });
      Alert.alert('Unable to download prescription', error.message || 'Please try again.');
    }
  };

  const handleDelete = (prescription) => {
    const remove = async () => {
      try {
        setErrorMessage('');
        await dbService.deletePrescription(prescription.id);
      } catch (error) {
        console.error('[UI] Error deleting prescription:', {
          code: error?.code,
          message: error?.message,
          name: error?.name,
          stack: error?.stack,
        });
        setErrorMessage(error.message || 'Could not delete the prescription.');
      }
    };
    if (typeof window !== 'undefined' && window.confirm) {
      if (window.confirm('Delete this prescription?')) remove();
    } else {
      Alert.alert('Delete prescription', 'Delete this prescription?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: remove },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="My Prescriptions" subtitle="Prescription history" onBack={() => navigation?.navigate('PatientProfile')} />
      <View style={styles.tabsRow}>
        {['Active', 'Previous'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.selectedTabBtn]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.selectedTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        {prescriptions.map((prescription) => (
          <PrescriptionCard
            key={prescription.id}
            prescription={{
              ...prescription,
              status: prescription.status === 'active' ? 'Active' : 'Previous',
              instructions: (prescription.medicines || []).map((line, index) => `${index + 1}. ${line}`).join('\n') || prescription.notes,
            }}
            onViewImage={() => prescription.imageUrl && setSelectedImageUrl(prescription.imageUrl)}
            onDownload={() => handleDownload(prescription.imageUrl)}
            onEdit={() => navigation?.navigate('AddPrescription', { prescriptionId: prescription.id })}
            onDelete={() => handleDelete(prescription)}
          />
        ))}
        <Button title="+ Add New Prescription" variant="outline" onPress={() => navigation?.navigate('AddPrescription')} style={styles.addBtn} />
      </ScrollView>

      {toastVisible ? <View style={styles.toast}><Text style={styles.toastText}>Prescription added</Text></View> : null}
      <Modal visible={Boolean(selectedImageUrl)} transparent animationType="fade" onRequestClose={() => setSelectedImageUrl(null)}>
        <View style={styles.imageModal}>
          <TouchableOpacity style={styles.closeImageButton} onPress={() => setSelectedImageUrl(null)} accessibilityLabel="Close full image">
            <Text style={styles.closeImageText}>×</Text>
          </TouchableOpacity>
          {selectedImageUrl ? <Image source={{ uri: selectedImageUrl }} style={styles.fullImage} resizeMode="contain" /> : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  tabsRow: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12, marginHorizontal: 4, backgroundColor: '#F1F5F9' },
  selectedTabBtn: { backgroundColor: '#0B7666' },
  tabText: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  selectedTabText: { color: '#FFFFFF' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  errorText: { color: '#C0392B', fontSize: 14, fontWeight: '600', marginBottom: 12 },
  addBtn: { marginTop: 8 },
  toast: { position: 'absolute', left: 20, right: 20, bottom: 20, padding: 14, borderRadius: 10, backgroundColor: '#1F2A44', alignItems: 'center' },
  toastText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  imageModal: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.94)', justifyContent: 'center', alignItems: 'center' },
  closeImageButton: { position: 'absolute', top: 32, right: 20, zIndex: 1, padding: 10 },
  closeImageText: { color: '#FFFFFF', fontSize: 36, fontWeight: '300' },
  fullImage: { width: '100%', height: '80%' },
});
