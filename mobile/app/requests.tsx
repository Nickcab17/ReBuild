import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import type { MaterialRequest } from '../types';

export default function RequestsScreen() {
  const { token } = useAuth();
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async (refresh = false) => {
    if (!token) return;
    if (refresh) setRefreshing(true); else setLoading(true);
    try { setRequests(await api.listRequests(token) as MaterialRequest[]); } finally { setLoading(false); setRefreshing(false); }
  }, [token]);
  useEffect(() => { load(); }, [load]);
  if (!token) return <View style={styles.state}><Text style={styles.title}>Inicia sesión para ver tus solicitudes.</Text></View>;
  return <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}>
    <Text style={styles.title}>Mis solicitudes</Text>
    {loading ? <View style={styles.state}><ActivityIndicator color={colors.primary} /></View> : requests.length === 0 ? <View style={styles.state}><Text style={styles.cardTitle}>Aún no tienes solicitudes.</Text></View> : requests.map((request) => <View key={request.id} style={styles.card}><Text style={styles.cardTitle}>{request.material}</Text><Text style={styles.meta}>{request.category} · {request.quantity} {request.unit}</Text><Text style={styles.description}>{request.description}</Text><Text style={styles.meta}>{request.location}</Text><Text style={styles.status}>Activa · {new Date(request.createdAt).toLocaleDateString()}</Text></View>)}
  </ScrollView>;
}

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: colors.background }, content: { padding: 20, paddingBottom: 40 }, title: { fontSize: 28, fontWeight: '800', color: colors.text }, card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginTop: 14 }, cardTitle: { fontSize: 18, fontWeight: '800', color: colors.text }, meta: { color: colors.muted, marginTop: 6 }, description: { color: colors.text, marginTop: 10 }, status: { color: colors.primary, fontWeight: '700', marginTop: 12 }, state: { alignItems: 'center', padding: 40 } });
