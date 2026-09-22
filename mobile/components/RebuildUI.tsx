import React from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from 'react-native';
import { Link } from 'expo-router';
import { colors, radius, shadows, typography } from '../constants/theme';
import type { Material } from '../types';

export function materialPlaceholder(label: string, accent: string = colors.primary) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="520" viewBox="0 0 800 520">
      <rect width="800" height="520" fill="#F5F1E8"/>
      <rect x="42" y="38" width="716" height="444" rx="32" fill="${accent}" opacity="0.12"/>
      <path d="M150 330 L400 130 L650 330" fill="none" stroke="${accent}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>
      <path d="M180 365 H620" stroke="${accent}" stroke-width="16" stroke-linecap="round" opacity="0.5"/>
      <circle cx="400" cy="240" r="62" fill="${accent}" opacity="0.18"/>
      <text x="400" y="280" font-family="Arial, sans-serif" font-size="36" font-weight="700" text-anchor="middle" fill="${colors.text}">${label}</text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function SectionHeader({ title, right, compact = false }: { title: string; right?: React.ReactNode; compact?: boolean }) {
  return (
    <View style={[styles.sectionHeader, compact && styles.sectionHeaderCompact]}>
      <Text style={[typography.h3, styles.sectionTitle]}>{title}</Text>
      {right}
    </View>
  );
}

export function LoadingState({ message = 'Cargando...' }: { message?: string }) {
  return (
    <View style={styles.stateBox}>
      <ActivityIndicator size="small" color={colors.primary} />
      <Text style={styles.stateText}>{message}</Text>
    </View>
  );
}

export function EmptyState({ title, message, action }: { title: string; message: string; action?: React.ReactNode }) {
  return (
    <View style={styles.emptyBox}>
      <View style={styles.emptyIcon}><Text style={styles.emptyIconText}>•</Text></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{message}</Text>
      {action}
    </View>
  );
}

export function CategoryChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function MaterialCard({ material, compact = false }: { material: Material; compact?: boolean }) {
  const imageUri = material.photos?.[0] || materialPlaceholder(material.name.slice(0, 14) || 'Rebuild', colors.terracotta);
  const cardStyle = StyleSheet.flatten([styles.materialCard, compact && styles.materialCardCompact]);

  return (
    <Link href={{ pathname: '/material/[id]', params: { id: material.id } }} asChild>
      <TouchableOpacity activeOpacity={0.9} style={cardStyle}>
        <Image source={{ uri: imageUri }} style={[styles.materialImage, compact && styles.materialImageCompact]} />
        <View style={styles.materialContent}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.materialName}>{material.name}</Text>
            <View style={styles.availabilityPill}>
              <Text style={styles.availabilityText}>{material.availability}</Text>
            </View>
          </View>
          <Text style={styles.materialMeta}>{material.category} · {material.condition}</Text>
          <Text style={styles.materialMeta}>{material.quantity} {material.unit} · {material.location}</Text>
          <Text numberOfLines={2} style={styles.materialDescription}>{material.description}</Text>
        </View>
      </TouchableOpacity>
    </Link>
  );
}

export function ShellCard({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.shellCard, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 12 },
  sectionHeaderCompact: { marginTop: 12 },
  sectionTitle: { fontSize: 20 },
  stateBox: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 20, alignItems: 'center', justifyContent: 'center', marginTop: 16, ...shadows.card },
  stateText: { color: colors.muted, marginTop: 10, textAlign: 'center' },
  emptyBox: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: 24, alignItems: 'center', marginTop: 18, ...shadows.card },
  emptyIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyIconText: { color: colors.primary, fontSize: 24, fontWeight: '800' },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center' },
  emptyText: { color: colors.muted, marginTop: 8, textAlign: 'center' },
  chip: { backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9, marginRight: 8, marginBottom: 8 },
  chipActive: { backgroundColor: colors.primary },
  chipText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: colors.white },
  materialCard: { backgroundColor: colors.surface, borderRadius: 22, overflow: 'hidden', marginBottom: 16, ...shadows.card },
  materialCardCompact: { marginBottom: 12 },
  materialImage: { width: '100%', height: 172 },
  materialImageCompact: { height: 148 },
  materialContent: { padding: 14 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  materialName: { fontSize: 18, fontWeight: '800', color: colors.text, flex: 1 },
  availabilityPill: { backgroundColor: colors.accent, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  availabilityText: { color: colors.primaryDark, fontSize: 11, fontWeight: '700' },
  materialMeta: { color: colors.muted, marginTop: 5, fontSize: 13 },
  materialDescription: { color: colors.text, marginTop: 8, fontSize: 14 },
  shellCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: 18, ...shadows.card },
});
