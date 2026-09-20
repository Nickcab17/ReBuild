import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Link } from 'expo-router';
import { colors } from '../constants/theme';
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
  if (!token) return <View style={styles.state}><Text style={styles.title}>Inicia sesión para ver coincidencias.</Text></View>;
  return <ScrollView style={styles.container} contentContainerStyle={styles.content}><Text style={styles.title}>Posibles coincidencias</Text>{loading ? <View style={styles.state}><ActivityIndicator color={colors.primary} /></View> : matches.length === 0 ? <View style={styles.state}><Text style={styles.cardTitle}>Todavía no encontramos coincidencias.</Text><Text style={styles.meta}>Crea una solicitud para comenzar.</Text></View> : matches.map((match) => { const material = materials.find((item) => item.id === match.materialId); const request = requests.find((item) => item.id === match.requestId); if (!material || !request) return null; return <View key={match.id} style={styles.card}><Text style={styles.badge}>Posible coincidencia</Text><Text style={styles.cardTitle}>{material.name}</Text><Text style={styles.meta}>Para: {request.material}</Text><Text style={styles.meta}>{material.quantity} {material.unit} · {material.location}</Text><Text style={styles.reason}>{match.reason}. Disponible para reutilizar.</Text><Link href={{ pathname: '/material/[id]', params: { id: material.id } }} asChild><TouchableOpacity style={styles.button}><Text style={styles.buttonText}>Ver material</Text></TouchableOpacity></Link></View>; })}</ScrollView>;
}

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: colors.background }, content: { padding: 20, paddingBottom: 40 }, title: { fontSize: 28, fontWeight: '800', color: colors.text }, card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginTop: 14 }, badge: { color: colors.primary, fontWeight: '800', marginBottom: 8 }, cardTitle: { fontSize: 18, fontWeight: '800', color: colors.text }, meta: { color: colors.muted, marginTop: 6 }, reason: { color: colors.text, marginTop: 10 }, button: { backgroundColor: colors.primary, borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 14 }, buttonText: { color: '#FFF', fontWeight: '700' }, state: { alignItems: 'center', padding: 40 } });
