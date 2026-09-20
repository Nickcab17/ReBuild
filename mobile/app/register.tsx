import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { colors } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !city.trim() || password.length < 6) {
      alert('Completa todos los campos. La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    try {
      setLoading(true);
      await register(name.trim(), email.trim(), password, city.trim());
      router.replace('/');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudo crear la cuenta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Crear cuenta</Text>
      <Text style={styles.subtitle}>Únete a Rebuild para publicar y encontrar materiales reutilizables.</Text>

      <Text style={styles.label}>Nombre</Text>
      <TextInput value={name} onChangeText={setName} style={styles.input} />

      <Text style={styles.label}>Correo</Text>
      <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={styles.input} />

      <Text style={styles.label}>Ciudad</Text>
      <TextInput value={city} onChangeText={setCity} style={styles.input} />

      <Text style={styles.label}>Contraseña</Text>
      <TextInput value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />

      <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={loading}>
        <Text style={styles.primaryButtonText}>{loading ? 'Creando cuenta...' : 'Registrarme'}</Text>
      </TouchableOpacity>

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>Ya tienes cuenta?</Text>
        <Link href="/login" asChild>
          <TouchableOpacity>
            <Text style={styles.linkText}>Inicia sesión</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, paddingTop: 64 },
  title: { fontSize: 30, fontWeight: '800', color: colors.text },
  subtitle: { marginTop: 8, color: colors.muted, fontSize: 16 },
  label: { marginTop: 22, marginBottom: 8, fontWeight: '700', color: colors.text },
  input: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, color: colors.text },
  primaryButton: { marginTop: 24, backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  primaryButtonText: { color: '#FFF', fontWeight: '700' },
  footerRow: { marginTop: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  footerText: { color: colors.muted },
  linkText: { marginLeft: 6, color: colors.primary, fontWeight: '700' },
});
