import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createMatchesForMaterial,
  createMatchesForRequest,
  type MaterialRow,
  type RequestRow,
} from '../api/[...path].js';

const ownerId = 'user-demo-owner';
const otherOwnerId = 'user-another-owner';

const material = (id: string, user_id: string): MaterialRow => ({
  id,
  user_id,
  name: 'Tablas de pino',
  type: 'Madera',
  description: 'Tablas de pino en buen estado disponibles.',
  category: 'Madera',
  quantity: 12,
  unit: 'tablas',
  condition: 'Buen estado',
  location: 'Roma Norte, CDMX',
  latitude: null,
  longitude: null,
  availability: 'Disponible',
  photos: [],
  created_at: '2026-10-06T00:00:00.000Z',
});

const request = (id: string, user_id: string): RequestRow => ({
  id,
  user_id,
  material: 'Tablas de pino',
  type: 'Madera',
  category: 'Madera',
  quantity: 6,
  unit: 'tablas',
  condition: 'Flexible',
  description: 'Busco tablas de pino para construir un mueble.',
  location: 'Roma Norte, CDMX',
  needed_by: '2026-10-20T00:00:00.000Z',
  created_at: '2026-10-06T00:00:00.000Z',
});

test('match creation excludes same-owner requests and materials', async () => {
  const originalUrl = process.env.SUPABASE_URL;
  const originalSecret = process.env.SUPABASE_SECRET_KEY;
  const originalFetch = globalThis.fetch;
  const writtenMatches: Array<Array<{ material_id: string; request_id: string }>> = [];

  process.env.SUPABASE_URL = 'https://matching-owner-test.supabase.co';
  process.env.SUPABASE_SECRET_KEY = 'test-only-secret';
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith('/rest/v1/matches')) {
      writtenMatches.push(JSON.parse(String(init?.body)) as Array<{ material_id: string; request_id: string }>);
      return new Response(null, { status: 204 });
    }

    if (url.pathname.endsWith('/rest/v1/requests')) {
      return Response.json([request('same-owner-request', ownerId), request('other-owner-request', otherOwnerId)]);
    }

    if (url.pathname.endsWith('/rest/v1/materials')) {
      return Response.json([material('same-owner-material', ownerId), material('other-owner-material', otherOwnerId)]);
    }

    return new Response('Unexpected test request', { status: 500 });
  }) as typeof fetch;

  try {
    await createMatchesForMaterial(material('source-material', ownerId));
    await createMatchesForRequest(request('source-request', ownerId));

    assert.equal(writtenMatches.length, 2);
    assert.deepEqual(writtenMatches[0].map(({ request_id }) => request_id), ['other-owner-request']);
    assert.deepEqual(writtenMatches[1].map(({ material_id }) => material_id), ['other-owner-material']);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = originalUrl;
    if (originalSecret === undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = originalSecret;
  }
});
