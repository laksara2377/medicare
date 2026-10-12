import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import BottomSheetConfirmation from '../../components/BottomSheetConfirmation';
import Button from '../../components/Button';
import Header from '../../components/Header';
import ProfilePhotoActionModal from '../../components/ProfilePhotoActionModal';
import Text from '../../components/PatientText';
import { getFirebaseServices } from '../../firebase/firebaseConfig';
import authService from '../../services/authService';
import dbService from '../../services/db';

export default function PharmacistProfileScreen({ navigation, route, onLogout, currentUser }) {
  const initial = currentUser || route?.params?.pharmacist || { name: 'Pharmacist', role: 'pharmacist' };
  const pharmacistId = getFirebaseServices().auth.currentUser?.uid || initial.id;
  const [profile, setProfile] = useState(initial);
  const [links, setLinks] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(initial.name || '');
  const [age, setAge] = useState(String(initial.age || ''));
  const [email, setEmail] = useState(initial.email || '');
  const [phone, setPhone] = useState(initial.phone || '');
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showLogoutSheet, setShowLogoutSheet] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => dbService.subscribeToCareLinks(pharmacistId, 'pharmacist', (records) => setLinks(records.filter((item) => item.role === 'pharmacist')), (error) => setFormError(error?.message || 'Could not load patient requests.')), [pharmacistId]);

  const saveProfile = async () => {
    setFormError('');
    if (!name.trim()) return setFormError('Name is required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setFormError('Enter a valid email address.');
    if (!/^\+?[0-9]{10,15}$/.test(phone.replace(/\s/g, ''))) return setFormError('Enter a valid phone number.');
    if (age && (Number(age) < 18 || Number(age) > 100)) return setFormError('Age must be between 18 and 100.');
    try {
      const updates = { name: name.trim(), age: age.trim(), email: email.trim(), phone: phone.trim() };
      await dbService.updateUser(pharmacistId, updates);
      setProfile((value) => ({ ...value, ...updates }));
      Object.assign(initial, updates);
      setIsEditing(false);
      setSuccess('Profile updated successfully.');
    } catch (error) { setFormError(error?.message || 'Could not update profile.'); }
  };

  const savePhoto = async (profileImageUrl) => {
    try {
      await dbService.updateUser(pharmacistId, { profileImageUrl });
      setProfile((value) => ({ ...value, profileImageUrl }));
      initial.profileImageUrl = profileImageUrl;
      setSuccess(profileImageUrl ? 'Profile picture updated.' : 'Profile picture removed.');
    } catch (error) { setFormError(error?.message || 'Could not update profile picture.'); }
  };

  const acceptRequest = async (link) => {
    try {
      await dbService.updateCareLink(link.id, { status: 'Active' });
      navigation?.replace('PharmacistPatientMedicines', { pharmacist: profile, patientId: link.patientId });
    } catch (error) { setFormError(error?.message || 'Could not accept this patient request.'); }
  };

  const deleteRequest = async (link) => {
    try {
      await dbService.removeCareLink(link.id);
      setLinks((items) => items.filter((item) => item.id !== link.id));
      setSuccess('Patient request deleted.');
    } catch (error) { setFormError(error?.message || 'Could not delete this patient request.'); }
  };

  const logout = async () => {
    setShowLogoutSheet(false);
    if (onLogout) onLogout(); else await authService.logout(navigation);
  };

  const pending = links.filter((item) => String(item.status).toLowerCase() === 'pending');

  return <View style={styles.container}>
    <Header title="Pharmacist profile" subtitle="Manage pharmacy registration" onBack={() => navigation?.replace('PharmacistPatientMedicines', { pharmacist: profile })} />
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {formError ? <Text style={styles.error}>{formError}</Text> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}
      <View style={styles.profileHeader}>
        <TouchableOpacity style={styles.avatar} onPress={() => setShowPhotoModal(true)}>
          {profile.profileImageUrl ? <Image source={{ uri: profile.profileImageUrl }} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{(profile.name || 'P').charAt(0)}</Text>}
          <View style={styles.cameraBadge}><Text style={styles.cameraText}>✎</Text></View>
        </TouchableOpacity>
        <Text style={styles.profileName}>{profile.name || 'Pharmacist'}</Text>
        <Text style={styles.roleTag}>Pharmacist · verified</Text>
      </View>

      <Text style={styles.sectionTitle}>PATIENT REQUESTS</Text>
      <View style={styles.card}>
        {pending.length === 0 ? <Text style={styles.empty}>No pending patient requests.</Text> : pending.map((link) => <View key={link.id} style={styles.requestRow}>
          <View style={styles.requestInfo}><Text style={styles.requestName}>{link.patientName || link.addedBy || 'Patient request'}</Text><Text style={styles.requestEmail}>{link.email || 'Medicine and refill access'}</Text></View>
          <View style={styles.requestActions}><TouchableOpacity style={styles.acceptBtn} onPress={() => acceptRequest(link)}><Text style={styles.acceptText}>Accept</Text></TouchableOpacity><TouchableOpacity style={styles.deleteBtn} onPress={() => deleteRequest(link)}><Text style={styles.deleteText}>Delete</Text></TouchableOpacity></View>
        </View>)}
      </View>

      <View style={styles.card}>
        {isEditing ? <>
          <Text style={styles.label}>FULL NAME</Text><TextInput style={styles.input} value={name} onChangeText={setName} />
          <Text style={styles.label}>AGE</Text><TextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="numeric" />
          <Text style={styles.label}>EMAIL</Text><TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <Text style={styles.label}>PHONE NUMBER</Text><TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <View style={styles.buttonRow}><Button title="Save" onPress={saveProfile} style={styles.flexBtn} /><Button title="Cancel" variant="outline" onPress={() => setIsEditing(false)} style={styles.flexBtn} /></View>
        </> : <>
          <Text style={styles.label}>FULL NAME</Text><Text style={styles.value}>{profile.name || '—'}</Text>
          <Text style={styles.label}>AGE</Text><Text style={styles.value}>{profile.age || '—'}</Text>
          <Text style={styles.label}>EMAIL</Text><Text style={styles.value}>{profile.email || '—'}</Text>
          <Text style={styles.label}>PHONE NUMBER</Text><Text style={styles.value}>{profile.phone || '—'}</Text>
          <Text style={styles.label}>PHARMACY REGISTRATION NO.</Text><Text style={styles.value}>{profile.pharmacyRegNo || profile.registrationNumber || '—'} 🔒</Text>
          <Button title="Edit details" variant="outline" onPress={() => setIsEditing(true)} style={styles.editBtn} />
        </>}
      </View>
      <Button title="Log out" variant="danger-outline" onPress={() => setShowLogoutSheet(true)} />
    </ScrollView>
    <ProfilePhotoActionModal visible={showPhotoModal} onClose={() => setShowPhotoModal(false)} onSelectImage={savePhoto} onDeleteImage={() => setShowDeleteConfirm(true)} hasImage={Boolean(profile.profileImageUrl)} title="Pharmacist profile picture" />
    <BottomSheetConfirmation visible={showDeleteConfirm} title="Remove profile photo?" message="Are you sure you want to remove your profile photo?" confirmLabel="Remove" cancelLabel="Cancel" onConfirm={() => { setShowDeleteConfirm(false); savePhoto(null); }} onCancel={() => setShowDeleteConfirm(false)} />
    <BottomSheetConfirmation visible={showLogoutSheet} title="Log out of Pharmacist Portal?" message="You will need to sign in again." confirmLabel="Log out" cancelLabel="Cancel" onConfirm={logout} onCancel={() => setShowLogoutSheet(false)} />
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' }, scrollContent: { padding: 20, paddingBottom: 40 }, error: { color: '#B91C1C', backgroundColor: '#FEE2E2', padding: 10, borderRadius: 8, marginBottom: 10 }, success: { color: '#0D8F7A', backgroundColor: '#E6F4F1', padding: 10, borderRadius: 8, marginBottom: 10, textAlign: 'center', fontWeight: '700' }, profileHeader: { alignItems: 'center', marginBottom: 20 }, avatar: { width: 78, height: 78, borderRadius: 39, backgroundColor: '#EAF5F2', alignItems: 'center', justifyContent: 'center' }, avatarImage: { width: 78, height: 78, borderRadius: 39 }, avatarText: { color: '#0D8F7A', fontSize: 30, fontWeight: '800' }, cameraBadge: { position: 'absolute', right: -2, bottom: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: '#0D8F7A', alignItems: 'center', justifyContent: 'center' }, cameraText: { color: '#FFFFFF', fontWeight: '800' }, profileName: { marginTop: 10, fontSize: 20, fontWeight: '800', color: '#0F172A' }, roleTag: { color: '#0D8F7A', fontWeight: '700', marginTop: 4 }, photoHint: { color: '#64748B', fontSize: 12, marginTop: 5 }, sectionTitle: { color: '#64748B', fontSize: 12, fontWeight: '800', marginBottom: 8 }, card: { padding: 15, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', borderRadius: 15, marginBottom: 16 }, empty: { color: '#64748B', textAlign: 'center' }, requestRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }, requestInfo: { marginBottom: 9 }, requestName: { color: '#0F172A', fontWeight: '700', fontSize: 15 }, requestEmail: { color: '#64748B', fontSize: 12, marginTop: 2 }, requestActions: { flexDirection: 'row', gap: 8 }, acceptBtn: { flex: 1, backgroundColor: '#0D8F7A', padding: 9, alignItems: 'center', borderRadius: 8 }, acceptText: { color: '#FFFFFF', fontWeight: '700' }, deleteBtn: { flex: 1, borderWidth: 1, borderColor: '#EF4444', padding: 9, alignItems: 'center', borderRadius: 8 }, deleteText: { color: '#EF4444', fontWeight: '700' }, label: { color: '#94A3B8', fontWeight: '800', fontSize: 11, marginTop: 9, marginBottom: 5 }, value: { color: '#0F172A', fontSize: 15, marginBottom: 5 }, input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, backgroundColor: '#FFFFFF', padding: 10, marginBottom: 5 }, buttonRow: { flexDirection: 'row', gap: 8, marginTop: 14 }, flexBtn: { flex: 1, marginBottom: 0 }, editBtn: { marginTop: 15, marginBottom: 0 },
  photoActionLink: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#EAF5F2', marginTop: 7 },
  photoActionText: { color: '#0D8F7A', fontSize: 12, fontWeight: '700' },
  removePhotoAction: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#FEF2F2', marginTop: 5 },
  removePhotoText: { color: '#DC2626', fontSize: 12, fontWeight: '700' },
});
