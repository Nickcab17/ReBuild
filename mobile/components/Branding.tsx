import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from 'react-native';
import { colors, shadows, typography } from '../constants/theme';

export function RebuildMark({ size = 32, accent = colors.terracotta }: { size?: number; accent?: string }) {
  return (
    <View
      style={[styles.markWrap, { width: size, height: size, borderRadius: size * 0.24, backgroundColor: colors.forestDeep, borderColor: accent }]}
    >
      <View style={[styles.tileCorner, styles.cornerTopLeft, { width: size * 0.25, height: size * 0.25, borderColor: colors.cream }]} />
      <View style={[styles.tileCorner, styles.cornerTopRight, { width: size * 0.25, height: size * 0.25, borderColor: colors.sage }]} />
      <View style={[styles.tileCorner, styles.cornerBottomLeft, { width: size * 0.25, height: size * 0.25, borderColor: colors.sage }]} />
      <View style={[styles.tileCorner, styles.cornerBottomRight, { width: size * 0.25, height: size * 0.25, borderColor: colors.cream }]} />
      <View style={[styles.tileCore, { width: size * 0.31, height: size * 0.31, backgroundColor: accent, borderColor: colors.cream }]} />
      <View style={[styles.tileCoreInner, { width: size * 0.11, height: size * 0.11, backgroundColor: colors.forestDeep }]} />
    </View>
  );
}

export function RebuildWordmark({ compact = false, accent = colors.terracotta }: { compact?: boolean; accent?: string }) {
  return (
    <View style={styles.wordmarkStack}>
      <Text style={[typography.brandWordmark, styles.wordmarkOutline, compact && styles.compactWordmark]} accessibilityLabel="REBUILD">REBUILD</Text>
      <Text style={[typography.brandWordmark, styles.wordmarkFill, compact && styles.compactWordmark]}>REBUILD<Text style={[styles.wordmarkAccent, { color: accent }]}>·</Text></Text>
    </View>
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
  markWrap: { borderWidth: 2, position: 'relative', overflow: 'hidden' },
  tileCorner: { position: 'absolute', borderWidth: 2 },
  cornerTopLeft: { left: '18%', top: '18%', borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTopRight: { right: '18%', top: '18%', borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBottomLeft: { left: '18%', bottom: '18%', borderRightWidth: 0, borderTopWidth: 0 },
  cornerBottomRight: { right: '18%', bottom: '18%', borderLeftWidth: 0, borderTopWidth: 0 },
  tileCore: { position: 'absolute', alignSelf: 'center', top: '34%', transform: [{ rotate: '45deg' }], borderWidth: 1 },
  tileCoreInner: { position: 'absolute', alignSelf: 'center', top: '45%', transform: [{ rotate: '45deg' }] },
  wordmarkStack: { position: 'relative', justifyContent: 'center' },
  wordmarkOutline: { position: 'absolute', color: colors.terracotta, opacity: 0.48, transform: [{ translateX: 1 }, { translateY: 1 }] },
  wordmarkFill: { color: colors.forestDeep },
  headerCard: { backgroundColor: colors.surface, borderRadius: 24, padding: 18, ...shadows.soft },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  primaryButton: { backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', ...shadows.soft },
  secondaryButton: { backgroundColor: colors.tertiary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: colors.white, fontSize: 15, fontWeight: '700', fontFamily: 'Sora_700Bold' },
  secondaryButtonText: { color: colors.text, fontSize: 15, fontWeight: '700', fontFamily: 'Sora_700Bold' },
  buttonDisabled: { opacity: 0.6 },
});
