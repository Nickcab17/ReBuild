import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { BrandLogo, PrimaryButton } from '../components/Branding';
import { EmptyState, LoadingState } from '../components/RebuildUI';
import { colors, radius, shadows, typography } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import type { MatchItem, Material, MaterialRequest } from '../types';

export default function MatchesScreen() {
  const { token } = useAuth();
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [matchData, materialData, requestData] = await Promise.all([api.getMatches(token), api.listMaterials(), api.listRequests(token)]);
      setMatches(matchData as MatchItem[]); setMaterials(materialData as Material[]); setRequests(requestData as MaterialRequest[]);
    } finally { setLoading(false); }
  }, [token]);
  useEffect(() => { load(); }, [load]);
  if (!token) return <View style={styles.state}><BrandLogo compact /><Text style={styles.title}>Inicia sesión para ver coincidencias.</Text></View>;
  return <ScrollView style={styles.container} contentContainerStyle={styles.content}><BrandLogo compact /><Text style={styles.title}>Coincidencias</Text>{loading ? <LoadingState message="Buscando coincidencias..." /> : matches.length === 0 ? <EmptyState title="Todavía no hay coincidencias" message="Crea una solicitud para empezar a conectar materiales." /> : matches.map((match) => { const material = materials.find((item) => item.id === match.materialId); const request = requests.find((item) => item.id === match.requestId); if (!material || !request) return null; return <View key={match.id} style={styles.card}><Text style={styles.badge}>Encontramos una coincidencia</Text><Text style={styles.cardTitle}>{material.name}</Text><Text style={styles.meta}>Para: {request.material}</Text><Text style={styles.meta}>{material.quantity} {material.unit} · {material.location}</Text><Text style={styles.reason}>{match.reason}</Text><Link href={{ pathname: '/material/[id]', params: { id: material.id } }} asChild><PrimaryButton title="Ver material" style={styles.button} /></Link></View>; })}</ScrollView>;
}

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: colors.background }, content: { padding: 20, paddingBottom: 40 }, title: { ...typography.h2, marginTop: 12, marginBottom: 12 }, card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: 18, marginTop: 14, ...shadows.card }, badge: { color: colors.primary, fontWeight: '800', marginBottom: 8 }, cardTitle: { fontSize: 18, fontWeight: '800', color: colors.text }, meta: { color: colors.muted, marginTop: 6 }, reason: { color: colors.text, marginTop: 10 }, button: { marginTop: 14 }, state: { alignItems: 'center', padding: 40, backgroundColor: colors.background, flex: 1, justifyContent: 'center' } });
