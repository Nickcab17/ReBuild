import { Platform } from 'react-native';

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const sameOriginApi = Platform.OS === 'web' && process.env.NODE_ENV === 'production';
const API_URL = (sameOriginApi ? '' : configuredApiUrl || (Platform.OS === 'web' ? '' : 'http://localhost:3001')).replace(/\/$/, '');

export const isApiConfigured = Boolean(configuredApiUrl) || sameOriginApi || Platform.OS !== 'web';

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  city: string;
  role: string;
  createdAt: string;
}

export interface ApiSession {
  token: string;
  refreshToken: string;
  user: ApiUser;
}

export interface ApiMaterial {
  id: string;
  userId: string;
  name: string;
  type?: string;
  description: string;
  category: string;
  quantity: number;
  unit: string;
  condition: string;
  location: string;
  latitude?: number;
  longitude?: number;
  availability: string;
  photos: string[];
  createdAt: string;
  ownerName?: string;
}

export interface ApiRequest {
  id: string;
  userId: string;
  material: string;
  type?: string;
  category: string;
  quantity: number;
  unit: string;
  condition?: string;
  description: string;
  location: string;
  createdAt: string;
  ownerName?: string;
}

export interface ApiMatch {
  id: string;
  materialId: string;
  requestId: string;
  score: number;
  reason: string;
  material?: ApiMaterial;
  request?: ApiRequest;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!isApiConfigured) {
    throw new Error('La API no está configurada. Define EXPO_PUBLIC_API_URL para usar un backend remoto.');
  }
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
    throw new Error(`No se pudo conectar con ReBuild API${API_URL ? ` en ${API_URL}` : ''}. Verifica la disponibilidad del servicio.`);
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new ApiError(errorBody.message || 'Error en la solicitud.', response.status);
  }

  return response.json() as Promise<T>;
}

export const api = {
  health: () => request<{ ok: boolean; service: string }>(`/api/health`),
  register: (payload: { name: string; email: string; password: string; city?: string }) => request<ApiSession>('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload: { email: string; password: string }) => request<ApiSession>('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  refreshSession: (refreshToken: string) => request<ApiSession>('/api/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
  getMe: (token: string) => request<ApiUser>('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } }),
  listMaterials: async (params: Record<string, string | number | undefined> = {}) => {
    const query = Object.entries(params).filter(([, value]) => value !== undefined && value !== '').map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`).join('&');
    const payload = await request<unknown>(`/api/materials${query ? `?${query}` : ''}`);
    if (Array.isArray(payload)) return payload as ApiMaterial[];
    if (payload && typeof payload === 'object') {
      const collection = payload as { value?: unknown; data?: unknown };
      if (Array.isArray(collection.value)) return collection.value as ApiMaterial[];
      if (Array.isArray(collection.data)) return collection.data as ApiMaterial[];
    }
    throw new Error('La API devolvió un formato de materiales inválido.');
  },
  getMaterialById: (id: string) => request(`/api/materials/${id}`),
  listRequests: (token: string) => request<ApiRequest[]>('/api/requests', { headers: { Authorization: `Bearer ${token}` } }),
  getMatches: (token: string) => request<ApiMatch[]>('/api/matches', { headers: { Authorization: `Bearer ${token}` } }),
  getConversations: (token: string) => request('/api/conversations', { headers: { Authorization: `Bearer ${token}` } }),
  createConversation: (matchId: string, token: string) => request('/api/conversations', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ matchId }) }),
  getConversationMessages: (conversationId: string, token: string) => request(`/api/conversations/${encodeURIComponent(conversationId)}/messages`, { headers: { Authorization: `Bearer ${token}` } }),
  sendConversationMessage: (conversationId: string, text: string, token: string) => request(`/api/conversations/${encodeURIComponent(conversationId)}/messages`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ text }) }),
  createMaterial: (payload: Record<string, unknown>, token: string) => request<ApiMaterial>('/api/materials', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) }),
  createRequest: (payload: Record<string, unknown>, token: string) => request<ApiRequest>('/api/requests', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) }),
  classifyMaterial: (text: string) => request('/api/ai/classify-material', { method: 'POST', body: JSON.stringify({ text }) }),
  analyzeMaterialImage: (imageDataUrl: string) => request('/api/ai/analyze-material-image', { method: 'POST', body: JSON.stringify({ imageDataUrl }) }),
  getFavorites: (token: string) => request('/api/favorites', { headers: { Authorization: `Bearer ${token}` } }),
  addFavorite: (materialId: string, token: string) => request(`/api/favorites/${materialId}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }),
  removeFavorite: (materialId: string, token: string) => request(`/api/favorites/${materialId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }),
  showInterest: (materialId: string, token: string) => request(`/api/materials/${materialId}/interest`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }),
  me: (token: string) => request('/api/users/me', { headers: { Authorization: `Bearer ${token}` } }),
  updateProfile: (payload: any, token: string) => request('/api/users/me', { method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) }),
};
