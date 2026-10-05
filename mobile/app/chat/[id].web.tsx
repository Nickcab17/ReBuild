import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, radius, typography } from '../../constants/theme';

interface DemoMessage {
  id: number;
  text: string;
  own: boolean;
  time: string;
}

function routeValue(value: string | string[] | undefined, fallback: string) {
  return typeof value === 'string' && value.length ? value : fallback;
}

export default function DemoChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; person?: string; material?: string }>();
  const person = routeValue(params.person, 'Comunidad ReBuild');
  const material = routeValue(params.material, 'material reutilizable');
  const scrollRef = useRef<ScrollView>(null);
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<DemoMessage[]>([
    { id: 1, text: `¡Hola! Me interesa ${material}. ¿Coordinamos?`, own: false, time: 'Ahora' },
  ]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const send = () => {
    const message = text.trim();
    if (!message) return;
    setMessages((current) => [...current, { id: Date.now(), text: message, own: true, time: 'Ahora' }]);
    setText('');
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <KeyboardAvoidingView style={styles.screen}>
      <View style={styles.topBar}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver a ReBuild" onPress={goBack} style={styles.backButton}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={styles.avatar}><Text style={styles.avatarText}>{person.slice(0, 1).toUpperCase()}</Text></View>
        <View style={styles.chatIdentity}>
          <Text numberOfLines={1} style={styles.personName}>{person}</Text>
          <Text numberOfLines={1} style={styles.materialName}>Coincidencia · {material}</Text>
        </View>
      </View>
      <ScrollView ref={scrollRef} style={styles.messages} contentContainerStyle={styles.messageContent}>
        {messages.map((message) => (
          <View key={message.id} style={[styles.messageRow, message.own ? styles.ownRow : styles.theirRow]}>
            <View style={[styles.bubble, message.own ? styles.ownBubble : styles.theirBubble]}>
              <Text style={[styles.messageText, message.own && styles.ownMessageText]}>{message.text}</Text>
              <Text style={[styles.messageTime, message.own && styles.ownMessageTime]}>{message.time}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={styles.composer}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Escribe un mensaje..."
          placeholderTextColor={colors.muted}
          multiline
          maxLength={1000}
          onSubmitEditing={send}
          style={styles.input}
        />
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Enviar mensaje" onPress={send} disabled={!text.trim()} style={[styles.sendButton, !text.trim() && styles.sendDisabled]}>
          <Text style={styles.sendText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, minHeight: '100%', backgroundColor: colors.background },
  topBar: { width: '100%', maxWidth: 860, alignSelf: 'center', minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  backButton: { width: 38, height: 42, justifyContent: 'center' },
  backArrow: { color: colors.primary, fontSize: 36, lineHeight: 40 },
  avatar: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: colors.accent },
  avatarText: { ...typography.label, color: colors.primary },
  chatIdentity: { flex: 1, minWidth: 0, marginLeft: 1 },
  personName: { ...typography.bodyBold },
  materialName: { ...typography.small, marginTop: 2 },
  messages: { flex: 1, width: '100%', maxWidth: 860, alignSelf: 'center' },
  messageContent: { paddingHorizontal: 16, paddingVertical: 18, flexGrow: 1, justifyContent: 'flex-end' },
  messageRow: { width: '100%', marginVertical: 4 },
  ownRow: { alignItems: 'flex-end' },
  theirRow: { alignItems: 'flex-start' },
  bubble: { maxWidth: '82%', minWidth: 72, paddingHorizontal: 13, paddingTop: 10, paddingBottom: 7, borderRadius: radius.md },
  ownBubble: { backgroundColor: colors.primary, borderBottomRightRadius: 5 },
  theirBubble: { backgroundColor: colors.surface, borderBottomLeftRadius: 5 },
  messageText: { ...typography.body, fontSize: 14 },
  ownMessageText: { color: colors.white },
  messageTime: { ...typography.small, fontSize: 10, alignSelf: 'flex-end', marginTop: 6 },
  ownMessageTime: { color: colors.sageLight },
  composer: { width: '100%', maxWidth: 860, alignSelf: 'center', flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12, backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  input: { flex: 1, maxHeight: 110, minHeight: 44, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 18, backgroundColor: colors.background, color: colors.text, fontFamily: 'Sora_400Regular', fontSize: 14 },
  sendButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  sendDisabled: { opacity: 0.45 },
  sendText: { color: colors.white, fontFamily: 'Sora_700Bold', fontSize: 23, lineHeight: 27 },
});
