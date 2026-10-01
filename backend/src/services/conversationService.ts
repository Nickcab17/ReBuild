import { createId, getStore } from '../utils/store.js';
import { persistItemAndWait } from '../utils/dynamo.js';
import type { Conversation, Message } from '../types.js';

export class ConversationError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ConversationError';
    this.status = status;
  }
}

function assertParticipant(conversation: Conversation | undefined, userId: string) {
  if (!conversation) throw new ConversationError('Conversación no encontrada.', 404);
  if (!conversation.participantIds.includes(userId)) throw new ConversationError('No tienes permiso para acceder a esta conversación.', 403);
  return conversation;
}

function conversationDetail(conversation: Conversation, userId: string) {
  const store = getStore();
  const otherUserId = conversation.participantIds.find((participantId) => participantId !== userId);
  const otherUser = otherUserId ? store.users.get(otherUserId) : undefined;
  if (!otherUser) throw new ConversationError('No se encontró al otro participante.', 404);

  return {
    ...conversation,
    otherUser: { id: otherUser.id, name: otherUser.name, avatar: otherUser.avatar },
    material: store.materials.get(conversation.materialId),
  };
}

export async function createConversationForMatch(matchId: string, userId: string) {
  const store = getStore();
  const match = store.matches.get(matchId);
  if (!match) throw new ConversationError('Coincidencia no encontrada.', 404);

  const material = store.materials.get(match.materialId);
  const request = store.requests.get(match.requestId);
  if (!material || !request) throw new ConversationError('La coincidencia ya no está disponible.', 404);
  const participantIds = [...new Set([material.userId, request.userId])];
  if (participantIds.length !== 2) throw new ConversationError('No puedes iniciar una conversación contigo mismo.', 400);
  if (!participantIds.includes(userId)) throw new ConversationError('No tienes permiso para iniciar esta conversación.', 403);

  let conversation = Array.from(store.conversations.values()).find((item) => item.matchId === matchId);
  if (!conversation) {
    conversation = {
      id: createId('conversation'),
      participantIds,
      matchId,
      materialId: material.id,
      requestId: request.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.conversations.set(conversation.id, conversation);
    await persistItemAndWait('conversations', conversation as unknown as Record<string, unknown>);
  }

  return conversationDetail(conversation, userId);
}

export function listConversationsForUser(userId: string) {
  const store = getStore();
  return Array.from(store.conversations.values())
    .filter((conversation) => conversation.participantIds.includes(userId))
    .map((conversation) => {
      const detail = conversationDetail(conversation, userId);
      const messages = Array.from(store.messages.values())
        .filter((message) => message.conversationId === conversation.id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const lastMessage = messages[messages.length - 1] ?? null;
      const unreadCount = messages.filter((message) => message.senderId !== userId && !message.readBy.includes(userId)).length;
      return { ...detail, lastMessage, unreadCount };
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getConversationMessages(conversationId: string, userId: string) {
  const conversation = assertParticipant(getStore().conversations.get(conversationId), userId);
  const messages = Array.from(getStore().messages.values())
    .filter((message) => message.conversationId === conversationId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  for (const message of messages) {
    if (message.senderId === userId || message.readBy.includes(userId)) continue;
    const readMessage = { ...message, readBy: [...message.readBy, userId] };
    getStore().messages.set(readMessage.id, readMessage);
    await persistItemAndWait('messages', readMessage as unknown as Record<string, unknown>);
  }

  const updatedMessages = messages.map((message) => getStore().messages.get(message.id) ?? message);
  return { conversation: conversationDetail(conversation, userId), messages: updatedMessages };
}

export async function sendConversationMessage(conversationId: string, userId: string, text: string) {
  const conversation = assertParticipant(getStore().conversations.get(conversationId), userId);
  const normalizedText = text.trim();
  if (!normalizedText) throw new ConversationError('Escribe un mensaje antes de enviarlo.', 400);
  if (normalizedText.length > 2000) throw new ConversationError('El mensaje no puede superar 2000 caracteres.', 400);

  const message: Message = {
    id: createId('message'),
    conversationId,
    senderId: userId,
    text: normalizedText,
    createdAt: new Date().toISOString(),
    readBy: [userId],
  };
  const updatedConversation = { ...conversation, updatedAt: message.createdAt };
  getStore().messages.set(message.id, message);
  getStore().conversations.set(conversationId, updatedConversation);
  await Promise.all([
    persistItemAndWait('messages', message as unknown as Record<string, unknown>),
    persistItemAndWait('conversations', updatedConversation as unknown as Record<string, unknown>),
  ]);
  return message;
}