import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, TextInput, TouchableOpacity, Image } from 'react-native';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { colors, categories } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import type { Material } from '../types';

export default function HomeScreen() {
  const router = useRouter();
  const { user, token, loading } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [matchCount, setMatchCount] = useState(0);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  useFocusEffect(() => {
    let active = true;
    api.listMaterials().then((data) => { if (active) setMaterials(data as Material[]); }).catch(() => { if (active) setMaterials([]); });
    return () => { active = false; };
  });

  useEffect(() => {
    if (!token) { setMatchCount(0); return; }
    api.getMatches(token).then((data) => setMatchCount((data as unknown[]).length)).catch(() => setMatchCount(0));
  }, [token]);

  const visibleMaterials = materials.filter((item) => {
    const searchText = `${item.name} ${item.description} ${item.category}`.toLowerCase();
    return searchText.includes(query.toLowerCase());
  });

  if (loading || !user) {
    return <View style={styles.loadingState}><ActivityIndicator color={colors.primary} /><Text style={styles.emptyStateText}>Cargando tu sesión...</Text></View>;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.eyebrow}>Rebuild</Text>
        <Text style={styles.title}>{loading ? 'Cargando...' : user ? `Hola, ${user.name.split(' ')[0]}` : 'Bienvenido a Rebuild'}</Text>
        <Text style={styles.subtitle}>¿Qué necesitas encontrar?</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar materiales"
          style={styles.searchInput}
        />
      </View>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Materiales cerca de ti</Text>
        <Link href="/explore" asChild>
          <TouchableOpacity>
            <Text style={styles.linkText}>Explorar</Text>
          </TouchableOpacity>
        </Link>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
        {categories.map((category) => (
          <View key={category} style={styles.pill}>
            <Text style={styles.pillText}>{category}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.quickActions}>
        <Link href={user ? '/publish' : '/login'} asChild>
          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{user ? 'Publicar material' : 'Iniciar sesión'}</Text>
          </TouchableOpacity>
        </Link>
        <Link href={user ? '/request' : '/register'} asChild>
          <TouchableOpacity style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>{user ? 'Necesito material' : 'Crear cuenta'}</Text>
          </TouchableOpacity>
        </Link>
      </View>

      <View style={styles.navigationRow}>
        <Link href="/matches" asChild><TouchableOpacity><Text style={styles.linkText}>Coincidencias ({matchCount})</Text></TouchableOpacity></Link>
        <Link href="/requests" asChild><TouchableOpacity><Text style={styles.linkText}>Mis solicitudes</Text></TouchableOpacity></Link>
        <Link href="/profile" asChild><TouchableOpacity><Text style={styles.linkText}>Perfil</Text></TouchableOpacity></Link>
        <Link href="/map" asChild><TouchableOpacity><Text style={styles.linkText}>Mapa</Text></TouchableOpacity></Link>
      </View>

      <Text style={styles.sectionTitle}>Publicaciones recientes</Text>

      {visibleMaterials.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>Sin materiales todavía</Text>
          <Text style={styles.emptyStateText}>Aún no hay publicaciones en esta búsqueda.</Text>
        </View>
      ) : (
        visibleMaterials.slice(0, 3).map((material) => (
          <Link key={material.id} href={{ pathname: '/material/[id]', params: { id: material.id } }} asChild>
            <TouchableOpacity style={styles.card}>
              <Image
                source={{ uri: material.photos?.[0] || 'https://placehold.co/600x400/1E8E5A/ffffff?text=Rebuild' }}
                style={styles.cardImage}
              />
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{material.name}</Text>
                <Text style={styles.cardMeta}>{material.category} • {material.location}</Text>
                <Text style={styles.cardDescription}>{material.description}</Text>
              </View>
            </TouchableOpacity>
          </Link>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: colors.background },
  headerCard: { backgroundColor: colors.surface, borderRadius: 24, padding: 20, marginBottom: 20 },
  eyebrow: { color: colors.primary, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 8 },
  subtitle: { fontSize: 16, color: colors.muted, marginTop: 6 },
  searchInput: { marginTop: 16, borderRadius: 12, padding: 12, backgroundColor: '#F0F6F3', color: colors.text },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  linkText: { color: colors.primary, fontWeight: '600' },
  categoryRow: { marginTop: 16, marginBottom: 8 },
  pill: { backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 },
  pillText: { color: colors.text, fontWeight: '600' },
  quickActions: { flexDirection: 'row', gap: 12, marginTop: 18, marginBottom: 20 },
  primaryButton: { flex: 1, backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  primaryButtonText: { color: '#FFF', fontWeight: '700' },
  secondaryButton: { flex: 1, backgroundColor: colors.accent, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  secondaryButtonText: { color: colors.text, fontWeight: '700' },
  navigationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 20 },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  card: { backgroundColor: colors.surface, borderRadius: 18, overflow: 'hidden', marginBottom: 16 },
  cardImage: { width: '100%', height: 180 },
  cardBody: { padding: 14 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  cardMeta: { fontSize: 12, color: colors.muted, marginTop: 4 },
  cardDescription: { marginTop: 8, color: colors.text },
  emptyState: { backgroundColor: colors.surface, borderRadius: 18, padding: 20, marginTop: 12 },
  emptyStateTitle: { fontWeight: '700', color: colors.text },
  emptyStateText: { color: colors.muted, marginTop: 8 },
});
