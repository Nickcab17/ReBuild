export interface WebAuthSession {
  token: string;
  refreshToken: string;
}

export const WEB_AUTH_TOKEN_STORAGE_KEY = 'rebuild.web.token';

export function readWebAuthSession(): WebAuthSession | null {
  const raw = window.localStorage.getItem(WEB_AUTH_TOKEN_STORAGE_KEY);
  if (!raw) return null;
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object') throw new Error('La sesión guardada no tiene un formato válido.');
  const session = parsed as Partial<WebAuthSession>;
  if (typeof session.token !== 'string' || typeof session.refreshToken !== 'string') {
    throw new Error('La sesión guardada no tiene un formato válido.');
  }
  return { token: session.token, refreshToken: session.refreshToken };
}

export function saveWebAuthToken(token: string, refreshToken: string) {
  window.localStorage.setItem(WEB_AUTH_TOKEN_STORAGE_KEY, JSON.stringify({ token, refreshToken }));
}

export function clearWebAuthToken() {
  window.localStorage.removeItem(WEB_AUTH_TOKEN_STORAGE_KEY);
}

export function clearLegacyDemoStorage(clearPublications = false) {
  window.localStorage.removeItem('rebuild.web.accounts');
  window.localStorage.removeItem('rebuild.web.session');
  if (clearPublications) window.localStorage.removeItem('rebuild.web.publications');
}
