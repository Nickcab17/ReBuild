import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { apiRouter } from '../src/routes/api.js';
import { getStore } from '../src/utils/store.js';

test('registered web accounts persist API publications and matches across users', async () => {
  const store = getStore();
  for (const collection of Object.values(store)) collection.clear();

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
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer '.concat(token) } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  try {
    const register = async (name: string, email: string) => {
      const response = await call('/auth/register', 'POST', undefined, { name, email, password: 'test-password' });
      assert.equal(response.status, 201);
      const session = await response.json() as { token: string; user: { id: string; email: string } };
      assert.equal(session.user.email, email);
      return session;
    };
    const userA = await register('Usuario A', 'web-a@example.test');
    const userB = await register('Usuario B', 'web-b@example.test');

    const earlierNeedResponse = await call('/requests', 'POST', userB.token, {
      material: 'blocks de concreto',
      type: 'Concreto',
      category: 'Construcción',
      quantity: 10,
      unit: 'blocks',
      condition: 'Buena',
      description: 'Necesito blocks de concreto para una obra pequeña.',
      location: 'CDMX',
      neededBy: new Date().toISOString(),
    });
    assert.equal(earlierNeedResponse.status, 201);
    const earlierNeed = await earlierNeedResponse.json() as { id: string };

    const offerResponse = await call('/materials', 'POST', userA.token, {
      name: '20 blocks de concreto',
      type: 'Concreto',
      description: '20 blocks de concreto, buen estado, CDMX',
      category: 'Construcción',
      quantity: 20,
      unit: 'blocks',
      condition: 'Buena',
      location: 'CDMX',
      availability: 'Disponible',
      photos: [],
    });
    assert.equal(offerResponse.status, 201);
    const offer = await offerResponse.json() as { id: string; userId: string };
    assert.equal(offer.userId, userA.user.id);

    const earlierMatchResponse = await call('/matches', 'GET', userB.token);
    const earlierMatches = await earlierMatchResponse.json() as Array<{ materialId: string; requestId: string }>;
    assert.ok(earlierMatches.some((candidate) => candidate.materialId === offer.id && candidate.requestId === earlierNeed.id));

    const needResponse = await call('/requests', 'POST', userB.token, {
      material: 'blocks de concreto',
      type: 'Concreto',
      category: 'Construcción',
      quantity: 10,
      unit: 'blocks',
      condition: 'Buena',
      description: 'Necesito blocks de concreto para una obra pequeña.',
      location: 'CDMX',
      neededBy: new Date().toISOString(),
    });
    assert.equal(needResponse.status, 201);
    const need = await needResponse.json() as { id: string; userId: string; condition: string };
    assert.equal(need.userId, userB.user.id);
    assert.equal(need.condition, 'Buena');

    const matchResponse = await call('/matches', 'GET', userB.token);
    assert.equal(matchResponse.status, 200);
    const matches = await matchResponse.json() as Array<{
      materialId: string;
      requestId: string;
      score: number;
      material: { name: string; ownerName: string };
      request: { condition: string; ownerName: string };
    }>;
    const match = matches.find((candidate) => candidate.materialId === offer.id && candidate.requestId === need.id);
    assert.ok(match, 'User B should see User A’s persisted material match.');
    assert.equal(match.material.name, '20 blocks de concreto');
    assert.equal(match.material.ownerName, 'Usuario A');
    assert.equal(match.request.condition, 'Buena');
    assert.equal(match.request.ownerName, 'Usuario B');
    assert.ok(Number.isFinite(match.score));

    const ownNeeds = await call('/requests', 'GET', userB.token);
    assert.ok((await ownNeeds.json() as Array<{ id: string }>).some((request) => request.id === need.id));
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    for (const collection of Object.values(store)) collection.clear();
  }
});
