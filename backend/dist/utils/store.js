import { randomUUID } from 'crypto';
const inMemory = {
    users: new Map(),
    materials: new Map(),
    requests: new Map(),
    favorites: new Map(),
    matches: new Map(),
};
export function getStore() {
    return inMemory;
}
export function createId(prefix) {
    return `${prefix}_${randomUUID()}`;
}
export function normalizeEmail(value) {
    return value.trim().toLowerCase();
}
export function toIsoDate(value) {
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
