import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CategoryChip, EmptyState, LoadingState, MaterialCard } from '../components/RebuildUI';
import { colors, categories, radius, shadows, typography } from '../constants/theme';
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
      <Text style={styles.title}>Publicaciones</Text>
      <TextInput placeholder="Buscar madera, pintura..." value={search} onChangeText={setSearch} style={styles.input} placeholderTextColor={colors.muted} />

      <Text style={styles.filterLabel}>Categoría</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>{['Todos', ...categories].map((item) => <CategoryChip key={item} label={item} active={category === item} onPress={() => setCategory(item)} />)}</ScrollView>
      <Text style={styles.filterLabel}>Condición</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>{conditions.map((item) => <CategoryChip key={item} label={item} active={condition === item} onPress={() => setCondition(item)} />)}</ScrollView>
      <Text style={styles.filterLabel}>Ubicación</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>{locations.map((item) => <CategoryChip key={item} label={item} active={location === item} onPress={() => setLocation(item)} />)}</ScrollView>
      <Text style={styles.filterLabel}>Distancia máxima</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>{radii.map((item) => <CategoryChip key={item} label={item === 'Sin límite' ? item : `${item} km`} active={radius === item} onPress={() => setRadius(item)} />)}</ScrollView>

      {loading ? <LoadingState message="Cargando materiales..." /> : error ? <EmptyState title="No pudimos cargar esto" message={error} /> : materials.length === 0 ? <EmptyState title="No encontramos materiales" message="Prueba cambiando la búsqueda o la ubicación." /> : materials.map((material) => <MaterialCard key={material.id} material={material} />)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  title: { ...typography.h2, marginBottom: 6 },
  subtitle: { color: colors.muted, marginBottom: 14 },
  input: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, color: colors.text, borderWidth: 1, borderColor: colors.border, ...shadows.soft },
  filterLabel: { marginTop: 18, marginBottom: 8, ...typography.label },
  filterRow: { marginBottom: 2 },
});
