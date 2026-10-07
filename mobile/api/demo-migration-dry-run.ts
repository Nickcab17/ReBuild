import type { VercelRequest, VercelResponse } from '@vercel/node';
import { previewDemoMigration, TARGET_EMAIL } from '../scripts/migrate-demo-to-supabase.js';
import { ApiError, requireUser } from './supabase.js';

function redactDiagnosticText(value: string) {
  let safeValue = value;
  for (const variableName of ['SUPABASE_SECRET_KEY', 'SUPABASE_ANON_KEY']) {
    const secret = process.env[variableName];
    if (secret && secret.length >= 8) safeValue = safeValue.split(secret).join('[REDACTED]');
  }
  return safeValue
    .replace(/\bBearer\s+[^\s]+/gi, 'Bearer [REDACTED]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[REDACTED_TOKEN]')
    .replace(/(authorization|cookie|set-cookie|apikey|api_key|access_token|refresh_token|password|secret_key)(\s*[:=]\s*)[^\s,;]+/gi, '$1$2[REDACTED]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[EMAIL]');
}

function diagnosticError(error: unknown) {
  const details = error && typeof error === 'object'
    ? error as { name?: unknown; message?: unknown; code?: unknown; status?: unknown; stack?: unknown }
    : undefined;
  const name = error instanceof Error
    ? error.name
    : typeof details?.name === 'string' ? details.name : 'NonErrorThrown';
  const message = error instanceof Error
    ? error.message
    : typeof details?.message === 'string' ? details.message : String(error);
  const stack = error instanceof Error ? error.stack : details?.stack;
  return {
    name: redactDiagnosticText(name),
    message: redactDiagnosticText(message),
    ...(typeof details?.code === 'string' || typeof details?.code === 'number'
      ? { code: redactDiagnosticText(String(details.code)) }
      : {}),
    ...(typeof details?.status === 'string' || typeof details?.status === 'number'
      ? { status: redactDiagnosticText(String(details.status)) }
      : {}),
    ...(typeof stack === 'string' && stack ? { stack: redactDiagnosticText(stack) } : {}),
  };
}

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
    console.error(JSON.stringify({
      event: 'demo_migration_dry_run_failed',
      error: diagnosticError(error),
    }));
    if (error instanceof ApiError) return response.status(error.status).json({ message: error.message });
    return response.status(500).json({ message: 'No se pudo generar la simulación de migración.' });
  }
}
