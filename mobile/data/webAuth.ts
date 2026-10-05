export interface DemoAccount {
  id: string;
  name: string;
  email: string;
  password: string;
}

export const WEB_DEMO_ACCOUNTS_STORAGE_KEY = 'rebuild.web.accounts';
export const WEB_DEMO_SESSION_STORAGE_KEY = 'rebuild.web.session';

function isDemoAccount(value: unknown): value is DemoAccount {
  if (!value || typeof value !== 'object') return false;
  const account = value as Partial<DemoAccount>;
  return typeof account.id === 'string'
    && typeof account.name === 'string'
    && typeof account.email === 'string'
    && typeof account.password === 'string';
}

export function readDemoAccounts(): DemoAccount[] {
  const raw = window.localStorage.getItem(WEB_DEMO_ACCOUNTS_STORAGE_KEY);
  if (!raw) return [];

  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || !parsed.every(isDemoAccount)) {
    throw new Error('Las cuentas guardadas no tienen un formato válido.');
  }

  return parsed;
}

export function readDemoSession(): string | null {
  return window.localStorage.getItem(WEB_DEMO_SESSION_STORAGE_KEY);
}

export function saveDemoSession(accountId: string) {
  window.localStorage.setItem(WEB_DEMO_SESSION_STORAGE_KEY, accountId);
}

export function clearDemoSession() {
  window.localStorage.removeItem(WEB_DEMO_SESSION_STORAGE_KEY);
}
