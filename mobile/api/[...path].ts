import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ApiError, getAdminClient, getAuthClient, getProfile, requireUser } from './supabase.js';
import { findMaterialMatches } from './matching.js';

export interface MaterialRow {
  id: string;
  user_id: string;
  name: string;
  type: string | null;
  description: string;
  category: string;
  quantity: number;
  unit: string;
  condition: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  availability: string;
  photos: string[];
  created_at: string;
  owner?: { name: string } | { name: string }[] | null;
}

export interface RequestRow {
  id: string;
  user_id: string;
  material: string;
  type: string | null;
  category: string;
  quantity: number;
  unit: string;
  condition: string | null;
  description: string;
  location: string;
  needed_by: string;
  created_at: string;
  owner?: { name: string } | { name: string }[] | null;
}

function ownerName(row: { owner?: { name: string } | { name: string }[] | null }) {
  const owner = Array.isArray(row.owner) ? row.owner[0] : row.owner;
  return owner?.name ?? 'Comunidad ReBuild';
}

function mapMaterial(row: MaterialRow) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    type: row.type ?? undefined,
    description: row.description,
    category: row.category,
    quantity: Number(row.quantity),
    unit: row.unit,
    condition: row.condition,
    location: row.location,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    availability: row.availability,
    photos: row.photos ?? [],
    createdAt: row.created_at,
    ownerName: ownerName(row),
  };
}

function mapRequest(row: RequestRow) {
  return {
    id: row.id,
    userId: row.user_id,
    material: row.material,
    type: row.type ?? undefined,
    category: row.category,
    quantity: Number(row.quantity),
    unit: row.unit,
    condition: row.condition ?? undefined,
    description: row.description,
    location: row.location,
    neededBy: row.needed_by,
    createdAt: row.created_at,
    ownerName: ownerName(row),
  };
}

function readBody(request: VercelRequest) {
  if (!request.body || typeof request.body !== 'object' || Array.isArray(request.body)) return {};
  return request.body as Record<string, unknown>;
}

function requiredText(body: Record<string, unknown>, field: string) {
  const value = body[field];
  if (typeof value !== 'string' || !value.trim()) throw new ApiError(400, `El campo ${field} es obligatorio.`);
  return value.trim();
}

function requiredQuantity(body: Record<string, unknown>) {
  const quantity = Number(body.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) throw new ApiError(400, 'La cantidad debe ser mayor que cero.');
  return quantity;
}

function throwDatabaseError(error: { message: string; code?: string } | null, operation: string): asserts error is null {
  if (!error) return;
  console.error(`Supabase ${operation} failed`, error.code ?? 'unknown');
  throw new ApiError(500, 'No se pudo completar la operación. Intenta nuevamente.');
}

export async function createMatchesForMaterial(material: MaterialRow) {
  const { data, error } = await getAdminClient().from('requests').select('*');
  throwDatabaseError(error, 'requests query for matches');

  const pendingMatches = (data as RequestRow[]).map((request) => {
    const result = findMaterialMatches(
      `${material.name} ${material.description}`,
      `${request.material} ${request.description}`,
    );
    const score = Math.min(100, result.score + (material.location.toLowerCase() === request.location.toLowerCase() ? 8 : 0));
    if (!result.compatible && score < 60) return null;
    return {
      material_id: material.id,
      request_id: request.id,
      score,
      reason: `Coincidencia por ${result.matches.join(', ') || result.suggestedCategory}`,
    };
  }).filter((match): match is NonNullable<typeof match> => match !== null);

  if (!pendingMatches.length) return;
  const result = await getAdminClient().from('matches').upsert(pendingMatches, {
    onConflict: 'material_id,request_id',
    ignoreDuplicates: true,
  });
  throwDatabaseError(result.error, 'material matches write');
}

export async function createMatchesForRequest(request: RequestRow) {
  const { data, error } = await getAdminClient()
    .from('materials')
    .select('*')
    .eq('availability', 'Disponible');
  throwDatabaseError(error, 'materials query for matches');

  const pendingMatches = (data as MaterialRow[]).map((material) => {
    const result = findMaterialMatches(
      `${material.name} ${material.description} ${material.category}`,
      `${request.material} ${request.description} ${request.category}`,
    );
    const sameLocation = material.location.toLowerCase() === request.location.toLowerCase();
    const enoughQuantity = Number(material.quantity) >= Number(request.quantity);
    const score = Math.min(100, result.score + (enoughQuantity ? 8 : 0) + (sameLocation ? 8 : 0));
    if (!result.compatible && score < 60) return null;
    return {
      material_id: material.id,
      request_id: request.id,
      score,
      reason: `${result.matches.length ? `Coincide por ${result.matches.join(', ')}` : `Coincide por categoría ${request.category}`}${enoughQuantity ? ' y cantidad disponible' : ''}${sameLocation ? ' en la misma ubicación' : ''}`,
    };
  }).filter((match): match is NonNullable<typeof match> => match !== null);

  if (!pendingMatches.length) return;
  const result = await getAdminClient().from('matches').upsert(pendingMatches, {
    onConflict: 'material_id,request_id',
    ignoreDuplicates: true,
  });
  throwDatabaseError(result.error, 'request matches write');
}

async function createSession(userId: string, email: string, password: string) {
  const { data, error } = await getAuthClient().auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new ApiError(401, 'No se pudo iniciar la sesión de la cuenta.');
  const user = await getProfile(userId);
  return {
    token: data.session.access_token,
    refreshToken: data.session.refresh_token,
    user,
  };
}

async function handleRequest(request: VercelRequest, response: VercelResponse) {
  const url = new URL(request.url ?? '/', `https://${request.headers.host ?? 'localhost'}`);
  const route = url.pathname.replace(/^\/api\/?/, '').replace(/\/+$/, '');
  const method = request.method ?? 'GET';
  const body = readBody(request);

  if (method === 'OPTIONS') return response.status(204).end();
  if (route === 'health' && method === 'GET') return response.status(200).json({ ok: true, service: 'ReBuild API' });

  if (route === 'auth/register' && method === 'POST') {
    const name = requiredText(body, 'name');
    const email = requiredText(body, 'email').toLowerCase();
    const password = requiredText(body, 'password');
    if (password.length < 6) throw new ApiError(400, 'La contraseña debe tener al menos 6 caracteres.');
    const { data, error } = await getAdminClient().auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, city: typeof body.city === 'string' ? body.city.trim() : 'Ciudad de México' },
    });
    if (error || !data.user) {
      throw new ApiError(error?.status === 422 ? 409 : 400, error?.status === 422 ? 'El correo ya está registrado.' : 'No se pudo crear la cuenta.');
    }
    return response.status(201).json(await createSession(data.user.id, email, password));
  }

  if (route === 'auth/login' && method === 'POST') {
    const email = requiredText(body, 'email').toLowerCase();
    const password = requiredText(body, 'password');
    const { data, error } = await getAuthClient().auth.signInWithPassword({ email, password });
    if (error || !data.user || !data.session) throw new ApiError(401, 'Correo o contraseña incorrectos.');
    return response.status(200).json({
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: await getProfile(data.user.id),
    });
  }

  if (route === 'auth/refresh' && method === 'POST') {
    const refreshToken = requiredText(body, 'refreshToken');
    const { data, error } = await getAuthClient().auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.user || !data.session) throw new ApiError(401, 'La sesión expiró. Inicia sesión nuevamente.');
    return response.status(200).json({
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: await getProfile(data.user.id),
    });
  }

  if (route === 'auth/me' && method === 'GET') {
    const user = await requireUser(request);
    return response.status(200).json(await getProfile(user.id));
  }

  const db = getAdminClient();

  if (route === 'materials' && method === 'GET') {
    const { data, error } = await db
      .from('materials')
      .select('*, owner:profiles!materials_user_id_fkey(name)')
      .eq('availability', 'Disponible')
      .order('created_at', { ascending: false });
    throwDatabaseError(error, 'materials query');
    const query = (url.searchParams.get('q') ?? '').toLowerCase();
    const category = url.searchParams.get('category') ?? '';
    const condition = url.searchParams.get('condition') ?? '';
    const location = url.searchParams.get('location') ?? '';
    const materials = (data as MaterialRow[])
      .map(mapMaterial)
      .filter((material) => (!query || `${material.name} ${material.description} ${material.category} ${material.location}`.toLowerCase().includes(query))
        && (!category || category === 'Todos' || material.category === category)
        && (!condition || condition === 'Todos' || material.condition === condition)
        && (!location || location === 'Todas' || material.location.toLowerCase().includes(location.toLowerCase())));
    return response.status(200).json(materials);
  }

  if (route === 'materials' && method === 'POST') {
    const user = await requireUser(request);
    const payload = {
      user_id: user.id,
      name: requiredText(body, 'name'),
      type: typeof body.type === 'string' ? body.type.trim() : null,
      description: requiredText(body, 'description'),
      category: requiredText(body, 'category'),
      quantity: requiredQuantity(body),
      unit: requiredText(body, 'unit'),
      condition: requiredText(body, 'condition'),
      location: requiredText(body, 'location'),
      latitude: typeof body.latitude === 'number' ? body.latitude : null,
      longitude: typeof body.longitude === 'number' ? body.longitude : null,
      availability: 'Disponible',
      photos: [],
    };
    const { data, error } = await db.from('materials').insert(payload).select('*').single();
    throwDatabaseError(error, 'material insert');
    try {
      await createMatchesForMaterial(data as MaterialRow);
    } catch (error) {
      const rollback = await db.from('materials').delete().eq('id', data.id);
      if (rollback.error) console.error('Supabase material rollback failed', rollback.error.code ?? 'unknown');
      throw error;
    }
    return response.status(201).json(mapMaterial({ ...(data as MaterialRow), owner: { name: (await getProfile(user.id)).name } }));
  }

  if (route === 'requests' && method === 'GET') {
    const user = await requireUser(request);
    const { data, error } = await db
      .from('requests')
      .select('*, owner:profiles!requests_user_id_fkey(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    throwDatabaseError(error, 'requests query');
    return response.status(200).json((data as RequestRow[]).map(mapRequest));
  }

  if (route === 'requests' && method === 'POST') {
    const user = await requireUser(request);
    const payload = {
      user_id: user.id,
      material: requiredText(body, 'material'),
      type: typeof body.type === 'string' ? body.type.trim() : null,
      category: requiredText(body, 'category'),
      quantity: requiredQuantity(body),
      unit: requiredText(body, 'unit'),
      condition: typeof body.condition === 'string' ? body.condition.trim() : null,
      description: requiredText(body, 'description'),
      location: requiredText(body, 'location'),
      needed_by: typeof body.neededBy === 'string' ? body.neededBy : new Date().toISOString(),
    };
    const { data, error } = await db.from('requests').insert(payload).select('*').single();
    throwDatabaseError(error, 'request insert');
    try {
      await createMatchesForRequest(data as RequestRow);
    } catch (error) {
      const rollback = await db.from('requests').delete().eq('id', data.id);
      if (rollback.error) console.error('Supabase request rollback failed', rollback.error.code ?? 'unknown');
      throw error;
    }
    return response.status(201).json(mapRequest({ ...(data as RequestRow), owner: { name: (await getProfile(user.id)).name } }));
  }

  if (route === 'matches' && method === 'GET') {
    const user = await requireUser(request);
    const { data, error } = await db
      .from('matches')
      .select('id, material_id, request_id, score, reason, created_at, material:materials!matches_material_id_fkey(*, owner:profiles!materials_user_id_fkey(name)), request:requests!matches_request_id_fkey(*, owner:profiles!requests_user_id_fkey(name))');
    throwDatabaseError(error, 'matches query');
    const matches = (data as Array<{
      id: string;
      material_id: string;
      request_id: string;
      score: number;
      reason: string;
      material: MaterialRow | MaterialRow[];
      request: RequestRow | RequestRow[];
    }>).flatMap((row) => {
      const material = Array.isArray(row.material) ? row.material[0] : row.material;
      const materialRequest = Array.isArray(row.request) ? row.request[0] : row.request;
      if (!material || !materialRequest || (material.user_id !== user.id && materialRequest.user_id !== user.id)) return [];
      return [{
        id: row.id,
        materialId: row.material_id,
        requestId: row.request_id,
        score: row.score,
        reason: row.reason,
        material: mapMaterial(material),
        request: mapRequest(materialRequest),
      }];
    });
    return response.status(200).json(matches);
  }

  throw new ApiError(404, 'Ruta no encontrada.');
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  try {
    await handleRequest(request, response);
  } catch (error) {
    if (error instanceof ApiError) return response.status(error.status).json({ message: error.message });
    console.error('Vercel API request failed', error instanceof Error ? error.name : 'unknown error');
    return response.status(500).json({ message: 'Ocurrió un error al procesar la solicitud.' });
  }
}
