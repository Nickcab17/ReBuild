import assert from 'node:assert/strict';
import test from 'node:test';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from '../api/[...path].js';

test('Vercel API health route is served without Supabase credentials', async () => {
  let statusCode = 0;
  let responseBody: unknown;
  const request = {
    url: '/api/health',
    method: 'GET',
    headers: { host: 'rebuild-mobile.vercel.app' },
  } as VercelRequest;
  const response = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(body: unknown) {
      responseBody = body;
      return this;
    },
    end() {
      return this;
    },
  } as unknown as VercelResponse;

  await handler(request, response);
  assert.equal(statusCode, 200);
  assert.deepEqual(responseBody, { ok: true, service: 'ReBuild API' });
});
