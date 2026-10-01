import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { apiRouter } from '../src/routes/api.js';
import { getStore } from '../src/utils/store.js';

process.env.DEMO_USER_PASSWORD = 'Nico200@';
const { createDemoData } = await import('../src/seed.js');

test('Nico can connect from a match, exchange messages, and only participants can read', async () => {
  const store = getStore();
  for (const collection of Object.values(store)) collection.clear();

  await createDemoData();

  const app = express();
  app.use(express.json());
  app.use('/api', apiRouter);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No se pudo iniciar el servidor de prueba.');
  const baseUrl = `http://127.0.0.1:${address.port}/api`;
  const call = (path: string, method = 'GET', token?: string, body?: Record<string, unknown>) => fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  try {
    const nicoLoginResponse = await call('/auth/login', 'POST', undefined, { email: 'nicocg1707@gmail.com', password: 'Nico200@' });
    assert.equal(nicoLoginResponse.status, 200);
    const nicoSession = await nicoLoginResponse.json() as { token: string; user: { id: string; email: string } };
    assert.equal(nicoSession.user.email, 'nicocg1707@gmail.com');

    const anaLoginResponse = await call('/auth/login', 'POST', undefined, { email: 'ana@rebuild.dev', password: 'Nico200@' });
    const anaSession = await anaLoginResponse.json() as { token: string };
    const materialResponse = await call('/materials', 'POST', anaSession.token, {
      name: 'Tablas de pino', description: 'Tablas de madera disponibles', category: 'Madera', quantity: 5,
      unit: 'tablas', condition: 'Buena', location: 'Ciudad de México', availability: 'Disponible', photos: [],
    });
    assert.equal(materialResponse.status, 201);
    const material = await materialResponse.json() as { id: string; name: string };
    const requestResponse = await call('/requests', 'POST', nicoSession.token, {
      material: 'madera', category: 'Madera', quantity: 2, unit: 'tablas',
      description: 'Busco tablas para una repisa', location: 'Ciudad de México', neededBy: new Date().toISOString(),
    });
    assert.equal(requestResponse.status, 201);
    const request = await requestResponse.json() as { id: string; userId: string };

    const matchesResponse = await call('/matches', 'GET', nicoSession.token);
    const visibleMatches = await matchesResponse.json() as Array<{ id: string; materialId: string; material: { name: string }; request: { userId: string } }>;
    const visibleMatch = visibleMatches.find((item) => item.materialId === material.id);
    assert.ok(visibleMatch, 'The matching engine should connect Nico’s request to Ana’s material.');
    assert.equal(visibleMatch?.material.name, 'Tablas de pino');
    assert.equal(visibleMatch?.request.userId, nicoSession.user.id);

    const matchId = visibleMatch.id;
    assert.equal(visibleMatch.request.userId, request.userId);
    const openResponse = await call('/conversations', 'POST', nicoSession.token, { matchId });
    assert.equal(openResponse.status, 201);
    const conversation = await openResponse.json() as { id: string; otherUser: { name: string } };
    assert.equal(conversation.otherUser.name, 'Ana García');
    const emptyThread = await (await call(`/conversations/${conversation.id}/messages`, 'GET', nicoSession.token)).json() as { messages: unknown[] };
    assert.equal(emptyThread.messages.length, 0, 'Opening a match must not send an automatic message.');

    const nicoMessage = await call(`/conversations/${conversation.id}/messages`, 'POST', nicoSession.token, { text: 'Hola Ana, ¿siguen disponibles las tablas?' });
    assert.equal(nicoMessage.status, 201);
    const anaMessage = await call(`/conversations/${conversation.id}/messages`, 'POST', anaSession.token, { text: 'Sí, todavía las tengo.' });
    assert.equal(anaMessage.status, 201);

    const inbox = await (await call('/conversations', 'GET', nicoSession.token)).json() as Array<{ id: string; lastMessage: { text: string }; unreadCount: number }>;
    assert.equal(inbox[0].id, conversation.id);
    assert.equal(inbox[0].lastMessage.text, 'Sí, todavía las tengo.');
    assert.equal(inbox[0].unreadCount, 1);
    const reopened = await call('/conversations', 'POST', anaSession.token, { matchId });
    assert.equal((await reopened.json() as { id: string }).id, conversation.id);

    await call(`/conversations/${conversation.id}/messages`, 'GET', nicoSession.token);
    const readInbox = await (await call('/conversations', 'GET', nicoSession.token)).json() as Array<{ unreadCount: number }>;
    assert.equal(readInbox[0].unreadCount, 0);
    const outsiderLogin = await call('/auth/register', 'POST', undefined, { name: 'Carlos', email: 'chat-outsider@test.dev', password: 'outsider-pass', city: 'CDMX' });
    const outsiderSession = await outsiderLogin.json() as { token: string };
    const forbidden = await call(`/conversations/${conversation.id}/messages`, 'GET', outsiderSession.token);
    assert.equal(forbidden.status, 403);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});