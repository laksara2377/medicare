import React, { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import Button from '../../../components/Button';
import Header from '../../../components/Header';
import Text from '../../../components/PatientText';
import { getFirebaseServices } from '../../../firebase/firebaseConfig';
import dbService, { getActivePatientId } from '../../../services/db';

export default function DoctorNotesScreen({ navigation, route, currentUser }) {
  const doctor = route?.params?.doctor || currentUser || {};
  const doctorId = getFirebaseServices().auth.currentUser?.uid || doctor.id;
  const patientId = route?.params?.patientId || getActivePatientId(doctor);
  const [notes, setNotes] = useState([]);
  const [editing, setEditing] = useState(null);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!patientId) return undefined;
    return dbService.subscribeToCareNotes(patientId, 'doctor', (records) => setNotes(records.filter((item) => String(item.authorRole).toLowerCase() === 'doctor')), (e) => setError(e.message));
  }, [patientId]);

  const openEditor = (note = null) => { setEditing(note || { isNew: true }); setText(note?.text || note?.note || ''); setError(''); };
  const save = async () => {
    if (!text.trim() || !patientId || saving) return;
    setSaving(true); setError('');
    try {
      if (editing?.id) await dbService.updateCareNote(editing.id, { text: text.trim(), note: text.trim(), visibleToPatient: true });
      else await dbService.addCareNote({ patientId, authorId: doctorId, authorName: doctor.name || 'Doctor', authorRole: 'doctor', note: text.trim(), visibleToPatient: true });
      setEditing(null); setText('');
    } catch (e) { setError(e.message || 'Could not save doctor note.'); }
    finally { setSaving(false); }
  };
  const remove = async (note) => {
    const execute = async () => { try { await dbService.deleteCareNote(note.id); } catch (e) { setError(e.message || 'Could not delete note.'); } };
    if (typeof window !== 'undefined' && window.confirm) { if (window.confirm('Delete this doctor note?')) execute(); }
    else Alert.alert('Delete note', 'Delete this doctor note?', [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: execute }]);
  };

  return <View style={styles.container}><Header title="Doctor Notes" subtitle="Manage clinical notes" onBack={() => navigation?.navigate('HomeVisitSummary', { doctor, patientId })} />
    <ScrollView contentContainerStyle={styles.content}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.stats}><Stat value={notes.length} label="Total Notes" /><Stat value={notes.filter((n) => n.visibleToPatient).length} label="Shared" /></View>
      <Button title="+ Add New Note" onPress={() => openEditor()} />
      <Text style={styles.section}>PREVIOUS DOCTOR NOTES</Text>
      {notes.map((note) => <View key={note.id} style={styles.card}><View style={styles.top}><Text style={styles.doctor}>{note.authorName || doctor.name || 'Doctor'}</Text><Text style={styles.shared}>👁 Shared</Text></View><Text style={styles.date}>{formatDate(note.createdAt)}</Text><View style={styles.noteBox}><Text style={styles.small}>Clinical Note</Text><Text style={styles.note}>{note.text || note.note}</Text></View><Text style={styles.slmc}>SLMC #{doctor.slmcNumber || '—'}</Text><View style={styles.actions}><TouchableOpacity style={styles.edit} onPress={() => openEditor(note)}><Text style={styles.editText}>Edit</Text></TouchableOpacity><TouchableOpacity style={styles.delete} onPress={() => remove(note)}><Text style={styles.deleteText}>Delete</Text></TouchableOpacity></View></View>)}
      {!notes.length ? <Text style={styles.empty}>No doctor notes yet.</Text> : null}
    </ScrollView>
    <Modal visible={Boolean(editing)} transparent animationType="slide" onRequestClose={() => setEditing(null)}><View style={styles.overlay}><View style={styles.modal}><Text style={styles.modalTitle}>{editing?.id ? 'Edit Doctor Note' : 'Add Doctor Note'}</Text><TextInput style={styles.textArea} multiline value={text} onChangeText={setText} placeholder="Clinical observations or recommendations" /><Button title={saving ? 'Saving...' : 'Save Note'} disabled={saving} onPress={save} /><Button title="Cancel" variant="outline" onPress={() => setEditing(null)} /></View></View></Modal>
  </View>;
}
function Stat({ value, label }) { return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>; }
function formatDate(value) { const date = value?.toDate?.() || (value ? new Date(value) : new Date()); return Number.isNaN(date.getTime()) ? 'Today' : date.toLocaleString(); }
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: '#FFF' }, content: { padding: 20, paddingBottom: 40 }, error: { color: '#C0392B', fontWeight: '700', marginBottom: 12 }, stats: { flexDirection: 'row', gap: 14, marginBottom: 20 }, stat: { flex: 1, borderWidth: 1, borderColor: '#D9E3EC', borderRadius: 16, alignItems: 'center', padding: 22 }, statValue: { color: '#0D8F7A', fontSize: 27, fontWeight: '900' }, statLabel: { color: '#64748B', marginTop: 5, fontWeight: '700' }, section: { color: '#94A3B8', fontSize: 11, fontWeight: '900', marginTop: 17, marginBottom: 10 }, card: { borderWidth: 1, borderColor: '#D9E3EC', borderRadius: 17, padding: 16, marginBottom: 13 }, top: { flexDirection: 'row', justifyContent: 'space-between' }, doctor: { color: '#0D8F7A', fontWeight: '900' }, shared: { backgroundColor: '#EAF5F2', color: '#0D8F7A', padding: 5, borderRadius: 9, fontSize: 11, fontWeight: '700' }, date: { color: '#64748B', fontSize: 12, marginTop: 3 }, noteBox: { backgroundColor: '#F8FAFC', borderRadius: 11, padding: 12, marginVertical: 12 }, small: { color: '#94A3B8', fontSize: 11, fontWeight: '800' }, note: { color: '#0F172A', marginTop: 5 }, slmc: { color: '#64748B', fontSize: 12 }, actions: { flexDirection: 'row', gap: 10, marginTop: 13 }, edit: { flex: 1, borderWidth: 1.5, borderColor: '#0D8F7A', borderRadius: 9, padding: 9, alignItems: 'center' }, delete: { flex: 1, borderWidth: 1.5, borderColor: '#EF4444', borderRadius: 9, padding: 9, alignItems: 'center' }, editText: { color: '#0D8F7A', fontWeight: '800' }, deleteText: { color: '#EF4444', fontWeight: '800' }, empty: { color: '#64748B', textAlign: 'center', marginTop: 30 }, overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,.5)', justifyContent: 'flex-end' }, modal: { backgroundColor: '#FFF', padding: 22, borderTopLeftRadius: 24, borderTopRightRadius: 24 }, modalTitle: { color: '#0F172A', fontSize: 21, fontWeight: '900', marginBottom: 14 }, textArea: { minHeight: 130, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 13, padding: 13, textAlignVertical: 'top', marginBottom: 14 } });
