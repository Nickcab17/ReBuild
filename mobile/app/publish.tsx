import { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { BrandLogo, PrimaryButton } from '../components/Branding';
import { CategoryChip } from '../components/RebuildUI';
import { colors, categories, radius, shadows, typography } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

const units = ['unidad', 'tablas', 'botes', 'metros', 'kilogramos', 'sets'];
const conditions = ['Excelente', 'Buena', 'Usada', 'Necesita reparación'];
const locations = ['Ciudad de México', 'Guadalajara', 'Monterrey', 'Otra ubicación'];

export default function PublishScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [form, setForm] = useState({ name: '', description: '', category: 'Madera', quantity: '', unit: 'unidad', condition: 'Buena', location: 'Ciudad de México' });
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const choosePhoto = async (source: 'camera' | 'gallery') => {
    const permission = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(source === 'camera' ? 'Permiso de cámara rechazado' : 'Permiso de galería rechazado', source === 'camera' ? 'Puedes seleccionar una imagen desde la galería.' : 'Puedes publicar sin fotografía.');
      return;
    }
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [4, 3] })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [4, 3] });
    if (!result.canceled && result.assets[0]?.uri) setPhoto(result.assets[0].uri);
  };

  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async () => {
    if (!token) {
      Alert.alert('Sesión requerida', 'Inicia sesión para publicar un material.');
      return;
    }
    const quantity = Number(form.quantity);
    if (!form.name.trim() || !form.description.trim() || !form.category || !form.quantity.trim() || !Number.isFinite(quantity) || quantity <= 0 || !form.unit || !form.condition || !form.location.trim()) {
      Alert.alert('Completa los campos', 'Nombre, descripción, categoría, cantidad, unidad, condición y ubicación son obligatorios.');
      return;
    }
    try {
      setLoading(true);
      const material = await api.createMaterial({ ...form, name: form.name.trim(), description: form.description.trim(), location: form.location.trim(), quantity, photos: photo ? [photo] : [] }, token) as { id: string };
      Alert.alert('Material publicado', 'Tu material ya está disponible para la comunidad.', [{ text: 'Ver material', onPress: () => router.replace({ pathname: '/material/[id]', params: { id: material.id } }) }]);
    } catch (error) {
      Alert.alert('No se pudo publicar', error instanceof Error ? error.message : 'Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroRow}>
        <BrandLogo compact />
      </View>
      <Text style={styles.title}>Publicar material</Text>
      <Text style={styles.subtitle}>Comparte algo que otra persona pueda reutilizar.</Text>
      {photo ? <View style={styles.photoPreview}><Image source={{ uri: photo }} style={styles.photo} /><TouchableOpacity style={styles.removePhoto} onPress={() => setPhoto(null)}><Text style={styles.removePhotoText}>Eliminar fotografía</Text></TouchableOpacity></View> : <View style={styles.photoActions}><TouchableOpacity style={styles.photoButton} onPress={() => choosePhoto('camera')}><Text style={styles.photoButtonText}>Tomar fotografía</Text></TouchableOpacity><TouchableOpacity style={styles.photoButtonSecondary} onPress={() => choosePhoto('gallery')}><Text style={styles.photoButtonSecondaryText}>Elegir de galería</Text></TouchableOpacity></View>}
      <Text style={styles.label}>Nombre *</Text>
      <TextInput value={form.name} onChangeText={(value) => update('name', value)} placeholder="Ej. Tablas de pino" style={styles.input} placeholderTextColor={colors.muted} />
      <Text style={styles.label}>Descripción *</Text>
      <TextInput multiline value={form.description} onChangeText={(value) => update('description', value)} placeholder="Describe el material y su estado" style={[styles.input, styles.textArea]} placeholderTextColor={colors.muted} />
      <Text style={styles.label}>Categoría *</Text>
      <View style={styles.chipRow}>{categories.map((category) => <CategoryChip key={category} label={category} active={form.category === category} onPress={() => update('category', category)} />)}</View>
      <Text style={styles.label}>Cantidad * y unidad *</Text>
      <View style={styles.quantityRow}><TextInput keyboardType="numeric" value={form.quantity} onChangeText={(value) => update('quantity', value)} placeholder="10" style={[styles.input, styles.quantityInput]} placeholderTextColor={colors.muted} /><View style={styles.unitRow}>{units.map((unit) => <CategoryChip key={unit} label={unit} active={form.unit === unit} onPress={() => update('unit', unit)} />)}</View></View>
      <Text style={styles.label}>Condición *</Text>
      <View style={styles.chipRow}>{conditions.map((condition) => <CategoryChip key={condition} label={condition} active={form.condition === condition} onPress={() => update('condition', condition)} />)}</View>
      <Text style={styles.label}>Ubicación *</Text>
      <View style={styles.chipRow}>{locations.map((location) => <CategoryChip key={location} label={location} active={form.location === location} onPress={() => update('location', location)} />)}</View>
      {form.location === 'Otra ubicación' && <TextInput value={form.location === 'Otra ubicación' ? '' : form.location} onChangeText={(value) => update('location', value)} placeholder="Escribe tu ciudad" style={styles.input} placeholderTextColor={colors.muted} />}
      <PrimaryButton title={loading ? 'Publicando...' : 'Publicar material'} onPress={handleSubmit} disabled={loading} style={styles.submitButton} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 44 },
  heroRow: { marginBottom: 8 },
  title: { ...typography.h2, marginTop: 8 },
  subtitle: { color: colors.muted, marginTop: 6, marginBottom: 12 },
  photoActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  photoButton: { flex: 1, backgroundColor: colors.primary, borderRadius: radius.md, padding: 14, alignItems: 'center', ...shadows.soft },
  photoButtonSecondary: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  photoButtonText: { color: '#FFF', fontWeight: '700' },
  photoButtonSecondaryText: { color: colors.text, fontWeight: '700' },
  photoPreview: { marginTop: 20, backgroundColor: colors.surface, borderRadius: radius.xl, overflow: 'hidden', ...shadows.card },
  photo: { width: '100%', height: 220 },
  removePhoto: { padding: 12, alignItems: 'center' },
  removePhotoText: { color: colors.danger, fontWeight: '700' },
  label: { marginTop: 18, marginBottom: 8, ...typography.label },
  input: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 13, color: colors.text, borderWidth: 1, borderColor: colors.border },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  quantityRow: { gap: 10 },
  quantityInput: { width: 120 },
  unitRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  submitButton: { marginTop: 28 },
});
