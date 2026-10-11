import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Button from '../../components/Button';
import Header from '../../components/Header';
import Text from '../../components/PatientText';
import { getFirebaseServices } from '../../firebase/firebaseConfig';
import dbService, { getActivePatientId } from '../../services/db';

const toDate = (value) => {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const result = new Date(value);
  return Number.isNaN(result.getTime()) ? null : result;
};

export default function CaregiverCareNotesScreen({ navigation, currentUser }) {
  const patientId = getActivePatientId(currentUser);
  const caregiverId = getFirebaseServices().auth.currentUser?.uid || currentUser?.id;
  const patient = useMemo(() => (
    dbService.getUserById(patientId) || { id: patientId, name: 'Patient' }
  ), [patientId]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!patientId) {
      setErrorMessage('No linked patient is available for this caregiver.');
      setLoading(false);
      return undefined;
    }
    return dbService.subscribeToCareNotes(
      patientId,
      'caregiver',
      (records) => {
        setNotes(records);
        setLoading(false);
        setErrorMessage('');
      },
      (error) => {
        setErrorMessage(error?.message || 'Could not load care notes.');
        setLoading(false);
      }
    );
  }, [patientId]);

  const openAdd = () => navigation?.navigate('AddCareNote', {
    patient,
    author: currentUser,
    authorRole: 'caregiver',
  });

  const openEdit = (note) => navigation?.navigate('EditCareNote', {
    patient,
    nurse: currentUser,
    existingNote: note,
    authorRole: 'caregiver',
  });

  const removeNote = async (note) => {
    try {
      setErrorMessage('');
      await dbService.deleteCareNote(note.id);
    } catch (error) {
      setErrorMessage(error?.message || 'Could not delete the care note.');
    }
  };

  const confirmDelete = (note) => {
    if (typeof window !== 'undefined' && window.confirm) {
      if (window.confirm('Delete this care note?')) removeNote(note);
      return;
    }
    Alert.alert('Delete care note', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeNote(note) },
    ]);
  };

  return (
    <View style={styles.container}>
      <Header
        title="Care notes"
        subtitle={`Patient: ${patient.name || 'Patient'}`}
        onBack={() => navigation?.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        <Button title="+ Add care note" onPress={openAdd} style={styles.addButton} />

        <Text style={styles.sectionTitle}>RECENT NOTES</Text>
        {loading ? <Text style={styles.empty}>Loading notes...</Text> : null}
        {!loading && notes.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No care notes yet</Text>
            <Text style={styles.empty}>Add an observation for the linked patient.</Text>
          </View>
        ) : null}

        {notes.map((note) => {
          const isAuthor = Boolean(caregiverId) && note.authorId === caregiverId;
          const createdAt = toDate(note.createdAt || note.timestamp);
          return (
            <View key={note.id} style={styles.noteCard}>
              <View style={styles.noteHeader}>
                <View style={styles.authorColumn}>
                  <Text style={styles.author}>{note.authorName || 'Care team member'}</Text>
                  <Text style={styles.role}>{note.authorRole || 'Care team'}</Text>
                </View>
                <Text style={styles.date}>
                  {createdAt ? createdAt.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Today'}
                </Text>
              </View>
              <Text style={styles.noteText}>{note.text || note.note}</Text>
              <Text style={styles.visibility}>
                {note.visibleToPatient ? 'Visible to patient and caregivers' : 'Care team only'}
                {note.editedAt ? ' · Edited' : ''}
              </Text>
              {isAuthor ? (
                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => openEdit(note)}>
                    <Text style={styles.editAction}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmDelete(note)}>
                    <Text style={styles.deleteAction}>Delete</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.readOnly}>Only the author can edit or delete this note.</Text>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  error: { color: '#C0392B', fontWeight: '700', marginBottom: 12 },
  addButton: { marginBottom: 22 },
  sectionTitle: { color: '#64748B', fontSize: 12, fontWeight: '800', marginBottom: 10, letterSpacing: 0.5 },
  emptyCard: { padding: 22, borderRadius: 16, backgroundColor: '#F8FAFC', alignItems: 'center' },
  emptyTitle: { color: '#0F172A', fontSize: 17, fontWeight: '700', marginBottom: 5 },
  empty: { color: '#64748B', textAlign: 'center' },
  noteCard: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12 },
  noteHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  authorColumn: { flex: 1, paddingRight: 12 },
  author: { color: '#0F172A', fontWeight: '800', fontSize: 15 },
  role: { color: '#0D8F7A', fontSize: 12, textTransform: 'capitalize', marginTop: 2 },
  date: { color: '#64748B', fontSize: 11, textAlign: 'right', maxWidth: 135 },
  noteText: { color: '#1E293B', lineHeight: 21 },
  visibility: { color: '#64748B', fontSize: 11, marginTop: 10 },
  actions: { flexDirection: 'row', gap: 22, marginTop: 14 },
  editAction: { color: '#0D8F7A', fontWeight: '800' },
  deleteAction: { color: '#C0392B', fontWeight: '800' },
  readOnly: { color: '#94A3B8', fontSize: 11, marginTop: 12 },
});
