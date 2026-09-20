import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Link } from 'expo-router';
import { colors, categories } from '../constants/theme';
import { api } from '../services/api';
import type { Material } from '../types';

const conditions = ['Todos', 'Excelente', 'Buena', 'Usada', 'Necesita reparación'];
const locations = ['Todas', 'Ciudad de México', 'Guadalajara', 'Monterrey'];
const radii = ['Sin límite', '5', '10', '25'];

type ListedMaterial = Material & { distanceKm?: number };

export default function ExploreScreen() {
  const [materials, setMaterials] = useState<ListedMaterial[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  const [condition, setCondition] = useState('Todos');
  const [location, setLocation] = useState('Todas');
  const [radius, setRadius] = useState('Sin límite');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMaterials = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      setError(null);
      const data = await api.listMaterials({ q: search, category, condition, location, radiusKm: radius === 'Sin límite' ? undefined : radius });
      setMaterials(data as ListedMaterial[]);
    } catch {
      setError('No pudimos cargar los materiales. Intenta nuevamente.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => { loadMaterials(); }, 400);
    return () => clearTimeout(timer);
  }, [search, category, condition, location, radius]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadMaterials(true)} tintColor={colors.primary} />}>
      <Text style={styles.title}>Explorar materiales</Text>
      <Text style={styles.subtitle}>Encuentra materiales disponibles cerca de ti.</Text>
      <TextInput placeholder="Buscar madera, pintura..." value={search} onChangeText={setSearch} style={styles.input} />

      <Text style={styles.filterLabel}>Categoría</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>{['Todos', ...categories].map((item) => <FilterChip key={item} label={item} active={category === item} onPress={() => setCategory(item)} />)}</ScrollView>
      <Text style={styles.filterLabel}>Condición</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>{conditions.map((item) => <FilterChip key={item} label={item} active={condition === item} onPress={() => setCondition(item)} />)}</ScrollView>
      <Text style={styles.filterLabel}>Ubicación</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>{locations.map((item) => <FilterChip key={item} label={item} active={location === item} onPress={() => setLocation(item)} />)}</ScrollView>
      <Text style={styles.filterLabel}>Distancia máxima</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>{radii.map((item) => <FilterChip key={item} label={item === 'Sin límite' ? item : `${item} km`} active={radius === item} onPress={() => setRadius(item)} />)}</ScrollView>

      {loading ? <View style={styles.state}><ActivityIndicator color={colors.primary} /><Text style={styles.stateText}>Cargando materiales...</Text></View> : error ? <View style={styles.state}><Text style={styles.errorText}>{error}</Text><TouchableOpacity onPress={() => loadMaterials()}><Text style={styles.retry}>Reintentar</Text></TouchableOpacity></View> : materials.length === 0 ? <View style={styles.state}><Text style={styles.stateTitle}>No encontramos materiales con estos filtros.</Text><Text style={styles.stateText}>Prueba cambiando la búsqueda o la ubicación.</Text></View> : materials.map((material) => <MaterialCard key={material.id} material={material} />)}
    </ScrollView>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <TouchableOpacity onPress={onPress} style={[styles.pill, active && styles.pillActive]}><Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text></TouchableOpacity>;
}

function MaterialCard({ material }: { material: ListedMaterial }) {
  return <Link href={{ pathname: '/material/[id]', params: { id: material.id } }} asChild><TouchableOpacity style={styles.card}>
    <Image source={{ uri: material.photos?.[0] || 'https://placehold.co/600x400/1E8E5A/ffffff?text=Rebuild' }} style={styles.cardImage} />
    <View style={styles.cardBody}><Text style={styles.cardTitle}>{material.name}</Text><Text style={styles.cardMeta}>{material.category} · {material.condition}</Text><Text style={styles.cardMeta}>{material.quantity} {material.unit} · {material.location}</Text>{material.distanceKm !== undefined && <Text style={styles.distance}>A {material.distanceKm} km aproximadamente</Text>}<Text numberOfLines={2} style={styles.cardDescription}>{material.description}</Text></View>
  </TouchableOpacity></Link>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, content: { padding: 20, paddingBottom: 40 }, title: { fontSize: 28, fontWeight: '800', color: colors.text }, subtitle: { color: colors.muted, marginTop: 6 }, input: { marginTop: 16, backgroundColor: colors.surface, borderRadius: 12, padding: 13, color: colors.text }, filterLabel: { marginTop: 16, marginBottom: 8, color: colors.text, fontWeight: '700' }, filterRow: { marginBottom: 2 }, pill: { backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 }, pillActive: { backgroundColor: colors.primary }, pillText: { color: colors.text, fontWeight: '600', fontSize: 13 }, pillTextActive: { color: '#FFF' }, card: { backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden', marginTop: 14 }, cardImage: { width: '100%', height: 170 }, cardBody: { padding: 14 }, cardTitle: { fontWeight: '800', fontSize: 18, color: colors.text }, cardMeta: { color: colors.muted, marginTop: 5 }, distance: { color: colors.primary, marginTop: 6, fontWeight: '700' }, cardDescription: { color: colors.text, marginTop: 8 }, state: { alignItems: 'center', paddingVertical: 48 }, stateTitle: { color: colors.text, fontWeight: '700', textAlign: 'center' }, stateText: { color: colors.muted, marginTop: 8, textAlign: 'center' }, errorText: { color: colors.danger, textAlign: 'center' }, retry: { color: colors.primary, fontWeight: '700', marginTop: 12 },
});
