import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import ClinicianTopBar from '../../components/ClinicianTopBar';
import Text from '../../components/PatientText';
import authService from '../../services/authService';

const visits = [
  { id: 'visit-1', type: 'Follow-up', title: 'Routine Follow-up', date: '18 Sep 2026', notes: 'Patient reported occasional dizziness. Adjusted BP medication time to morning.', bloodPressure: '120/80 mmHg', heartRate: '72 bpm', temperature: '36.8°C', weight: '68 kg', medicines: [{ name: 'Metformin', dose: '500mg', frequency: 'Twice daily' }, { name: 'BP Tablet', dose: '5mg', frequency: 'Once daily' }] },
  { id: 'visit-2', type: 'Initial', title: 'Initial Assessment', date: '01 Aug 2026', notes: 'Diagnosed hypertension & T2 diabetes. Commenced Metformin 500mg and BP tablet regimen.', bloodPressure: '138/88 mmHg', heartRate: '76 bpm', temperature: '36.7°C', weight: '69 kg', medicines: [{ name: 'Metformin', dose: '500mg', frequency: 'Twice daily' }] },
];

export default function PatientVisitsScreen({ navigation, route, currentUser }) {
  const doctor = route?.params?.doctor || currentUser;
  const params = { doctor, patientId: route?.params?.patientId, patientName: route?.params?.patientName || 'Mrs. Perera' };
  return <View style={styles.container}>
    <ClinicianTopBar title="Patient Visits" subtitle={`${params.patientName} · Visit history`} onBackPress={() => navigation?.navigate('HomeVisitSummary', params)} onProfilePress={() => navigation?.navigate('DoctorProfile', params)} onLogoutPress={() => authService.logout(navigation)} />
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.section}>PAST VISITS & CONSULTATIONS</Text>
      {visits.map((visit) => <View key={visit.id} style={styles.card}>
        <View style={styles.top}><Text style={styles.badge}>🔍 {visit.type}</Text><Text style={styles.date}>{visit.date}</Text></View>
        <Text style={styles.title}>{visit.title}</Text><Text style={styles.doctor}>{doctor?.name || 'Dr. K. Silva'} <Text style={styles.slmc}>SLMC #{doctor?.slmcNumber || '12345'}</Text></Text>
        <View style={styles.note}><Text style={styles.noteLabel}>Notes</Text><Text style={styles.noteText}>{visit.notes}</Text></View>
        <TouchableOpacity style={styles.button} onPress={() => navigation?.navigate('DoctorVisitDetails', { ...params, visit })}><Text style={styles.buttonText}>View Details</Text></TouchableOpacity>
      </View>)}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: '#FFFFFF' }, content: { padding: 20, paddingBottom: 40 }, section: { fontSize: 12, fontWeight: '900', color: '#64748B', marginBottom: 13 }, card: { borderWidth: 1, borderColor: '#D9E3EC', borderRadius: 18, padding: 17, marginBottom: 15 }, top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, badge: { color: '#0D8F7A', backgroundColor: '#EAF5F2', borderRadius: 10, padding: 7, fontWeight: '800', fontSize: 12 }, date: { color: '#64748B', fontSize: 12, fontWeight: '700' }, title: { fontSize: 17, fontWeight: '900', color: '#0F172A', marginTop: 12 }, doctor: { color: '#0D8F7A', fontSize: 13, fontWeight: '800', marginTop: 7 }, slmc: { color: '#64748B', fontWeight: '600' }, note: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 13, marginTop: 12 }, noteLabel: { color: '#94A3B8', fontSize: 11, fontWeight: '800', marginBottom: 5 }, noteText: { color: '#334155', fontSize: 14, lineHeight: 19 }, button: { borderWidth: 1.5, borderColor: '#0D8F7A', borderRadius: 11, paddingVertical: 11, alignItems: 'center', marginTop: 13 }, buttonText: { color: '#0D8F7A', fontWeight: '800' } });
