import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { colors } from '../constants/theme';
import { Logo } from '../components/Branding';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import type { Material } from '../types';

export default function HomeScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialsError, setMaterialsError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  useFocusEffect(() => {
    let active = true;
    api.listMaterials().then((data) => { if (active) { setMaterials(data as Material[]); setMaterialsError(null); } }).catch((error) => { if (active) setMaterialsError(error instanceof Error ? error.message : 'No se pudieron cargar los materiales.'); });
    return () => { active = false; };
  });

  if (loading || !user) {
    return <View style={styles.loadingState}><ActivityIndicator color={colors.primary} /><Text style={styles.emptyStateText}>Cargando tu sesión...</Text></View>;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerCard}>
        <Logo compact />
        <Text style={styles.title}>Tú describes. La IA conecta.</Text>
        <Text style={styles.subtitle}>Publica → Encuentra → Conecta</Text>
      </View>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Publicaciones recientes</Text>
        <Link href="/explore" asChild>
          <TouchableOpacity accessibilityRole="button">
            <Text style={styles.linkText}>Ver todas</Text>
          </TouchableOpacity>
        </Link>
      </View>

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
        <Link href="/map" asChild><TouchableOpacity accessibilityRole="button"><Text style={styles.linkText}>Ver mapa</Text></TouchableOpacity></Link>
      </View>

      {materialsError ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>No pudimos cargar los materiales</Text>
          <Text style={styles.emptyStateText}>{materialsError}</Text>
        </View>
      ) : materials.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>Aún no hay publicaciones</Text>
        </View>
      ) : (
        materials.slice(0, 3).map((material) => (
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
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  linkText: { color: colors.primary, fontWeight: '600' },
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
