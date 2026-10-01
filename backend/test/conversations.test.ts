import assert from 'node:assert/strict';
import test from 'node:test';
import { createConversationForMatch, getConversationMessages, listConversationsForUser, sendConversationMessage } from '../src/services/conversationService.js';
import { registerUser } from '../src/services/authService.js';
import { getStore } from '../src/utils/store.js';

test('match conversations persist messages and enforce participant access', async () => {
  const store = getStore();
  for (const collection of Object.values(store)) collection.clear();

  const nico = await registerUser({ name: 'Nico', email: 'nico-chat@test.dev', password: 'Nico200@', city: 'CDMX' });
  const ana = await registerUser({ name: 'Ana', email: 'ana-chat@test.dev', password: 'test1234', city: 'CDMX' });
  const outsider = await registerUser({ name: 'Carlos', email: 'carlos-chat@test.dev', password: 'test1234', city: 'CDMX' });
  const materialId = 'material-match';
  const requestId = 'request-match';
  const matchId = 'match-chat';
  store.materials.set(materialId, {
    id: materialId, userId: ana.user.id, name: 'Tablas de pino', description: 'Madera', category: 'Madera', quantity: 4,
    unit: 'tablas', condition: 'Buena', location: 'CDMX', availability: 'Disponible', photos: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  });
  store.requests.set(requestId, {
    id: requestId, userId: nico.user.id, material: 'madera', category: 'Madera', quantity: 2,
    unit: 'tablas', description: 'Busco madera', location: 'CDMX', neededBy: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  });
  store.matches.set(matchId, { id: matchId, materialId, requestId, score: 90, reason: 'Madera compatible', createdAt: new Date().toISOString() });

  const conversation = await createConversationForMatch(matchId, nico.user.id);
  assert.equal(conversation.otherUser.name, 'Ana');
  assert.equal(listConversationsForUser(nico.user.id)[0].lastMessage, null);
  await assert.rejects(() => getConversationMessages(conversation.id, outsider.user.id), /No tienes permiso/);

  const sent = await sendConversationMessage(conversation.id, nico.user.id, 'Hola, ¿siguen disponibles?');
  assert.equal(sent.senderId, nico.user.id);
  assert.equal(listConversationsForUser(ana.user.id)[0].unreadCount, 1);
  const received = await getConversationMessages(conversation.id, ana.user.id);
  assert.equal(received.messages[0].readBy.includes(ana.user.id), true);
  assert.equal(listConversationsForUser(ana.user.id)[0].unreadCount, 0);
  await assert.rejects(() => sendConversationMessage(conversation.id, outsider.user.id, 'No autorizado'), /No tienes permiso/);

  const reopened = await createConversationForMatch(matchId, ana.user.id);
  assert.equal(reopened.id, conversation.id);
});