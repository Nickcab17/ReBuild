import assert from 'node:assert/strict';
import test from 'node:test';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from '../api/auth/[action].js';

async function callAuthRoute(path: string) {
  let statusCode = 0;
  let responseBody: unknown;
  const request = {
    url: path,
    method: 'POST',
    headers: { host: 'rebuild-mobile.vercel.app' },
    body: {},
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
  return { statusCode, responseBody };
}

test('auth route delegates empty registration payload to existing validation', async () => {
  const result = await callAuthRoute('/api/auth/register');
  assert.equal(result.statusCode, 400);
  assert.deepEqual(result.responseBody, { message: 'El campo name es obligatorio.' });
});

test('auth route delegates empty login payload to existing validation', async () => {
  const result = await callAuthRoute('/api/auth/login');
  assert.equal(result.statusCode, 400);
  assert.deepEqual(result.responseBody, { message: 'El campo email es obligatorio.' });
});
