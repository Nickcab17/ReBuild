import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from 'react-native';
import { colors, shadows, typography } from '../constants/theme';

export function RebuildMark({ size = 32, accent = colors.terracotta }: { size?: number; accent?: string }) {
  return (
    <View style={[styles.markWrap, { width: size, height: size, borderRadius: size * 0.32 }]}> 
      <View style={[styles.stem, { backgroundColor: colors.primary, height: size * 0.68, width: size * 0.14, left: size * 0.22, top: size * 0.18 }]} />
      <View style={[styles.loop, { backgroundColor: accent, width: size * 0.34, height: size * 0.34, right: size * 0.18, top: size * 0.14 }]} />
      <View style={[styles.diag, { backgroundColor: colors.primary, width: size * 0.24, height: size * 0.12, right: size * 0.14, bottom: size * 0.2, transform: [{ rotate: '-38deg' }] }]} />
      <View style={[styles.foot, { backgroundColor: accent, width: size * 0.25, height: size * 0.12, right: size * 0.18, bottom: size * 0.18, transform: [{ rotate: '-38deg' }] }]} />
      <View style={[styles.connector, { backgroundColor: colors.sage, width: size * 0.10, height: size * 0.10, left: size * 0.52, top: size * 0.45 }]} />
    </View>
  );
}

export function RebuildWordmark({ compact = false, accent = colors.terracotta }: { compact?: boolean; accent?: string }) {
  return (
    <Text style={[typography.brandWordmark, compact && styles.compactWordmark]}>
      <Text style={[styles.wordmarkBase, { color: colors.primary }]}>R</Text>
      <Text style={[styles.wordmarkBase, { color: colors.text }]}>ebuild</Text>
      <Text style={[styles.wordmarkAccent, { color: accent }]}>.</Text>
    </Text>
  );
}

export function Logo({ showWordmark = true, compact = false }: { showWordmark?: boolean; compact?: boolean }) {
  return (
    <View style={[styles.logoWrap, compact && styles.compactLogo]}>
      <RebuildMark size={compact ? 28 : 36} />
      {showWordmark && (
        <View style={styles.wordmarkWrap}>
          <RebuildWordmark compact={compact} />
          {!compact && <Text style={typography.tagline}>Reutilizar. Conectar. Reconstruir.</Text>}
        </View>
      )}
    </View>
  );
}

export const BrandLogo = Logo;
export const RebuildLogo = Logo;

export function AppHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <View style={styles.headerCard}>
      <View style={styles.headerRow}>
        <Logo compact />
        {action}
      </View>
      <Text style={typography.h2}>{title}</Text>
      {subtitle ? <Text style={typography.bodyMuted}>{subtitle}</Text> : null}
    </View>
  );
}

export function PrimaryButton({ title, onPress, disabled = false, style }: { title: string; onPress?: () => void; disabled?: boolean; style?: ViewStyle }) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      disabled={disabled}
      style={[styles.primaryButton, style, disabled && styles.buttonDisabled]}
    >
      <Text style={styles.primaryButtonText}>{title}</Text>
    </TouchableOpacity>
  );
}

export function SecondaryButton({ title, onPress, style }: { title: string; onPress?: () => void; style?: ViewStyle }) {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[styles.secondaryButton, style]}>
      <Text style={styles.secondaryButtonText}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  logoWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  compactLogo: { gap: 8 },
  wordmarkWrap: { justifyContent: 'center' },
  compactWordmark: { fontSize: 22, lineHeight: 24 },
  wordmarkBase: { fontFamily: 'Sora_800ExtraBold', letterSpacing: -1.1 },
  wordmarkAccent: { fontFamily: 'Sora_800ExtraBold', letterSpacing: -0.8 },
  markWrap: { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.primary, position: 'relative', overflow: 'hidden' },
  stem: { position: 'absolute', borderRadius: 999, borderWidth: 1, borderColor: colors.primary },
  loop: { position: 'absolute', borderRadius: 999 },
  diag: { position: 'absolute', borderRadius: 999 },
  foot: { position: 'absolute', borderRadius: 999 },
  connector: { position: 'absolute', borderRadius: 999 },
  headerCard: { backgroundColor: colors.surface, borderRadius: 24, padding: 18, ...shadows.soft },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  primaryButton: { backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', ...shadows.soft },
  secondaryButton: { backgroundColor: colors.tertiary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: colors.white, fontSize: 15, fontWeight: '700', fontFamily: 'Sora_700Bold' },
  secondaryButtonText: { color: colors.text, fontSize: 15, fontWeight: '700', fontFamily: 'Sora_700Bold' },
  buttonDisabled: { opacity: 0.6 },
});
