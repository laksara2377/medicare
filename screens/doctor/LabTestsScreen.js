import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Button from '../../components/Button';
import Header from '../../components/Header';
import Text from '../../components/PatientText';
import { getFirebaseServices } from '../../firebase/firebaseConfig';
import dbService, { getActivePatientId } from '../../services/db';

export default function LabTestsScreen({ navigation, route, currentUser }) {
  const doctor = route?.params?.doctor || currentUser || {};
  const doctorId = getFirebaseServices().auth.currentUser?.uid || doctor.id;
  const patientId = route?.params?.patientId || getActivePatientId(doctor);
  const [tests, setTests] = useState([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!patientId) return undefined;
    return dbService.subscribeToLabTests(patientId, setTests, (e) => setError(e.message));
  }, [patientId]);

  const add = async () => {
    if (!name.trim()) return;
    try {
      setError('');
      await dbService.addLabTest({ patientId, name: name.trim(), orderedBy: doctorId, orderedByName: doctor.name || 'Doctor' });
      setName(''); setOpen(false);
    } catch (e) { setError(e.message || 'Could not order the lab test.'); }
  };

  return <View style={styles.container}><Header title="Lab Tests" subtitle="Manage patient lab tests" onBack={() => navigation?.navigate('HomeVisitSummary', { ...route?.params, doctor })} /><ScrollView contentContainerStyle={styles.content}>
    {error ? <Text style={styles.error}>{error}</Text> : null}
    <View style={styles.stats}><Stat value={tests.length} label="Total Tests" /><Stat value={tests.filter((x) => x.status === 'Pending').length} label="Pending" /><Stat value={tests.filter((x) => x.status === 'Completed').length} label="Completed" /></View>
    <Button title="+ Order New Lab Test" onPress={() => setOpen(true)} />
    <Text style={styles.section}>LAB TESTS</Text>{tests.length ? tests.map((test) => <View key={test.id} style={styles.card}><View><Text style={styles.testName}>{test.name}</Text><Text style={styles.muted}>Ordered by {test.orderedByName || 'Doctor'}</Text></View><Text style={styles.pending}>{test.status}</Text></View>) : <View style={styles.empty}><Text style={styles.flask}>🧪</Text><Text style={styles.emptyTitle}>No lab tests ordered</Text><Text style={styles.muted}>Order your first lab test to get started</Text></View>}
  </ScrollView><Modal visible={open} transparent animationType="slide"><View style={styles.overlay}><View style={styles.modal}><Text style={styles.modalTitle}>Order Lab Test</Text><TextInput value={name} onChangeText={setName} style={styles.input} placeholder="Test name, e.g. HbA1c" /><Button title="Order Test" onPress={add} /><Button title="Cancel" variant="outline" onPress={() => setOpen(false)} /></View></View></Modal></View>;
}
function Stat({ value, label }) { return <View style={styles.stat}><Text style={styles.value}>{value}</Text><Text style={styles.muted}>{label}</Text></View>; }
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: '#FFF' }, content: { padding: 20 }, error: { color: '#C0392B', fontWeight: '700', marginBottom: 12 }, stats: { flexDirection: 'row', gap: 10, marginBottom: 20 }, stat: { flex: 1, borderWidth: 1, borderColor: '#D9E3EC', borderRadius: 16, paddingVertical: 24, alignItems: 'center' }, value: { color: '#7C3AED', fontSize: 25, fontWeight: '900', marginBottom: 6 }, muted: { color: '#64748B', fontSize: 12, textAlign: 'center' }, section: { color: '#94A3B8', fontSize: 11, fontWeight: '900', marginTop: 17, marginBottom: 10 }, empty: { borderWidth: 1, borderColor: '#D9E3EC', borderRadius: 16, paddingVertical: 64, alignItems: 'center' }, flask: { fontSize: 44 }, emptyTitle: { fontSize: 16, fontWeight: '900', color: '#0F172A', marginVertical: 9 }, card: { flexDirection: 'row', justifyContent: 'space-between', borderWidth: 1, borderColor: '#D9E3EC', borderRadius: 14, padding: 15, marginBottom: 10 }, testName: { color: '#0F172A', fontWeight: '800', fontSize: 15 }, pending: { color: '#B45309', backgroundColor: '#FEF3C7', padding: 6, borderRadius: 8, fontWeight: '800', fontSize: 11 }, overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,.5)' }, modal: { backgroundColor: '#FFF', padding: 22, borderTopLeftRadius: 24, borderTopRightRadius: 24 }, modalTitle: { fontSize: 20, fontWeight: '900', marginBottom: 14 }, input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 13, marginBottom: 14 } });
