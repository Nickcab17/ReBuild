import { randomUUID } from 'crypto';
import type { Favorite, Match, Material, MaterialRequest, User } from '../types.js';

const inMemory = {
  users: new Map<string, User>(),
  materials: new Map<string, Material>(),
  requests: new Map<string, MaterialRequest>(),
  favorites: new Map<string, Favorite>(),
  matches: new Map<string, Match>(),
};

export function getStore() {
  return inMemory;
}

export function createId(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function toIsoDate(value?: string) {
  return new Date(value ?? Date.now()).toISOString();
}

export function getSeedData() {
  return {
    users: Array.from(inMemory.users.values()),
    materials: Array.from(inMemory.materials.values()),
    requests: Array.from(inMemory.requests.values()),
    favorites: Array.from(inMemory.favorites.values()),
    matches: Array.from(inMemory.matches.values()),
  };
}
