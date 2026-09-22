import { useEffect, useState } from 'react';
import { Alert, Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BrandLogo, PrimaryButton } from '../../components/Branding';
import { colors, radius, shadows, typography } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import type { Material } from '../../types';

type MaterialDetail = Material & { owner?: { name: string; email: string; city: string } };

export default function MaterialDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [material, setMaterial] = useState<MaterialDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.getMaterialById(id).then(async (item) => {
      setMaterial(item as MaterialDetail);
      if (token) {
        const favorites = await api.getFavorites(token) as Array<{ materialId: string }>;
        setSaved(favorites.some((favorite) => favorite.materialId === id));
      }
    }).catch(() => setMaterial(null));
  }, [id, token]);

  const handleFavorite = async () => {
    if (!id || !token) return Alert.alert('Sesión requerida', 'Inicia sesión para guardar materiales.');
    setSaving(true);
    try {
      if (saved) { await api.removeFavorite(id, token); setSaved(false); }
      else { await api.addFavorite(id, token); setSaved(true); }
    } catch (error) { Alert.alert('No se pudo actualizar favorito', error instanceof Error ? error.message : 'Intenta nuevamente.'); }
    finally { setSaving(false); }
  };

  const handleInterest = async () => {
    if (!id || !token) return Alert.alert('Sesión requerida', 'Inicia sesión para mostrar interés.');
    try { await api.showInterest(id, token); Alert.alert('Interés registrado', 'La persona que publicó el material podrá verlo.'); }
    catch (error) { Alert.alert('No se pudo registrar', error instanceof Error ? error.message : 'Intenta nuevamente.'); }
  };

  const contactOwner = async () => {
    if (!material?.owner?.email) return Alert.alert('Contacto no disponible', 'El propietario no tiene un correo público configurado.');
    await Linking.openURL(`mailto:${material.owner.email}?subject=${encodeURIComponent(`Interés en ${material.name}`)}`);
  };

  if (!material) return <View style={styles.container}><BrandLogo compact /><Text style={styles.title}>Cargando material...</Text></View>;
  return <ScrollView style={styles.container} contentContainerStyle={styles.content}>
    <BrandLogo compact />
    <Image source={{ uri: material.photos?.[0] || 'https://placehold.co/600x400/1E8E5A/ffffff?text=Rebuild' }} style={styles.image} />
    <Text style={styles.title}>{material.name}</Text>
    <Text style={styles.meta}>{material.category} · {material.condition}</Text>
    <Text style={styles.meta}>Publicado por {material.owner?.name ?? 'miembro de Rebuild'}</Text>
    <Text style={styles.description}>{material.description}</Text>
    <View style={styles.detailGrid}><View style={styles.detailBox}><Text style={styles.label}>Cantidad</Text><Text>{material.quantity} {material.unit}</Text></View><View style={styles.detailBox}><Text style={styles.label}>Ubicación</Text><Text>{material.location}</Text></View><View style={styles.detailBox}><Text style={styles.label}>Disponibilidad</Text><Text>{material.availability}</Text></View><View style={styles.detailBox}><Text style={styles.label}>Fecha</Text><Text>{new Date(material.createdAt).toLocaleDateString()}</Text></View></View>
    <View style={styles.buttonRow}><PrimaryButton title="Me interesa" onPress={handleInterest} style={styles.primaryButton} /><TouchableOpacity style={styles.secondaryButton} onPress={handleFavorite} disabled={saving}><Text style={styles.secondaryText}>{saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar'}</Text></TouchableOpacity></View>
    <View style={styles.buttonRow}><TouchableOpacity style={styles.secondaryButton} onPress={contactOwner}><Text style={styles.secondaryText}>Contactar</Text></TouchableOpacity><TouchableOpacity style={styles.secondaryButton} onPress={() => router.push({ pathname: '/map', params: { materialId: material.id } })}><Text style={styles.secondaryText}>Ver en mapa</Text></TouchableOpacity></View>
  </ScrollView>;
}

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: colors.background }, content: { padding: 20, paddingBottom: 40 }, image: { width: '100%', height: 220, borderRadius: radius.xl, marginTop: 14, ...shadows.card }, title: { ...typography.h2, marginTop: 16 }, meta: { color: colors.muted, marginTop: 6 }, description: { marginTop: 12, color: colors.text, fontSize: 16 }, detailGrid: { marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }, detailBox: { width: '48%', backgroundColor: colors.surface, borderRadius: 14, padding: 14, marginBottom: 12, ...shadows.card }, label: { color: colors.muted, fontWeight: '700', marginBottom: 4 }, buttonRow: { marginTop: 18, flexDirection: 'row', gap: 12 }, primaryButton: { flex: 1 }, secondaryButton: { flex: 1, backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 14, alignItems: 'center' }, secondaryText: { color: colors.text, fontWeight: '700' } });
