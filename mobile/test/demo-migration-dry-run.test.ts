import assert from 'node:assert/strict';
import test from 'node:test';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from '../api/demo-migration-dry-run.js';

const targetUserId = '123e4567-e89b-42d3-a456-426614174000';
const targetUser = {
  id: targetUserId,
  email: 'nicocg170709@gmail.com',
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { name: 'Cuenta ReBuild' },
  created_at: '2024-01-01T00:00:00.000Z',
};

test('dry-run endpoint returns an authenticated, read-only per-publication preview', async () => {
  const originalUrl = process.env.SUPABASE_URL;
  const originalSecret = process.env.SUPABASE_SECRET_KEY;
  const originalFetch = globalThis.fetch;
  const methods: string[] = [];

  process.env.SUPABASE_URL = 'https://dry-run-test.supabase.co';
  process.env.SUPABASE_SECRET_KEY = 'test-only-secret';
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method ?? 'GET';
    methods.push(method.toUpperCase());

    if (url.pathname.endsWith('/auth/v1/user')) return Response.json(targetUser);
    if (url.pathname.endsWith('/auth/v1/admin/users')) {
      return Response.json({ users: [targetUser], aud: 'authenticated', total: 1, lastPage: 1 });
    }
    if (url.pathname.endsWith('/rest/v1/profiles')) return Response.json({ id: targetUserId });
    if (url.pathname.endsWith('/rest/v1/materials') || url.pathname.endsWith('/rest/v1/requests')) {
      return Response.json([]);
    }
    return new Response('Unexpected test request', { status: 500 });
  }) as typeof fetch;

  let statusCode = 0;
  let responseBody: unknown;
  const request = {
    url: '/api/demo-migration-dry-run',
    method: 'GET',
    headers: { host: 'rebuild-mobile.vercel.app', authorization: 'Bearer test-user-token' },
  } as VercelRequest;
  const response = {
    setHeader() { return this; },
    status(code: number) { statusCode = code; return this; },
    json(body: unknown) { responseBody = body; return this; },
    end() { return this; },
  } as unknown as VercelResponse;

  try {
    await handler(request, response);
    assert.equal(statusCode, 200);
    assert.ok(responseBody && typeof responseBody === 'object');
    const preview = responseBody as {
      account: { email: string; userId: string };
      offersFound: number;
      requestsFound: number;
      offersToInsert: number;
      offersSkipped: number;
      requestsToInsert: number;
      requestsSkipped: number;
      conflicts: number;
      publications: Array<{ demoId: string; type: string; name: string; status: string; reason: string; migrationId: string }>;
    };

    assert.deepEqual(preview.account, { email: 'nicocg170709@gmail.com', userId: targetUserId });
    assert.equal(preview.publications.length, 16);
    assert.equal(new Set(preview.publications.map(({ demoId }) => demoId)).size, 16);
    assert.equal(preview.offersFound, 8);
    assert.equal(preview.requestsFound, 8);
    assert.equal(preview.offersToInsert, 8);
    assert.equal(preview.offersSkipped, 0);
    assert.equal(preview.requestsToInsert, 8);
    assert.equal(preview.requestsSkipped, 0);
    assert.equal(preview.conflicts, 0);
    assert.ok(preview.publications.every(({ status, reason, migrationId, name }) =>
      status === 'insert' && reason.length > 0 && migrationId.length > 0 && name.length > 0));
    assert.deepEqual(new Set(preview.publications.map(({ type }) => type)), new Set(['offer', 'request']));
    assert.ok(methods.length > 0);
    assert.ok(methods.every((method) => method === 'GET'));
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = originalUrl;
    if (originalSecret === undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = originalSecret;
  }
});
