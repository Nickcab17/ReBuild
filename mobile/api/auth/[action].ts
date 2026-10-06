import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from '../[...path].js';

export default function authHandler(request: VercelRequest, response: VercelResponse) {
  return handler(request, response);
}
