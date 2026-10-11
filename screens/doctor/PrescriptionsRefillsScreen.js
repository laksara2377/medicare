import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import Button from '../../components/Button';
import Header from '../../components/Header';
import Text from '../../components/PatientText';
import dbService, { getActivePatientId } from '../../services/db';

export default function PrescriptionsRefillsScreen({ navigation, route, currentUser }) {
  const doctor = route?.params?.doctor || currentUser || {};
  const patientId = route?.params?.patientId || getActivePatientId(doctor);
  const [prescriptions, setPrescriptions] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!patientId) return undefined;
    return dbService.subscribeToPrescriptions(patientId, 'active', setPrescriptions, (e) => setError(e.message));
  }, [patientId]);
  const params = { doctor, patientId, returnScreen: 'PrescriptionsRefills' };
  const remove = (item) => {
    const execute = async () => { try { await dbService.deletePrescription(item.id); } catch (e) { setError(e.message); } };
    if (typeof window !== 'undefined' && window.confirm) { if (window.confirm('Delete this prescription?')) execute(); }
    else Alert.alert('Delete prescription', 'Delete this prescription?', [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: execute }]);
  };
  return <View style={styles.container}><Header title="Prescription Management" subtitle="Manage patient prescriptions" onBack={() => navigation?.navigate('HomeVisitSummary', params)} /><ScrollView contentContainerStyle={styles.content}>
    {error ? <Text style={styles.error}>{error}</Text> : null}
    <View style={styles.stats}><Stat value={prescriptions.length} label="Total Prescriptions" /><Stat value={prescriptions.filter((p) => p.status === 'active').length} label="Active" /></View>
    <Button title="+ Add New Prescription" onPress={() => navigation?.navigate('AddPrescription', params)} />
    <Text style={styles.section}>PREVIOUS PRESCRIPTIONS</Text>
    {prescriptions.map((rx) => <View key={rx.id} style={styles.card}><View style={styles.top}><View><Text style={styles.name}>{rx.medicines?.[0] || rx.doctorName || 'Prescription'}</Text><Text style={styles.date}>{rx.date || 'Today'}</Text></View><Text style={styles.active}>Active</Text></View><View style={styles.details}><Detail label="Doctor" value={rx.doctorName || doctor.name || 'Doctor'} /><Detail label="Medicines" value={String(rx.medicines?.length || 0)} /><Detail label="Status" value="Active" /></View>{rx.notes ? <View style={styles.note}><Text style={styles.small}>Instructions</Text><Text style={styles.noteText}>{rx.notes}</Text></View> : null}<View style={styles.actions}><TouchableOpacity style={styles.edit} onPress={() => navigation?.navigate('AddPrescription', { ...params, prescriptionId: rx.id })}><Text style={styles.editText}>Edit</Text></TouchableOpacity><TouchableOpacity style={styles.delete} onPress={() => remove(rx)}><Text style={styles.deleteText}>Delete</Text></TouchableOpacity></View></View>)}
    {!prescriptions.length ? <Text style={styles.empty}>No prescriptions have been added.</Text> : null}
  </ScrollView></View>;
}
function Stat({ value, label }) { return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>; }
function Detail({ label, value }) { return <View><Text style={styles.small}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>; }
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: '#FFF' }, content: { padding: 20, paddingBottom: 40 }, error: { color: '#C0392B', fontWeight: '700', marginBottom: 12 }, stats: { flexDirection: 'row', gap: 14, marginBottom: 20 }, stat: { flex: 1, borderWidth: 1, borderColor: '#D9E3EC', borderRadius: 16, padding: 22, alignItems: 'center' }, statValue: { color: '#0D8F7A', fontSize: 26, fontWeight: '900' }, statLabel: { color: '#64748B', fontSize: 12, marginTop: 5, textAlign: 'center' }, section: { color: '#94A3B8', fontWeight: '900', fontSize: 11, marginTop: 17, marginBottom: 10 }, card: { borderWidth: 1, borderColor: '#D9E3EC', borderRadius: 17, padding: 16, marginBottom: 13 }, top: { flexDirection: 'row', justifyContent: 'space-between' }, name: { color: '#0F172A', fontWeight: '900', fontSize: 16 }, date: { color: '#64748B', fontSize: 12, marginTop: 3 }, active: { color: '#0D8F7A', backgroundColor: '#EAF5F2', padding: 6, borderRadius: 9, fontSize: 11, fontWeight: '800' }, details: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 }, small: { color: '#94A3B8', fontSize: 11, fontWeight: '800' }, detailValue: { color: '#0F172A', fontWeight: '700', marginTop: 3 }, note: { backgroundColor: '#F8FAFC', borderRadius: 10, padding: 11, marginTop: 12 }, noteText: { color: '#334155', marginTop: 4 }, actions: { flexDirection: 'row', gap: 10, marginTop: 14 }, edit: { flex: 1, borderWidth: 1.5, borderColor: '#0D8F7A', borderRadius: 9, alignItems: 'center', padding: 9 }, delete: { flex: 1, borderWidth: 1.5, borderColor: '#EF4444', borderRadius: 9, alignItems: 'center', padding: 9 }, editText: { color: '#0D8F7A', fontWeight: '800' }, deleteText: { color: '#EF4444', fontWeight: '800' }, empty: { color: '#64748B', textAlign: 'center', marginTop: 30 } });
