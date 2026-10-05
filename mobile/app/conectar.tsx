import { useCallback, useState } from 'react';
import { Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { AppHeader, PrimaryButton } from '../components/Branding';
import { EmptyState, LoadingState } from '../components/RebuildUI';
import { colors, radius, typography } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import type { ConversationItem } from '../types';

function relativeTime(value?: string) {
  if (!value) return '';
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  if (hours < 48) return 'Ayer';
  return new Date(value).toLocaleDateString();
}

export default function ConnectScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (pullToRefresh = false) => {
    if (!token) { setConversations([]); setLoading(false); return; }
    if (pullToRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await api.getConversations(token);
      setConversations(data as ConversationItem[]);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar tus conversaciones.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.primary} />}
    >
      <AppHeader title="Conversaciones" />
      {!token ? (
        <EmptyState title="Inicia sesión para conectar" message="Tus conversaciones aparecerán aquí." action={<PrimaryButton title="Iniciar sesión" onPress={() => router.push('/login')} style={styles.action} />} />
      ) : loading ? (
        <LoadingState message="Cargando conversaciones..." />
      ) : error ? (
        <EmptyState title="No pudimos cargar tus chats" message={error} action={<PrimaryButton title="Reintentar" onPress={() => void load()} style={styles.action} />} />
      ) : conversations.length === 0 ? (
        <EmptyState title="Aún no tienes conversaciones" message="Contacta desde una coincidencia." action={<PrimaryButton title="Ver coincidencias" onPress={() => router.push('/matches')} style={styles.action} />} />
      ) : (
        <View style={styles.list}>
          {conversations.map((conversation) => {
            const name = conversation.otherUser.name;
            const initials = name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase();
            return (
              <TouchableOpacity key={conversation.id} activeOpacity={0.82} style={styles.row} onPress={() => router.push({ pathname: '/chat/[id]', params: { id: conversation.id } })}>
                {conversation.otherUser.avatar ? <Image source={{ uri: conversation.otherUser.avatar }} style={styles.avatar} /> : <View style={styles.avatarFallback}><Text style={styles.avatarText}>{initials}</Text></View>}
                <View style={styles.rowBody}>
                  <View style={styles.nameLine}>
                    <Text numberOfLines={1} style={styles.name}>{name}</Text>
                    <Text style={styles.time}>{relativeTime(conversation.lastMessage?.createdAt ?? conversation.updatedAt)}</Text>
                  </View>
                  <Text numberOfLines={1} style={styles.preview}>{conversation.lastMessage?.text ?? 'Inicia la conversación'}</Text>
                  <View style={styles.metaLine}>
                    <Text numberOfLines={1} style={styles.material}>{conversation.material?.category ?? 'Coincidencia'} · {conversation.material?.name ?? 'Material relacionado'}</Text>
                    {(conversation.unreadCount ?? 0) > 0 ? <View style={styles.unread}><Text style={styles.unreadText}>{conversation.unreadCount}</Text></View> : null}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 36, flexGrow: 1 },
  list: { marginTop: 18, backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 88, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.accent },
  avatarFallback: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
  avatarText: { ...typography.label, color: colors.primary },
  rowBody: { flex: 1, marginLeft: 12, minWidth: 0 },
  nameLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { ...typography.bodyBold, flex: 1 },
  time: { ...typography.small, fontSize: 11 },
  preview: { ...typography.bodyMuted, fontSize: 13, marginTop: 3 },
  metaLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, gap: 8 },
  material: { ...typography.small, flex: 1 },
  unread: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  unreadText: { color: colors.white, fontFamily: 'Sora_700Bold', fontSize: 10 },
  action: { marginTop: 16, minWidth: 180 },
});