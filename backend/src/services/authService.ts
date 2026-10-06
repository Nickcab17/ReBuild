import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createId, getStore, normalizeEmail } from '../utils/store.js';
import { config } from '../config.js';
import type { User } from '../types.js';
import { persistItem } from '../utils/dynamo.js';

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  city: string;
}) {
  const store = getStore();
  const email = normalizeEmail(input.email);

  if (!input.name || !email || !input.password) {
    throw new Error('Faltan datos obligatorios.');
  }

  if (store.users.size > 0 && Array.from(store.users.values()).some((user) => user.email === email)) {
    throw new Error('El correo ya está registrado.');
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user: User = {
    id: createId('user'),
    name: input.name,
    email,
    passwordHash,
    city: input.city.trim(),
    role: 'user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await persistItem('users', user as unknown as Record<string, unknown>);
  store.users.set(user.id, user);

  const token = jwt.sign({ userId: user.id, email: user.email }, config.jwtSecret, { expiresIn: '7d' });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      city: user.city,
      role: user.role,
      createdAt: user.createdAt,
    },
  };
}

export async function loginUser(input: { email: string; password: string }) {
  const store = getStore();
  const email = normalizeEmail(input.email);

  const user = Array.from(store.users.values()).find((item) => item.email === email);
  if (!user) {
    throw new Error('Credenciales inválidas.');
  }

  const isValid = await bcrypt.compare(input.password, user.passwordHash);
  if (!isValid) {
    throw new Error('Credenciales inválidas.');
  }

  const token = jwt.sign({ userId: user.id, email: user.email }, config.jwtSecret, { expiresIn: '7d' });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      city: user.city,
      role: user.role,
      createdAt: user.createdAt,
    },
  };
}

export function getCurrentUser(userId: string) {
  const user = getStore().users.get(userId);
  if (!user) {
    throw new Error('Usuario no encontrado.');
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    city: user.city,
    role: user.role,
    createdAt: user.createdAt,
  };
}
