import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import Button from '../../components/Button';
import ClinicianTopBar from '../../components/ClinicianTopBar';
import Text from '../../components/PatientText';
import { getFirebaseServices } from '../../firebase/firebaseConfig';
import authService from '../../services/authService';
import dbService from '../../services/db';

const DEFAULT_PATIENT = { name: 'Mrs. Perera', age: 72, bmi: '24.2', conditions: 'Diabetes, Hypertension', allergies: 'None recorded', bloodPressure: '120/80 mmHg' };

export default function HomeVisitSummaryScreen({ navigation, route, currentUser }) {
  const doctor = route?.params?.doctor || currentUser || { name: 'Dr. K. Silva', slmcNumber: '12345' };
  const doctorId = getFirebaseServices().auth.currentUser?.uid || doctor.id;
  const [patientId, setPatientId] = useState(route?.params?.patientId || doctor.patientId || null);
  const [pendingLink, setPendingLink] = useState(null);
  const [accessReady, setAccessReady] = useState(Boolean(route?.params?.patientId));
  const [patient, setPatient] = useState(DEFAULT_PATIENT);
  const [summary, setSummary] = useState({ adherence: 0, mostMissedMedicine: 'None', mostMissedTimeOfDay: '—' });
  const [medicines, setMedicines] = useState([]);
  const [notes, setNotes] = useState([]);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!doctorId) return undefined;
    return dbService.subscribeToCareLinks(doctorId, 'doctor', (links) => {
      const activeLink = links.find((item) => ['active', 'accepted'].includes(String(item.status).toLowerCase()));
      const link = activeLink || links[0];
      if (link?.patientId) setPatientId(link.patientId);
      setPendingLink(activeLink ? null : link || null);
      setAccessReady(Boolean(activeLink));
    });
  }, [doctorId]);

  useEffect(() => {
    if (!patientId || !accessReady) return undefined;
    let mounted = true;
    dbService.getUserProfileById(patientId).then((profile) => {
      if (mounted && profile) setPatient((current) => ({ ...current, ...profile }));
    }).catch(() => {});
    const stopLogs = dbService.subscribeToDoseLogs(patientId, (logs) => setSummary(dbService.getAdherenceSummary(patientId, logs)));
    const stopMeds = dbService.subscribeToMedicines(patientId, setMedicines, () => {});
    const stopNotes = dbService.subscribeToCareNotes(patientId, 'doctor', setNotes, () => {});
    return () => { mounted = false; stopLogs?.(); stopMeds?.(); stopNotes?.(); };
  }, [patientId, accessReady]);

  const acceptPatientAccess = async () => {
    if (!pendingLink?.id) return;
    try {
      await dbService.updateCareLink(pendingLink.id, { status: 'Active' });
      setMessage('Patient access accepted.');
    } catch (error) {
      setMessage(error?.message || 'Could not accept patient access.');
    }
  };

  const missedMedicines = useMemo(() => {
    const name = summary.mostMissedMedicine;
    if (name && !['none', '—'].includes(String(name).toLowerCase())) return [name];
    return medicines.slice(0, 2).map((item) => item.name);
  }, [summary.mostMissedMedicine, medicines]);

  const saveCounselling = async () => {
    if (!noteText.trim() || !patientId || saving) return;
    setSaving(true);
    try {
      await dbService.addCareNote({ patientId, authorId: doctorId, authorName: doctor.name || 'Doctor', authorRole: 'doctor', note: noteText.trim(), visibleToPatient: true });
      setNoteText('');
      setShowNoteModal(false);
      setMessage('Counselling note saved.');
    } catch (error) {
      setMessage(error?.message || 'Could not save the counselling note.');
    } finally { setSaving(false); }
  };

  const sharedParams = { doctor, patientId, patientName: patient.name || DEFAULT_PATIENT.name };

  return (
    <View style={styles.container}>
      <ClinicianTopBar title="Home visit summary" subtitle={`${patient.name || 'Linked patient'} · read-only overview`} onProfilePress={() => navigation?.navigate('DoctorProfile', sharedParams)} onLogoutPress={() => authService.logout(navigation)} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!patientId ? <Text style={styles.error}>No patient is linked to this doctor account.</Text> : null}
        {pendingLink ? <View style={styles.pendingAccess}><Text style={styles.pendingTitle}>Patient access invitation</Text><Text style={styles.muted}>Accept the invitation to load this patient’s clinical information.</Text><Button title="Accept patient access" onPress={acceptPatientAccess} style={styles.acceptButton} /></View> : null}
        {message ? <Text style={styles.message}>{message}</Text> : null}

        <View style={styles.adherenceCard}>
          <View style={styles.scoreCircle}><Text style={styles.score}>{summary.adherence || 0}%</Text><Text style={styles.scoreLabel}>Adherence</Text></View>
          <View style={styles.adherenceInfo}><Text style={styles.cardTitle}>Weekly adherence report</Text><Text style={styles.muted}>Most missed: {summary.mostMissedMedicine || '—'}</Text><Text style={styles.muted}>Time: {summary.mostMissedTimeOfDay || '—'}</Text></View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, summary.adherence || 0))}%` }]} /></View>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity style={[styles.tab, styles.activeTab]}><Text style={styles.activeTabText}>Home visit</Text></TouchableOpacity>
          <TouchableOpacity style={styles.tab} onPress={() => navigation?.navigate('PatientVisits', sharedParams)}><Text style={styles.tabText}>Patient visits</Text></TouchableOpacity>
          <TouchableOpacity style={styles.tab} onPress={() => navigation?.navigate('RefillStatus', sharedParams)}><Text style={styles.tabText}>Refill status</Text></TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>PATIENT SUMMARY</Text>
        <View style={styles.summaryCard}>
          <View style={styles.gridRow}><SummaryItem icon="person" label="Age" value={`${patient.age || '—'} years`} /><SummaryItem icon="scale" label="BMI" value={patient.bmi || '24.2'} detail="Within recommended range" /></View>
          <View style={styles.gridRow}><SummaryItem icon="clipboard" label="Conditions" value={patient.conditions || DEFAULT_PATIENT.conditions} /><SummaryItem icon="warning" label="Allergies" value={patient.allergies || 'None recorded'} /></View>
          <View style={styles.vitalRow}><View style={styles.iconBox}><Ionicons name="heart" size={20} color="#E83E63" /></View><View><Text style={styles.itemLabel}>Latest vitals</Text><Text style={styles.itemValue}>Blood pressure {patient.bloodPressure || '120/80 mmHg'}</Text></View></View>
        </View>

        <Text style={styles.sectionTitle}>PREVIOUS DOCTOR MEDICINES</Text>
        <View style={styles.listCard}>{(medicines.length ? medicines.slice(0, 3) : [{ id: 'demo-1', name: 'Metformin', notes: 'Continue current dose and monitor fasting glucose.' }, { id: 'demo-2', name: 'Aspirin', notes: 'Low-dose aspirin maintained for cardiovascular protection.' }]).map((medicine) => <View key={medicine.id} style={styles.listRow}><Text style={styles.listTitle}>{medicine.name}</Text><Text style={styles.muted}>{medicine.notes || `${medicine.dose || ''} ${medicine.mealInstruction || ''}`.trim()}</Text></View>)}</View>

        <Text style={styles.sectionTitle}>DOSES MISSED</Text>
        <View style={styles.listCard}>{(missedMedicines.length ? missedMedicines : ['No missed doses recorded']).map((name) => <View key={name} style={styles.missedRow}><Text style={styles.listTitle}>{name}</Text>{name !== 'No missed doses recorded' ? <Text style={styles.missedBadge}>Missed</Text> : null}</View>)}</View>

        <Text style={styles.sectionTitle}>NOTES FROM CARE TEAM</Text>
        <View style={styles.listCard}>{notes.length ? notes.slice(0, 3).map((note) => <View key={note.id} style={styles.listRow}><Text style={styles.noteMeta}>{note.authorName || note.authorRole || 'Care team'}</Text><Text style={styles.muted}>{note.text || note.note}</Text></View>) : <Text style={styles.muted}>No shared care notes yet.</Text>}</View>

        <View style={styles.actionRow}><Action icon="medical" label="Prescription" onPress={() => navigation?.navigate('PrescriptionsRefills', sharedParams)} /><Action icon="document-text" label="Doctor Note" outline onPress={() => navigation?.navigate('DoctorNotes', sharedParams)} /><Action icon="chatbubble" label="Counselling" onPress={() => setShowNoteModal(true)} /></View>
        <Button title="📊 Health Report" variant="outline" onPress={() => navigation?.navigate('HealthReport', sharedParams)} />
        <Button title="🧪 Lab Tests" variant="outline" onPress={() => navigation?.navigate('LabTests', sharedParams)} />
      </ScrollView>

      <Modal visible={showNoteModal} transparent animationType="slide" onRequestClose={() => setShowNoteModal(false)}><View style={styles.modalOverlay}><View style={styles.modalCard}><Text style={styles.modalTitle}>Counselling note</Text><TextInput style={styles.textArea} multiline value={noteText} onChangeText={setNoteText} placeholder="Clinical advice or counselling note" /><Button title={saving ? 'Saving...' : 'Save note'} disabled={saving} onPress={saveCounselling} /><Button title="Cancel" variant="outline" onPress={() => setShowNoteModal(false)} /></View></View></Modal>
    </View>
  );
}

function SummaryItem({ icon, label, value, detail }) { return <View style={styles.summaryItem}><View style={styles.iconBox}><Ionicons name={icon} size={20} color="#6D28D9" /></View><View style={styles.itemText}><Text style={styles.itemLabel}>{label}</Text><Text style={styles.itemValue}>{value}</Text>{detail ? <Text style={styles.muted}>{detail}</Text> : null}</View></View>; }
function Action({ icon, label, onPress, outline }) { return <TouchableOpacity style={[styles.action, outline && styles.actionOutline]} onPress={onPress}><Ionicons name={icon} size={22} color={outline ? '#0D8F7A' : '#FFFFFF'} /><Text style={[styles.actionText, outline && styles.actionTextOutline]}>{label}</Text></TouchableOpacity>; }

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' }, content: { padding: 18, paddingBottom: 42 }, error: { color: '#C0392B', fontWeight: '700', marginBottom: 10 }, message: { color: '#0D8F7A', fontWeight: '700', marginBottom: 10 },
  pendingAccess: { backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FDBA74', borderRadius: 14, padding: 14, marginBottom: 14 }, pendingTitle: { color: '#9A3412', fontWeight: '900', marginBottom: 4 }, acceptButton: { marginTop: 10, marginBottom: 0 },
  adherenceCard: { borderWidth: 1, borderColor: '#D9E3EC', borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }, scoreCircle: { width: 78, height: 78, borderRadius: 39, backgroundColor: '#EAF5F2', alignItems: 'center', justifyContent: 'center', marginRight: 16 }, score: { fontSize: 25, fontWeight: '900', color: '#0F172A' }, scoreLabel: { color: '#64748B', fontSize: 12 }, adherenceInfo: { flex: 1 }, cardTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A', marginBottom: 4 }, muted: { fontSize: 13, color: '#64748B', lineHeight: 18 }, progressTrack: { width: '100%', height: 8, backgroundColor: '#EEF2F7', borderRadius: 5, marginTop: 16, overflow: 'hidden' }, progressFill: { height: '100%', backgroundColor: '#0D8F7A' },
  tabs: { flexDirection: 'row', gap: 5, marginBottom: 22 }, tab: { flex: 1, backgroundColor: '#F1F5F9', borderRadius: 12, alignItems: 'center', paddingVertical: 10 }, activeTab: { backgroundColor: '#0D8F7A' }, tabText: { color: '#64748B', fontSize: 12, fontWeight: '700' }, activeTabText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' }, sectionTitle: { color: '#475569', fontSize: 12, fontWeight: '900', marginTop: 5, marginBottom: 9, letterSpacing: .4 },
  summaryCard: { borderWidth: 1, borderColor: '#D9E3EC', borderRadius: 20, padding: 14, marginBottom: 20 }, gridRow: { flexDirection: 'row', marginBottom: 14 }, summaryItem: { flex: 1, flexDirection: 'row', paddingRight: 8 }, iconBox: { width: 42, height: 42, borderRadius: 11, backgroundColor: '#F6F8FB', alignItems: 'center', justifyContent: 'center', marginRight: 9 }, itemText: { flex: 1 }, itemLabel: { color: '#64748B', fontSize: 12, fontWeight: '700' }, itemValue: { color: '#0F172A', fontSize: 14, fontWeight: '700', marginTop: 2 }, vitalRow: { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 14, flexDirection: 'row', alignItems: 'center' },
  listCard: { borderWidth: 1, borderColor: '#D9E3EC', borderRadius: 16, padding: 14, marginBottom: 20 }, listRow: { paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }, listTitle: { color: '#0F172A', fontSize: 14, fontWeight: '800', marginBottom: 3 }, noteMeta: { color: '#0D8F7A', fontSize: 12, fontWeight: '800', marginBottom: 3 }, missedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 }, missedBadge: { color: '#B91C1C', backgroundColor: '#FEE2E2', paddingHorizontal: 11, paddingVertical: 5, borderRadius: 10, fontWeight: '800', fontSize: 12 },
  actionRow: { flexDirection: 'row', gap: 9, marginBottom: 12 }, action: { flex: 1, minHeight: 86, backgroundColor: '#0D8F7A', borderRadius: 14, alignItems: 'center', justifyContent: 'center', padding: 8 }, actionOutline: { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#0D8F7A' }, actionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', marginTop: 7, textAlign: 'center' }, actionTextOutline: { color: '#0D8F7A' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,.5)', justifyContent: 'flex-end' }, modalCard: { backgroundColor: '#FFFFFF', padding: 22, borderTopLeftRadius: 24, borderTopRightRadius: 24 }, modalTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A', marginBottom: 14 }, textArea: { minHeight: 120, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 14, padding: 14, textAlignVertical: 'top', marginBottom: 14 },
});
