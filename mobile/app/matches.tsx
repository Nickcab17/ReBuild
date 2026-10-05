import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BrandLogo, PrimaryButton } from '../components/Branding';
import { EmptyState, LoadingState } from '../components/RebuildUI';
import { colors, radius, shadows, typography } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import type { MatchItem, Material, MaterialRequest } from '../types';

export default function MatchesScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingMatchId, setConnectingMatchId] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [matchData, materialData, requestData] = await Promise.all([api.getMatches(token), api.listMaterials(), api.listRequests(token)]);
      setMatches(matchData as MatchItem[]); setMaterials(materialData as Material[]); setRequests(requestData as MaterialRequest[]);
    } finally { setLoading(false); }
  }, [token]);
  useEffect(() => { load(); }, [load]);
  const connect = async (matchId: string) => {
    if (!token) return;
    setConnectingMatchId(matchId);
    try {
      const conversation = await api.createConversation(matchId, token) as { id: string };
      router.push({ pathname: '/chat/[id]', params: { id: conversation.id } });
    } catch (error) {
      Alert.alert('No se pudo abrir el chat', error instanceof Error ? error.message : 'Intenta nuevamente.');
    } finally { setConnectingMatchId(null); }
  };
  if (!token) return <View style={styles.state}><BrandLogo compact /><Text style={styles.title}>Inicia sesión para ver coincidencias.</Text></View>;
  return <ScrollView style={styles.container} contentContainerStyle={styles.content}><BrandLogo compact /><View style={styles.headerRow}><Text style={styles.title}>Coincidencias</Text><TouchableOpacity accessibilityRole="button" onPress={() => router.push('/conectar')}><Text style={styles.conversationsLink}>Conversaciones</Text></TouchableOpacity></View>{loading ? <LoadingState message="Buscando coincidencias..." /> : matches.length === 0 ? <EmptyState title="Aún no hay coincidencias" message="Publica lo que tienes o necesitas." /> : matches.map((match) => { const material = match.material ?? materials.find((item) => item.id === match.materialId); const request = match.request ?? requests.find((item) => item.id === match.requestId); if (!material || !request || material.userId === request.userId) return null; return <View key={match.id} style={styles.card}><Text style={styles.badge}>Coincidencia</Text><Text style={styles.cardTitle}>{material.name}</Text><Text style={styles.meta}>Busca: {request.material}</Text><Text style={styles.meta}>{material.quantity} {material.unit} · {material.location}</Text><Text style={styles.reason}>{match.reason}</Text><PrimaryButton title={connectingMatchId === match.id ? 'Abriendo chat...' : 'Contactar'} onPress={() => connect(match.id)} disabled={connectingMatchId !== null} style={styles.button} /></View>; })}</ScrollView>;
}

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: colors.background }, content: { padding: 20, paddingBottom: 40 }, headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, title: { ...typography.h2, marginTop: 12, marginBottom: 12 }, conversationsLink: { color: colors.primary, fontWeight: '700', marginTop: 12, marginBottom: 12 }, card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: 18, marginTop: 14, ...shadows.card }, badge: { color: colors.primary, fontWeight: '800', marginBottom: 8 }, cardTitle: { fontSize: 18, fontWeight: '800', color: colors.text }, meta: { color: colors.muted, marginTop: 6 }, reason: { color: colors.text, marginTop: 10 }, button: { marginTop: 14 }, state: { alignItems: 'center', padding: 40, backgroundColor: colors.background, flex: 1, justifyContent: 'center' } });
