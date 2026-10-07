import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { VercelRequest } from '@vercel/node';

let adminClient: SupabaseClient | undefined;
let authClient: SupabaseClient | undefined;

function requiredEnvironment(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}.`);
  return value;
}

function clientOptions() {
  return { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } };
}

export function getAdminClient() {
  if (!adminClient) {
    adminClient = createClient(
      requiredEnvironment('SUPABASE_URL'),
      requiredEnvironment('SUPABASE_SECRET_KEY'),
      clientOptions(),
    );
  }
  return adminClient;
}

export function getAuthClient() {
  if (!authClient) {
    authClient = createClient(
      requiredEnvironment('SUPABASE_URL'),
      requiredEnvironment('SUPABASE_ANON_KEY'),
      clientOptions(),
    );
  }
  return authClient;
}

export function createRecoveryClient() {
  return createClient(
    requiredEnvironment('SUPABASE_URL'),
    requiredEnvironment('SUPABASE_ANON_KEY'),
    clientOptions(),
  );
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function requireUser(request: VercelRequest) {
  const authorization = request.headers.authorization;
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) throw new ApiError(401, 'Token de autenticación requerido.');

  const { data, error } = await getAdminClient().auth.getUser(token);
  if (error || !data.user) throw new ApiError(401, 'Token inválido o expirado.');
  return data.user;
}

export async function getProfile(userId: string) {
  const { data, error } = await getAdminClient()
    .from('profiles')
    .select('id, name, email, city, role, created_at')
    .eq('id', userId)
    .single();
  if (error) throw new ApiError(500, 'No se pudo cargar el perfil.');
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    city: data.city,
    role: data.role,
    createdAt: data.created_at,
  };
}
