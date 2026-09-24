const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_URL}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
    });
  } catch {
    throw new Error(`No se pudo conectar con Rebuild API en ${API_URL}. Verifica que el backend esté activo y que EXPO_PUBLIC_API_URL use la IP de tu computadora.`);
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new ApiError(errorBody.message || 'Error en la solicitud.', response.status);
  }

  return response.json() as Promise<T>;
}

export const api = {
  health: () => request<{ ok: boolean; service: string }>(`/api/health`),
  register: (payload: any) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload: any) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  getMe: (token: string) => request('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } }),
  listMaterials: async (params: Record<string, string | number | undefined> = {}) => {
    const query = Object.entries(params).filter(([, value]) => value !== undefined && value !== '').map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`).join('&');
    const payload = await request<unknown>(`/api/materials${query ? `?${query}` : ''}`);
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === 'object') {
      const collection = payload as { value?: unknown; data?: unknown };
      if (Array.isArray(collection.value)) return collection.value;
      if (Array.isArray(collection.data)) return collection.data;
    }
    throw new Error('La API devolvió un formato de materiales inválido.');
  },
  getMaterialById: (id: string) => request(`/api/materials/${id}`),
  listRequests: (token: string) => request('/api/requests', { headers: { Authorization: `Bearer ${token}` } }),
  getMatches: (token: string) => request('/api/matches', { headers: { Authorization: `Bearer ${token}` } }),
  createMaterial: (payload: any, token: string) => request('/api/materials', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) }),
  createRequest: (payload: any, token: string) => request('/api/requests', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) }),
  classifyMaterial: (text: string) => request('/api/ai/classify-material', { method: 'POST', body: JSON.stringify({ text }) }),
  analyzeMaterialImage: (imageDataUrl: string) => request('/api/ai/analyze-material-image', { method: 'POST', body: JSON.stringify({ imageDataUrl }) }),
  getFavorites: (token: string) => request('/api/favorites', { headers: { Authorization: `Bearer ${token}` } }),
  addFavorite: (materialId: string, token: string) => request(`/api/favorites/${materialId}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }),
  removeFavorite: (materialId: string, token: string) => request(`/api/favorites/${materialId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }),
  showInterest: (materialId: string, token: string) => request(`/api/materials/${materialId}/interest`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }),
  me: (token: string) => request('/api/users/me', { headers: { Authorization: `Bearer ${token}` } }),
  updateProfile: (payload: any, token: string) => request('/api/users/me', { method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) }),
};
