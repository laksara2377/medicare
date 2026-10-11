import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import BottomSheetConfirmation from '../../components/BottomSheetConfirmation';
import Button from '../../components/Button';
import Header from '../../components/Header';
import { getFirebaseServices } from '../../firebase/firebaseConfig';
import dbService, { getActivePatientId } from '../../services/db';

export default function ManageLinkedCaregiversScreen({ navigation, route, currentUser }) {
  const invitedCareLink = route?.params?.invitedCareLink;
  const [caregivers, setCaregivers] = useState(() => invitedCareLink ? [invitedCareLink] : []);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [removeError, setRemoveError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [isRemoving, setIsRemoving] = useState(false);
  const patientId = getActivePatientId(currentUser);
  const currentUserId = getFirebaseServices().auth.currentUser?.uid || currentUser?.id || currentUser?.uid;

  useEffect(() => {
    setLoadError('');
    return dbService.subscribeToCareLinks(patientId, 'patient', (records) => {
      const linked = records.filter((record) => ['active', 'accepted', 'pending'].includes(String(record.status).toLowerCase())
        && ['caregiver', 'nurse'].includes(String(record.role).toLowerCase()));
      setCaregivers(linked.map((record) => {
        const profile = dbService.getUserById(record.memberId) || {};
        return {
          ...profile,
          id: record.memberId,
          name: profile.name || record.memberName || 'Care team member',
          email: profile.email || record.email || '',
          role: record.role,
          status: record.status,
          consentId: record.id,
        };
      }));
    }, (error) => {
      console.error('Unable to load care-circle members:', error);
      setLoadError(error?.message || 'Unable to refresh the care-circle list.');
    });
  }, [patientId]);

  const handleConfirmRemove = async () => {
    if (!deleteTarget || isRemoving) return;

    setIsRemoving(true);
    setRemoveError('');
    try {
      await dbService.removeCareLink(deleteTarget.consentId);
      setCaregivers((current) => current.filter((member) => member.id !== deleteTarget.id));
      setDeleteTarget(null);
      if (deleteTarget.id === currentUserId) {
        navigation?.replace('CaregiverProfiles');
      }
    } catch (error) {
      console.error('Unable to remove care-circle member:', error);
      setRemoveError(error?.message || 'Unable to remove this care-circle member. Please try again.');
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Care Circle"
        subtitle="Manage linked caregivers & visiting nurse"
        onBack={() => navigation?.replace('CaregiverProfiles')}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionHeader}>LINKED CAREGIVERS & NURSES</Text>

        {removeError ? <Text style={styles.errorText}>{removeError}</Text> : null}
        {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}

        <View style={styles.cardGroup}>
          {caregivers.map((item) => (
            <View key={item.id} style={styles.rowItem}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
              </View>

              <View style={styles.infoCol}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.roleSub}>
                  {item.role === 'nurse' ? 'Visiting Nurse' : 'Family Caregiver'} · {item.email}
                </Text>
                {['Pending', 'pending'].includes(item.status) ? (
                  <Text style={styles.pendingText}>Invitation pending</Text>
                ) : null}
              </View>

              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => {
                  setRemoveError('');
                  setDeleteTarget(item);
                }}
              >
                <Text style={styles.removeBtnText}>
                  {item.id === currentUserId ? 'Leave' : 'Remove'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Link to Invite Nurse Screen */}
        <Button
          title="+ Invite Nurse (Care Plan)"
          colorScheme="blue"
          onPress={() => navigation?.navigate('InviteNurse', {
            patientId,
            returnScreen: 'ManageLinkedCaregivers',
          })}
          style={styles.inviteNurseBtn}
        />
      </ScrollView>

      {/* Remove Confirmation Modal Sheet */}
      <BottomSheetConfirmation
        visible={Boolean(deleteTarget)}
        title={deleteTarget?.id === currentUserId ? 'Leave care circle?' : 'Remove care-circle member?'}
        message={
          deleteTarget
            ? deleteTarget.id === currentUserId
              ? 'Are you sure you want to leave this patient’s care circle?'
              : `Are you sure you want to remove ${deleteTarget.name} from care circle?`
            : ''
        }
        confirmLabel={isRemoving ? 'Please wait...' : deleteTarget?.id === currentUserId ? 'Leave' : 'Remove'}
        cancelLabel="Cancel"
        onConfirm={handleConfirmRemove}
        onCancel={() => {
          if (!isRemoving) setDeleteTarget(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 12,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  cardGroup: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EAF5F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0D8F7A',
  },
  infoCol: {
    flex: 1,
    paddingRight: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  roleSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  pendingText: {
    color: '#D97706',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  removeBtn: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  removeBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
  inviteBtn: {
    marginBottom: 12,
  },
  inviteCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  inviteTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
  },
  formBtnRow: {
    gap: 8,
    marginTop: 4,
  },
  sendInviteBtn: {
    marginBottom: 0,
  },
  cancelInviteBtn: {
    marginBottom: 0,
  },
  inviteNurseBtn: {
    marginTop: 4,
  },
});
