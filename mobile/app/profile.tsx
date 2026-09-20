import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { colors } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import type { Material, MaterialRequest } from '../types';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, token, logout, refreshProfile } = useAuth();
  const [tab, setTab] = useState<'published' | 'requests' | 'saved'>('published');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [saved, setSaved] = useState<Material[]>([]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [city, setCity] = useState(user?.city ?? '');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token || !user) return;
    setLoading(true);
    try {
      const [allMaterials, ownRequests, favorites] = await Promise.all([api.listMaterials(), api.listRequests(token), api.getFavorites(token)]);
      setMaterials((allMaterials as Material[]).filter((material) => material.userId === user.id));
      setRequests(ownRequests as MaterialRequest[]);
      const favoriteIds = (favorites as Array<{ materialId: string }>).map((favorite) => favorite.materialId);
      setSaved((allMaterials as Material[]).filter((material) => favoriteIds.includes(material.id)));
    } finally { setLoading(false); }
  }, [token, user]);
  useEffect(() => { load(); }, [load]);

  const saveProfile = async () => {
    if (!token) return;
    try { await api.updateProfile({ name: name.trim(), city: city.trim() }, token); await refreshProfile(); setEditing(false); Alert.alert('Perfil actualizado'); }
    catch (error) { Alert.alert('No se pudo actualizar', error instanceof Error ? error.message : 'Intenta nuevamente.'); }
  };

  if (!user) return <View style={styles.state}><Text style={styles.title}>Inicia sesión para ver tu perfil.</Text><TouchableOpacity style={styles.button} onPress={() => router.push('/login')}><Text style={styles.buttonText}>Iniciar sesión</Text></TouchableOpacity></View>;
  return <ScrollView style={styles.container} contentContainerStyle={styles.content}>
    <View style={styles.header}><View style={styles.avatar}><Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text></View>{editing ? <><TextInput value={name} onChangeText={setName} style={styles.input} /><TextInput value={city} onChangeText={setCity} style={styles.input} /></> : <><Text style={styles.name}>{user.name}</Text><Text style={styles.meta}>{user.city}</Text><Text style={styles.meta}>{user.email}</Text></>}</View>
    <View style={styles.actions}>{editing ? <TouchableOpacity style={styles.button} onPress={saveProfile}><Text style={styles.buttonText}>Guardar cambios</Text></TouchableOpacity> : <TouchableOpacity style={styles.secondaryButton} onPress={() => setEditing(true)}><Text style={styles.secondaryText}>Editar perfil</Text></TouchableOpacity>}<TouchableOpacity style={styles.logout} onPress={async () => { await logout(); router.replace('/'); }}><Text style={styles.logoutText}>Cerrar sesión</Text></TouchableOpacity></View>
    <View style={styles.tabs}><Tab label={`Publicados (${materials.length})`} active={tab === 'published'} onPress={() => setTab('published')} /><Tab label={`Solicitudes (${requests.length})`} active={tab === 'requests'} onPress={() => setTab('requests')} /><Tab label={`Guardados (${saved.length})`} active={tab === 'saved'} onPress={() => setTab('saved')} /></View>
    {loading ? <View style={styles.state}><ActivityIndicator color={colors.primary} /></View> : tab === 'published' ? materials.map((material) => <Link key={material.id} href={{ pathname: '/material/[id]', params: { id: material.id } }} asChild><TouchableOpacity style={styles.card}><Text style={styles.cardTitle}>{material.name}</Text><Text style={styles.meta}>{material.category} · {material.quantity} {material.unit}</Text></TouchableOpacity></Link>) : tab === 'requests' ? requests.map((request) => <View key={request.id} style={styles.card}><Text style={styles.cardTitle}>{request.material}</Text><Text style={styles.meta}>{request.category} · {request.quantity} {request.unit}</Text></View>) : saved.map((material) => <Link key={material.id} href={{ pathname: '/material/[id]', params: { id: material.id } }} asChild><TouchableOpacity style={styles.card}><Text style={styles.cardTitle}>{material.name}</Text><Text style={styles.meta}>{material.location}</Text></TouchableOpacity></Link>)}
  </ScrollView>;
}

function Tab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <TouchableOpacity onPress={onPress} style={[styles.tab, active && styles.tabActive]}><Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text></TouchableOpacity>; }
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: colors.background }, content: { padding: 20, paddingBottom: 40 }, header: { backgroundColor: colors.surface, borderRadius: 18, padding: 20, alignItems: 'center' }, avatar: { width: 70, height: 70, borderRadius: 35, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: colors.primaryDark, fontSize: 28, fontWeight: '800' }, name: { color: colors.text, fontSize: 22, fontWeight: '800', marginTop: 12 }, meta: { color: colors.muted, marginTop: 5 }, input: { width: '100%', backgroundColor: colors.background, borderRadius: 10, padding: 12, marginTop: 10, color: colors.text }, actions: { flexDirection: 'row', gap: 10, marginTop: 14 }, button: { flex: 1, backgroundColor: colors.primary, borderRadius: 12, padding: 13, alignItems: 'center' }, buttonText: { color: '#FFF', fontWeight: '700' }, secondaryButton: { flex: 1, backgroundColor: colors.accent, borderRadius: 12, padding: 13, alignItems: 'center' }, secondaryText: { color: colors.text, fontWeight: '700' }, logout: { padding: 13 }, logoutText: { color: colors.danger, fontWeight: '700' }, tabs: { flexDirection: 'row', marginTop: 20, borderBottomWidth: 1, borderBottomColor: colors.border }, tab: { flex: 1, paddingVertical: 12, alignItems: 'center' }, tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary }, tabText: { color: colors.muted, fontSize: 12 }, tabTextActive: { color: colors.primary, fontWeight: '700' }, card: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginTop: 12 }, cardTitle: { color: colors.text, fontWeight: '800', fontSize: 16 }, state: { alignItems: 'center', padding: 40 }, title: { color: colors.text, fontSize: 20, fontWeight: '700', textAlign: 'center' } });
