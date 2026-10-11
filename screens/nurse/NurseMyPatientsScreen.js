import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Button from '../../components/Button';
import ClinicianTopBar from '../../components/ClinicianTopBar';
import PatientCard from '../../components/PatientCard';
import { getFirebaseServices } from '../../firebase/firebaseConfig';
import authService from '../../services/authService';
import dbService from '../../services/db';

export default function NurseMyPatientsScreen({ navigation, route, currentUser }) {
  const nurse = currentUser || route?.params?.nurse || { name: 'Nurse' };
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const nurseId = getFirebaseServices().auth.currentUser?.uid || nurse?.id;
    if (!nurseId) {
      setLoading(false);
      setErrorMessage('Unable to identify the signed-in nurse.');
      return undefined;
    }

    let active = true;
    const unsubscribe = dbService.subscribeToCareLinks(nurseId, 'nurse', async (links) => {
      const pendingLinks = links.filter((link) => link.role === 'nurse'
        && ['Pending', 'pending'].includes(link.status));
      const assignedLinks = links.filter((link) => link.role === 'nurse'
        && ['Active', 'accepted'].includes(link.status));
      try {
        const pendingProfiles = await Promise.all(pendingLinks.map((link) => (
          dbService.getPublicProfileById(link.patientId).catch(() => null)
        )));
        setPendingCount(pendingProfiles.filter((profile) => profile?.role === 'patient').length);
        const records = await Promise.all(assignedLinks.map(async (link) => {
          let profile;
          try {
            profile = await dbService.getUserProfileById(link.patientId);
          } catch (error) {
            console.warn('Skipping invalid nurse care link:', link.id, error);
            return null;
          }
          if (!profile || profile.role !== 'patient') return null;
          return {
            id: link.patientId,
            name: profile?.name || link.patientName || link.addedBy || 'Linked patient',
            age: profile?.age ? `${profile.age} y` : 'Age not provided',
            conditions: profile?.conditions || 'Clinical history available',
            profileImageUrl: profile?.profileImageUrl || null,
            adherence: Number(profile?.adherence ?? 0),
            statusTag: Number(profile?.adherence ?? 0) < 70 ? 'Needs attention' : 'On track',
            reviewed: false,
            careLinkId: link.id,
            permissions: link.permissions || {},
          };
        }));
        if (active) {
          setPatients(records.filter(Boolean));
          setErrorMessage('');
          setLoading(false);
        }
      } catch (error) {
        console.error('Unable to load linked nurse patients:', error);
        if (active) {
          setErrorMessage(error?.message || 'Unable to load linked patients.');
          setLoading(false);
        }
      }
    }, (error) => {
      console.error('Nurse patient link subscription error:', error);
      if (active) {
        setErrorMessage(error?.message || 'Unable to load linked patients.');
        setLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [nurse?.id]);

  const handleToggleReviewed = (patientId) => {
    setPatients((current) => current.map((patient) => (
      patient.id === patientId ? { ...patient, reviewed: !patient.reviewed } : patient
    )));
  };

  const needingCount = patients.filter((patient) => patient.adherence < 70).length;

  return (
    <View style={styles.container}>
      <ClinicianTopBar
        title="My Patients"
        subtitle={`${nurse.name || 'Nurse'} · ${needingCount} needing attention`}
        colorScheme="blue"
        onProfilePress={() => navigation?.navigate('NurseProfile', { nurse })}
        onLogoutPress={() => authService.logout(navigation)}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionHeader}>ASSIGNED PATIENTS</Text>
        {pendingCount > 0 ? (
          <Button
            title={`Review patient invitations (${pendingCount})`}
            colorScheme="blue"
            onPress={() => navigation?.navigate('NursePendingRequests')}
            style={styles.requestsButton}
          />
        ) : null}
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        {loading ? <Text style={styles.emptyText}>Loading linked patients...</Text> : null}
        {!loading && !errorMessage && patients.length === 0 ? (
          <Text style={styles.emptyText}>No accepted patient invitations yet.</Text>
        ) : null}

        {patients.map((item) => (
          <PatientCard
            key={item.id}
            patient={item}
            onPress={() => navigation?.navigate('NursePatientDetail', { patient: item, nurse })}
            onMarkReviewed={() => handleToggleReviewed(item.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  errorText: { color: '#DC2626', fontSize: 14, marginBottom: 12 },
  emptyText: { color: '#64748B', fontSize: 14, textAlign: 'center', paddingVertical: 28 },
  requestsButton: { marginBottom: 16 },
});
