import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import BottomSheetConfirmation from '../../components/BottomSheetConfirmation';
import Button from '../../components/Button';
import FiveTabBottomBar from '../../components/FiveTabBottomBar';
import Header from '../../components/Header';
import UndoSnackbar from '../../components/UndoSnackbar';
import { getFirebaseServices } from '../../firebase/firebaseConfig';
import dbService from '../../services/db';

export default function ManagePatientScheduleScreen({ navigation, onNavigateTab, hasAlertBadge = false, currentUser }) {
  const [medicines, setMedicines] = useState([]);
  const [activeLink, setActiveLink] = useState(null);
  const [editingMed, setEditingMed] = useState(null);
  const [newTime, setNewTime] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [removedDose, setRemovedDose] = useState(null);
  const [snackbarMsg, setSnackbarMsg] = useState('');

  const caregiverId = getFirebaseServices().auth.currentUser?.uid || currentUser?.id || 'usr-caregiver-1';
  const permissions = activeLink?.permissions || { viewSchedule: true, editSchedule: false };
  const canViewSchedule = permissions.viewSchedule !== false;
  const canEditSchedule = permissions.editSchedule === true;
  const patientId = activeLink?.patientId;

  useEffect(() => {
    return dbService.subscribeToCareLinks(caregiverId, 'caregiver', (links) => {
      setActiveLink(links.find((link) => ['Active', 'accepted'].includes(link.status)) || null);
    });
  }, [caregiverId]);

  useEffect(() => {
    if (!patientId) {
      setMedicines([]);
      return undefined;
    }
    return dbService.subscribeToMedicines(patientId, (records) => {
      const enriched = records.map((medicine) => {
        const times = dbService.getReminderTimes(medicine.id);
        return { ...medicine, timeStr: times[0] ? times[0].timeStr : '9:00 AM' };
      });
      setMedicines(enriched);
    });
  }, [patientId]);

  const handleOpenEdit = (med) => {
    if (!canEditSchedule) {
      setSnackbarMsg('You do not have permission to edit the schedule.');
      return;
    }
    setEditingMed(med);
    setNewTime(med.timeStr);
  };

  const handleSaveTimeChange = async () => {
    if (!canEditSchedule) return;
    if (!editingMed || !newTime.trim()) return;
    try {
      await dbService.updateMedicine(editingMed.id, {}, [newTime.trim()]);
      setMedicines((current) => current.map((medicine) => medicine.id === editingMed.id ? { ...medicine, timeStr: newTime.trim() } : medicine));
      setEditingMed(null);
      setSnackbarMsg('Dose time updated.');
    } catch (error) {
      console.error('[UI] Error updating caregiver dose time:', error);
      setSnackbarMsg(error?.message || 'Could not update dose time.');
    }
  };

  const handleConfirmRemove = () => {
    if (!canEditSchedule) return;
    if (!deleteTarget) return;
    setRemovedDose(dbService.deleteMedicine(deleteTarget.id));
    setSnackbarMsg(`Removed ${deleteTarget.name}`);
    setDeleteTarget(null);
    setMedicines((current) => current.filter((medicine) => medicine.id !== deleteTarget.id));
  };

  const handleUndoRemove = () => {
    if (!canEditSchedule) return;
    if (!removedDose?.medicine) return;
    dbService.restoreMedicine(removedDose.medicine, removedDose.times);
    setRemovedDose(null);
    setSnackbarMsg('');
    setMedicines((current) => current.concat(removedDose.medicine));
  };

  return (
    <View style={styles.container}>
      <Header
        title="Manage Schedule"
        subtitle="Remote dose configuration for Mrs. Perera"
        onBack={() => navigation?.goBack()}
        rightElement={
          <TouchableOpacity
            style={styles.bellBtn}
            onPress={() => navigation?.navigate('Notifications')}
          >
            <Text style={styles.bellIcon}>🔔</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {!canViewSchedule ? (
          <View style={styles.restrictedBox}>
            <Text style={styles.restrictedText}>🔒 Viewing medication schedule is disabled by patient permissions.</Text>
          </View>
        ) : (
          <>
            {!canEditSchedule ? (
              <View style={styles.infoBanner}>
                <Text style={styles.infoBannerText}>🔒 View-only mode: You do not have permission to edit the schedule.</Text>
              </View>
            ) : null}

            <Text style={styles.sectionHeader}>SCHEDULED DOSES</Text>

            {editingMed && (
              <View style={styles.editDrawer}>
                <Text style={styles.drawerTitle}>Change time for {editingMed.name}</Text>
                <TextInput
                  style={styles.timeInput}
                  value={newTime}
                  onChangeText={setNewTime}
                  placeholder="e.g. 2:30 PM"
                />
                <View style={styles.drawerButtons}>
                  <Button
                    title="Save time"
                    onPress={handleSaveTimeChange}
                    style={styles.drawerSaveBtn}
                  />
                  <Button
                    title="Cancel"
                    variant="outline"
                    onPress={() => setEditingMed(null)}
                    style={styles.drawerCancelBtn}
                  />
                </View>
              </View>
            )}

            {medicines.map((item) => (
              <View key={item.id} style={styles.scheduleRow}>
                <View style={styles.infoCol}>
                  <Text style={styles.medName}>{item.name}</Text>
                  <Text style={styles.medDetail}>
                    {item.dose} · {item.mealInstruction}
                  </Text>
                  <View style={styles.timeTag}>
                    <Text style={styles.timeTagText}>🕒 {item.timeStr}</Text>
                  </View>
                </View>

                {canEditSchedule ? (
                  <View style={styles.actionsCol}>
                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => handleOpenEdit(item)}
                    >
                      <Text style={styles.editBtnText}>Edit time</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => setDeleteTarget(item)}
                    >
                      <Text style={styles.deleteBtnText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.actionsCol}>
                    <View style={styles.readOnlyBadge}>
                      <Text style={styles.readOnlyText}>View only</Text>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </>
        )}

      </ScrollView>

      {/* Remove Dose Confirmation */}
      <BottomSheetConfirmation
        visible={Boolean(deleteTarget)}
        title="Remove dose?"
        message={
          deleteTarget
            ? `Are you sure you want to remove ${deleteTarget.name} from schedule?`
            : ''
        }
        confirmLabel="Remove dose"
        cancelLabel="Cancel"
        onConfirm={handleConfirmRemove}
        onCancel={() => setDeleteTarget(null)}
      />

      <UndoSnackbar
        message={snackbarMsg}
        onUndo={handleUndoRemove}
        onDismiss={() => { setSnackbarMsg(''); setRemovedDose(null); }}
      />

      <FiveTabBottomBar
        activeTab="schedule"
        onSelectTab={(tabKey) => onNavigateTab && onNavigateTab(tabKey)}
        hasAlertBadge={hasAlertBadge}
        profileLabel="Profiles"
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
  bellBtn: {
    padding: 6,
  },
  bellIcon: {
    fontSize: 22,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 12,
  },
  scheduleRow: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoCol: {
    flex: 1,
    paddingRight: 10,
  },
  medName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  medDetail: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  timeTag: {
    backgroundColor: '#E6F4F1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  timeTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D8F7A',
  },
  actionsCol: {
    alignItems: 'flex-end',
    gap: 8,
  },
  editBtn: {
    backgroundColor: '#0D8F7A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  editBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  deleteBtn: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  deleteBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
  editDrawer: {
    backgroundColor: '#EAF5F2',
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#0D8F7A',
  },
  drawerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0D8F7A',
    marginBottom: 8,
  },
  timeInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: '#0F172A',
    marginBottom: 12,
  },
  drawerButtons: {
    gap: 8,
  },
  drawerSaveBtn: {
    marginBottom: 0,
  },
  drawerCancelBtn: {
    marginBottom: 0,
  },
  restrictedBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginVertical: 20,
    alignItems: 'center',
  },
  restrictedText: {
    fontSize: 14,
    color: '#991B1B',
    fontWeight: '600',
    textAlign: 'center',
  },
  infoBanner: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
    marginBottom: 6,
  },
  infoBannerText: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '600',
    textAlign: 'center',
  },
  readOnlyBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  readOnlyText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
});
