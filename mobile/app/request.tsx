import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, categories } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

const units = ['unidad', 'tablas', 'botes', 'metros', 'kilogramos', 'sets'];

export default function RequestScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [form, setForm] = useState({ material: '', category: 'Madera', quantity: '', unit: 'unidad', description: '', location: 'Ciudad de México', neededBy: '' });
  const [loading, setLoading] = useState(false);
  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async () => {
    if (!token) {
      Alert.alert('Sesión requerida', 'Inicia sesión para crear una solicitud.');
      return;
    }
    const quantity = Number(form.quantity);
    if (!form.material.trim() || !form.category || !form.quantity.trim() || !Number.isFinite(quantity) || quantity <= 0 || !form.unit || !form.description.trim() || !form.location.trim()) {
      Alert.alert('Completa los campos', 'Material, categoría, cantidad, unidad, descripción y ubicación son obligatorios.');
      return;
    }
    try {
      setLoading(true);
      await api.createRequest({ ...form, material: form.material.trim(), description: form.description.trim(), location: form.location.trim(), quantity, neededBy: form.neededBy ? new Date(form.neededBy).toISOString() : new Date(Date.now() + 604800000).toISOString() }, token);
      Alert.alert('Solicitud creada', 'Buscaremos materiales que puedan ayudarte.', [{ text: 'Ver coincidencias', onPress: () => router.replace('/matches') }]);
    } catch (error) {
      Alert.alert('No se pudo crear la solicitud', error instanceof Error ? error.message : 'Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return <ScrollView style={styles.container} contentContainerStyle={styles.content}>
    <Text style={styles.title}>Necesito material</Text>
    <Text style={styles.subtitle}>Describe lo que buscas y revisaremos posibles coincidencias.</Text>
    <Text style={styles.label}>Material *</Text><TextInput value={form.material} onChangeText={(value) => update('material', value)} placeholder="Ej. Madera para mesa" style={styles.input} />
    <Text style={styles.label}>Categoría *</Text><View style={styles.chipRow}>{categories.map((category) => <Chip key={category} label={category} active={form.category === category} onPress={() => update('category', category)} />)}</View>
    <Text style={styles.label}>Cantidad * y unidad *</Text><View style={styles.quantityRow}><TextInput keyboardType="numeric" value={form.quantity} onChangeText={(value) => update('quantity', value)} placeholder="10" style={[styles.input, styles.quantityInput]} /><View style={styles.unitRow}>{units.map((unit) => <Chip key={unit} label={unit} active={form.unit === unit} onPress={() => update('unit', unit)} />)}</View></View>
    <Text style={styles.label}>Descripción *</Text><TextInput multiline value={form.description} onChangeText={(value) => update('description', value)} placeholder="¿Para qué lo necesitas?" style={[styles.input, styles.textArea]} />
    <Text style={styles.label}>Ubicación *</Text><TextInput value={form.location} onChangeText={(value) => update('location', value)} placeholder="Ciudad o zona aproximada" style={styles.input} />
    <Text style={styles.label}>Fecha límite opcional</Text><TextInput value={form.neededBy} onChangeText={(value) => update('neededBy', value)} placeholder="2026-12-31" style={styles.input} />
    <TouchableOpacity style={[styles.submitButton, loading && styles.disabled]} onPress={handleSubmit} disabled={loading}><Text style={styles.submitText}>{loading ? 'Guardando...' : 'Crear solicitud'}</Text></TouchableOpacity>
  </ScrollView>;
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]}><Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text></TouchableOpacity>; }

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: colors.background }, content: { padding: 20, paddingBottom: 44 }, title: { fontSize: 28, fontWeight: '800', color: colors.text }, subtitle: { color: colors.muted, marginTop: 6 }, label: { marginTop: 18, marginBottom: 8, color: colors.text, fontWeight: '700' }, input: { backgroundColor: colors.surface, borderRadius: 12, padding: 13, color: colors.text }, textArea: { minHeight: 100, textAlignVertical: 'top' }, chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9 }, chipActive: { backgroundColor: colors.primary }, chipText: { color: colors.text, fontSize: 13 }, chipTextActive: { color: '#FFF', fontWeight: '700' }, quantityRow: { gap: 10 }, quantityInput: { width: 120 }, unitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, submitButton: { marginTop: 28, backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' }, disabled: { opacity: 0.55 }, submitText: { color: '#FFF', fontWeight: '700' } });
