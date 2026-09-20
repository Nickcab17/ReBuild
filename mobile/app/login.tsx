import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { colors } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('ana@rebuild.dev');
  const [password, setPassword] = useState('secret123');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await login(email.trim(), password);
      router.replace('/');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudo iniciar sesión. Revisa tus datos y la conexión con el backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Iniciar sesión</Text>
      <Text style={styles.subtitle}>Accede para publicar materiales y guardar favoritos.</Text>

      <Text style={styles.label}>Correo</Text>
      <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={styles.input} />

      <Text style={styles.label}>Contraseña</Text>
      <TextInput value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />

      <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={loading}>
        <Text style={styles.primaryButtonText}>{loading ? 'Ingresando...' : 'Entrar'}</Text>
      </TouchableOpacity>

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>¿No tienes cuenta?</Text>
        <Link href="/register" asChild>
          <TouchableOpacity>
            <Text style={styles.linkText}>Crear cuenta</Text>
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
