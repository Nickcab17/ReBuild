import type { VercelRequest, VercelResponse } from '@vercel/node';
import { previewDemoMigration, TARGET_EMAIL } from '../scripts/migrate-demo-to-supabase.js';
import { ApiError, requireUser } from './supabase.js';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ message: 'Método no permitido.' });
  }

  try {
    const user = await requireUser(request);
    if (user.email?.toLowerCase() !== TARGET_EMAIL.toLowerCase()) {
      throw new ApiError(403, 'No tienes permiso para ejecutar esta consulta.');
    }

    response.setHeader('Cache-Control', 'no-store');
    const preview = await previewDemoMigration();
    return response.status(200).json(preview);
  } catch (error) {
    if (error instanceof ApiError) return response.status(error.status).json({ message: error.message });
    console.error('Demo migration dry-run failed', error instanceof Error ? error.name : 'unknown error');
    return response.status(500).json({ message: 'No se pudo generar la simulación de migración.' });
  }
}
