import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import BottomSheetConfirmation from '../../components/BottomSheetConfirmation';
import Button from '../../components/Button';
import ClinicianTopBar from '../../components/ClinicianTopBar';
import MedicineCard from '../../components/MedicineCard';
import PatientText from '../../components/PatientText';
import { getFirebaseServices } from '../../firebase/firebaseConfig';
import authService from '../../services/authService';
import dbService from '../../services/db';

const Text = PatientText;
const isActive = (status) => ['active', 'accepted'].includes(String(status || '').toLowerCase());

export default function PharmacistPatientMedicinesScreen({ navigation, route, currentUser }) {
  const pharmacist = currentUser || route?.params?.pharmacist || { name: 'Pharmacist', role: 'pharmacist' };
  const pharmacistId = getFirebaseServices().auth.currentUser?.uid || pharmacist.id;
  const [links, setLinks] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(route?.params?.patientId || null);
  const [patientName, setPatientName] = useState('Linked patient');
  const [activeFilter, setActiveFilter] = useState('All medicines');
  const [medicines, setMedicines] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [medicineToRefill, setMedicineToRefill] = useState(null);
  const [medicineToDelete, setMedicineToDelete] = useState(null);

  useEffect(() => dbService.subscribeToCareLinks(
    pharmacistId,
    'pharmacist',
    (records) => {
      const pharmacistLinks = records.filter((item) => item.role === 'pharmacist');
      setLinks(pharmacistLinks);
      const activeLinks = pharmacistLinks.filter((item) => isActive(item.status));
      setSelectedPatientId((current) => activeLinks.some((item) => item.patientId === current) ? current : activeLinks[0]?.patientId || null);
    },
    (error) => setLoadError(error?.message || 'Could not load assigned patients.'),
  ), [pharmacistId]);

  useEffect(() => {
    if (!selectedPatientId) {
      setMedicines([]);
      return undefined;
    }
    const selectedLink = links.find((item) => item.patientId === selectedPatientId);
    setPatientName(selectedLink?.patientName || selectedLink?.addedBy || 'Linked patient');
    dbService.getUserProfileById(selectedPatientId).then((profile) => {
      if (profile?.name) setPatientName(profile.name);
    }).catch(() => {});
    return dbService.subscribeToMedicines(selectedPatientId, setMedicines, (error) => setLoadError(error?.message || 'Could not load medicines.'));
  }, [selectedPatientId, links]);

  const pendingCount = links.filter((item) => String(item.status).toLowerCase() === 'pending').length;
  const activeLinks = links.filter((item) => isActive(item.status));
  const filtered = useMemo(() => medicines.filter((medicine) => activeFilter === 'All medicines' || medicine.stockDays <= 7 || medicine.refillStatus !== 'OK'), [activeFilter, medicines]);
  const needsRefill = medicines.filter((medicine) => medicine.stockDays <= 7 || medicine.refillStatus !== 'OK').length;

  const flash = (message) => {
    setToastMsg(message);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleConfirmRefill = async () => {
    const medicine = medicineToRefill;
    setMedicineToRefill(null);
    if (!medicine) return;
    try {
      await dbService.updateMedicine(medicine.id, { stockDays: 30, refillStatus: 'OK' });
      await dbService.markRefilled(medicine.id, pharmacistId, pharmacist.name || 'Pharmacist');
      flash(`${medicine.name} marked as refilled`);
    } catch (error) {
      setLoadError(error?.message || 'Could not mark this medicine as refilled.');
    }
  };

  const handleConfirmDelete = async () => {
    const medicine = medicineToDelete;
    setMedicineToDelete(null);
    if (!medicine) return;
    try {
      await dbService.deleteMedicine(medicine.id, selectedPatientId);
      flash(`${medicine.name} deleted`);
    } catch (error) {
      setLoadError(error?.message || 'Could not delete this medicine.');
    }
  };

  return (
    <View style={styles.container}>
      <ClinicianTopBar title="Patient medicines" subtitle={selectedPatientId ? `${patientName} · pharmacy access` : 'No accepted patient selected'} onProfilePress={() => navigation?.navigate('PharmacistProfile', { pharmacist })} onLogoutPress={() => authService.logout(navigation)} />
      {pendingCount > 0 ? <TouchableOpacity style={styles.requestBanner} onPress={() => navigation?.navigate('PharmacistProfile', { pharmacist })}><Text style={styles.requestText}>{pendingCount} patient request{pendingCount === 1 ? '' : 's'} waiting · Review</Text></TouchableOpacity> : null}
      {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}
      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>{needsRefill} medicines need refill</Text>
        <Button title="+ Add medicine" style={styles.addButton} disabled={!selectedPatientId} onPress={() => navigation?.navigate('AddMedicineDetails', { returnScreen: 'PharmacistPatientMedicines', patientId: selectedPatientId })} />
      </View>
      {activeLinks.length > 1 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.patientTabs}>{activeLinks.map((link) => <TouchableOpacity key={link.id} style={[styles.patientChip, selectedPatientId === link.patientId && styles.patientChipSelected]} onPress={() => setSelectedPatientId(link.patientId)}><Text style={[styles.patientChipText, selectedPatientId === link.patientId && styles.patientChipTextSelected]}>{link.patientName || link.addedBy || 'Patient'}</Text></TouchableOpacity>)}</ScrollView> : null}
      <View style={styles.tabsRow}>{['All medicines', 'Needs refill'].map((label) => <TouchableOpacity key={label} style={[styles.tabBtn, activeFilter === label && styles.selectedTabBtn]} onPress={() => setActiveFilter(label)}><Text style={[styles.tabText, activeFilter === label && styles.selectedTabText]}>{label}</Text></TouchableOpacity>)}</View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {!selectedPatientId ? <Text style={styles.emptyText}>Accept a patient request from your profile to view and manage medicines.</Text> : null}
        {selectedPatientId && filtered.length === 0 ? <Text style={styles.emptyText}>No medicines in this list.</Text> : null}
        {filtered.map((item) => <View key={item.id} style={styles.medicineBlock}><MedicineCard medicine={item} showStockDays showRefillStatus onMarkRefilled={() => setMedicineToRefill(item)} /><View style={styles.cardActions}><TouchableOpacity style={styles.editButton} onPress={() => navigation?.navigate('EditDeleteMedicine', { medicineId: item.id, returnScreen: 'PharmacistPatientMedicines', returnParams: { patientId: selectedPatientId, pharmacist } })}><Text style={styles.editText}>Edit</Text></TouchableOpacity><TouchableOpacity style={styles.deleteButton} onPress={() => setMedicineToDelete(item)}><Text style={styles.deleteText}>Delete</Text></TouchableOpacity></View></View>)}
      </ScrollView>
      {toastMsg ? <View style={styles.toastBanner}><Text style={styles.toastText}>{toastMsg}</Text></View> : null}
      <BottomSheetConfirmation visible={Boolean(medicineToRefill)} title="Mark as refilled" message={`Mark ${medicineToRefill?.name || 'this medicine'} as refilled?`} onCancel={() => setMedicineToRefill(null)} onConfirm={handleConfirmRefill} />
      <BottomSheetConfirmation visible={Boolean(medicineToDelete)} title="Delete medicine?" message={`Delete ${medicineToDelete?.name || 'this medicine'}?`} confirmLabel="Delete" cancelLabel="Cancel" onCancel={() => setMedicineToDelete(null)} onConfirm={handleConfirmDelete} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' }, requestBanner: { marginHorizontal: 16, marginTop: 10, padding: 12, borderRadius: 10, backgroundColor: '#FEF3C7' }, requestText: { color: '#92400E', fontWeight: '700', textAlign: 'center' }, errorText: { margin: 16, color: '#B91C1C', backgroundColor: '#FEE2E2', padding: 10, borderRadius: 8 }, summaryRow: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }, summaryText: { color: '#1F2937', fontSize: 14, fontWeight: '700', marginBottom: 8 }, addButton: { alignSelf: 'flex-start', minHeight: 40, paddingVertical: 8, paddingHorizontal: 16, marginBottom: 0 }, patientTabs: { paddingHorizontal: 16, paddingTop: 10 }, patientChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: '#F1F5F9', marginRight: 8 }, patientChipSelected: { backgroundColor: '#0D8F7A' }, patientChipText: { color: '#475569', fontWeight: '600' }, patientChipTextSelected: { color: '#FFFFFF' }, tabsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }, tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 14, marginHorizontal: 4, backgroundColor: '#F1F5F9' }, selectedTabBtn: { backgroundColor: '#0D8F7A' }, tabText: { fontSize: 14, fontWeight: '700', color: '#64748B' }, selectedTabText: { color: '#FFFFFF' }, scrollContent: { padding: 16, paddingBottom: 80 }, emptyText: { color: '#4B5563', fontSize: 15, textAlign: 'center', paddingVertical: 28, lineHeight: 22 }, medicineBlock: { marginBottom: 12, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' }, cardActions: { flexDirection: 'row', padding: 8, paddingTop: 0, gap: 8 }, editButton: { flex: 1, borderWidth: 1, borderColor: '#0D8F7A', borderRadius: 9, paddingVertical: 8, alignItems: 'center' }, deleteButton: { flex: 1, borderWidth: 1, borderColor: '#EF4444', borderRadius: 9, paddingVertical: 8, alignItems: 'center' }, editText: { color: '#0D8F7A', fontWeight: '700' }, deleteText: { color: '#EF4444', fontWeight: '700' }, toastBanner: { position: 'absolute', bottom: 24, left: 20, right: 20, backgroundColor: '#0F172A', borderRadius: 12, padding: 12, alignItems: 'center' }, toastText: { color: '#FFFFFF', fontWeight: '600' },
});
