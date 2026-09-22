import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BrandLogo } from '../components/Branding';
import { EmptyState, LoadingState } from '../components/RebuildUI';
import { colors, radius, shadows, typography } from '../constants/theme';
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
  if (!token) return <View style={styles.state}><BrandLogo compact /><Text style={styles.title}>Inicia sesión para ver tus solicitudes.</Text></View>;
  return <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}>
    <BrandLogo compact />
    <Text style={styles.title}>Mis solicitudes</Text>
    {loading ? <LoadingState message="Cargando tus solicitudes..." /> : requests.length === 0 ? <EmptyState title="Aún no tienes solicitudes" message="Cuando publiques una necesidad, aparecerá aquí." /> : requests.map((request) => <View key={request.id} style={styles.card}><Text style={styles.cardTitle}>{request.material}</Text><Text style={styles.meta}>{request.category} · {request.quantity} {request.unit}</Text><Text style={styles.description}>{request.description}</Text><Text style={styles.meta}>{request.location}</Text><Text style={styles.status}>Activa · {new Date(request.createdAt).toLocaleDateString()}</Text></View>)}
  </ScrollView>;
}

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: colors.background }, content: { padding: 20, paddingBottom: 40 }, title: { ...typography.h2, marginTop: 12, marginBottom: 12 }, card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: 18, marginTop: 14, ...shadows.card }, cardTitle: { fontSize: 18, fontWeight: '800', color: colors.text }, meta: { color: colors.muted, marginTop: 6 }, description: { color: colors.text, marginTop: 10 }, status: { color: colors.primary, fontWeight: '700', marginTop: 12 }, state: { alignItems: 'center', padding: 40, flex: 1, justifyContent: 'center', backgroundColor: colors.background } });
