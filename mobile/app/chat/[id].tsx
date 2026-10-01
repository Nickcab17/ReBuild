import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { colors, radius, typography } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import type { ChatMessage, ConversationItem } from '../../types';

type ThreadPayload = { conversation: ConversationItem; messages: ChatMessage[] };

export default function ChatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, user } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const [conversation, setConversation] = useState<ConversationItem | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!token || !id) { setLoading(false); return; }
    setLoading(true);
    try {
      const payload = await api.getConversationMessages(id, token) as ThreadPayload;
      setConversation(payload.conversation);
      setMessages(payload.messages);
    } catch (error) {
      Alert.alert('No se pudo abrir la conversación', error instanceof Error ? error.message : 'Intenta nuevamente.', [{ text: 'Volver', onPress: () => router.replace('/conectar') }]);
    } finally { setLoading(false); }
  }, [id, router, token]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  useEffect(() => {
    if (messages.length) requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, [messages]);

  const send = async () => {
    const messageText = text.trim();
    if (!token || !id || !conversation || !messageText || sending) return;
    setSending(true);
    try {
      const message = await api.sendConversationMessage(id, messageText, token) as ChatMessage;
      setMessages((current) => [...current, message]);
      setText('');
    } catch (error) {
      Alert.alert('No se pudo enviar el mensaje', error instanceof Error ? error.message : 'Intenta nuevamente.');
    } finally { setSending(false); }
  };

  const otherName = conversation?.otherUser.name ?? 'Conversación';
  const initials = otherName.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/conectar')} accessibilityRole="button" accessibilityLabel="Volver a conversaciones" style={styles.backButton}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        {conversation?.otherUser.avatar ? <Image source={{ uri: conversation.otherUser.avatar }} style={styles.avatar} /> : <View style={styles.avatarFallback}><Text style={styles.avatarInitials}>{initials}</Text></View>}
        <View style={styles.headerInfo}>
          <Text numberOfLines={1} style={styles.headerName}>{otherName}</Text>
          <Text numberOfLines={1} style={styles.headerMaterial}>{conversation?.material?.category ?? 'Rebuild'} · {conversation?.material?.name ?? 'Coincidencia'}</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messageContent}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {loading ? <Text style={styles.stateText}>Cargando mensajes...</Text> : messages.length === 0 ? <Text style={styles.stateText}>La coincidencia ya los conectó. Envía el primer mensaje cuando quieras.</Text> : null}
        {messages.map((message) => {
          const own = message.senderId === user?.id;
          return <View key={message.id} style={[styles.messageRow, own ? styles.ownRow : styles.theirRow]}><View style={[styles.bubble, own ? styles.ownBubble : styles.theirBubble]}><Text style={[styles.messageText, own && styles.ownMessageText]}>{message.text}</Text><Text style={[styles.messageTime, own && styles.ownMessageTime]}>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text></View></View>;
        })}
      </ScrollView>

      <View style={styles.composer}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Escribe un mensaje..."
          placeholderTextColor={colors.muted}
          multiline
          maxLength={2000}
          editable={!loading && !sending && Boolean(conversation)}
          onSubmitEditing={() => void send()}
          style={styles.input}
        />
        <TouchableOpacity onPress={() => void send()} disabled={!text.trim() || sending || loading || !conversation} accessibilityRole="button" accessibilityLabel="Enviar mensaje" style={[styles.sendButton, (!text.trim() || sending || loading || !conversation) && styles.sendDisabled]}>
          <Text style={styles.sendIcon}>{sending ? '…' : '↑'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { minHeight: 76, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  backButton: { width: 38, height: 42, justifyContent: 'center' },
  backArrow: { color: colors.primary, fontSize: 36, lineHeight: 40 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.accent },
  avatarFallback: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
  avatarInitials: { ...typography.label, color: colors.primary },
  headerInfo: { flex: 1, minWidth: 0, marginLeft: 11 },
  headerName: { ...typography.bodyBold },
  headerMaterial: { ...typography.small, marginTop: 2 },
  messages: { flex: 1 },
  messageContent: { paddingHorizontal: 16, paddingVertical: 18, flexGrow: 1, justifyContent: 'flex-end' },
  stateText: { ...typography.bodyMuted, textAlign: 'center', alignSelf: 'center', marginVertical: 20, maxWidth: 280 },
  messageRow: { width: '100%', marginVertical: 4 },
  ownRow: { alignItems: 'flex-end' },
  theirRow: { alignItems: 'flex-start' },
  bubble: { maxWidth: '82%', minWidth: 72, paddingHorizontal: 13, paddingTop: 10, paddingBottom: 7, borderRadius: radius.md },
  ownBubble: { backgroundColor: colors.primary, borderBottomRightRadius: 5 },
  theirBubble: { backgroundColor: colors.surface, borderBottomLeftRadius: 5 },
  messageText: { ...typography.body, fontSize: 14 },
  ownMessageText: { color: colors.white },
  messageTime: { ...typography.small, fontSize: 10, alignSelf: 'flex-end', marginTop: 4 },
  ownMessageTime: { color: colors.sageLight },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12, backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  input: { flex: 1, maxHeight: 110, minHeight: 44, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 18, backgroundColor: colors.background, color: colors.text, fontFamily: 'Sora_400Regular', fontSize: 14 },
  sendButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  sendDisabled: { opacity: 0.45 },
  sendIcon: { color: colors.white, fontFamily: 'Sora_700Bold', fontSize: 23, lineHeight: 27 },
});