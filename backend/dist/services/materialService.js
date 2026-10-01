import { createId, getStore } from '../utils/store.js';
import { classifyMaterial, findMaterialMatches } from '../utils/ai.js';
import { persistItem, removeItem } from '../utils/dynamo.js';
function distanceInKm(latitudeA, longitudeA, latitudeB, longitudeB) {
    const earthRadius = 6371;
    const latitudeDelta = (latitudeB - latitudeA) * Math.PI / 180;
    const longitudeDelta = (longitudeB - longitudeA) * Math.PI / 180;
    const value = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(latitudeA * Math.PI / 180) * Math.cos(latitudeB * Math.PI / 180) * Math.sin(longitudeDelta / 2) ** 2;
    return earthRadius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}
export function listMaterials(filters) {
    const query = filters?.query?.trim().toLowerCase();
    const materials = Array.from(getStore().materials.values()).filter((material) => {
        if (material.availability !== 'Disponible')
            return false;
        if (query && ![material.name, material.description, material.category, material.location].join(' ').toLowerCase().includes(query))
            return false;
        if (filters?.category && filters.category !== 'Todos' && material.category !== filters.category)
            return false;
        if (filters?.condition && filters.condition !== 'Todos' && material.condition !== filters.condition)
            return false;
        if (filters?.location && filters.location !== 'Todas' && !material.location.toLowerCase().includes(filters.location.toLowerCase()))
            return false;
        if (filters?.latitude !== undefined && filters.longitude !== undefined && filters.radiusKm && material.latitude !== undefined && material.longitude !== undefined) {
            if (distanceInKm(filters.latitude, filters.longitude, material.latitude, material.longitude) > filters.radiusKm)
                return false;
        }
        return true;
    });
    return materials.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((material) => ({
        ...material,
        distanceKm: filters?.latitude !== undefined && filters.longitude !== undefined && material.latitude !== undefined && material.longitude !== undefined
            ? Math.round(distanceInKm(filters.latitude, filters.longitude, material.latitude, material.longitude) * 10) / 10
            : undefined,
    }));
}
export function getMaterial(materialId) {
    const material = getStore().materials.get(materialId);
    if (!material) {
        throw new Error('Material no encontrado.');
    }
    return material;
}
export function searchMaterials(query) {
    const q = query.toLowerCase();
    return Array.from(getStore().materials.values()).filter((material) => {
        const haystack = [material.name, material.description, material.category, material.location].join(' ').toLowerCase();
        return haystack.includes(q);
    });
}
export function createMaterial(input) {
    const material = {
        ...input,
        id: createId('mat'),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isFeatured: input.isFeatured ?? false,
        aiTags: classifyMaterial(`${input.name} ${input.description}`).keywords,
    };
    getStore().materials.set(material.id, material);
    persistItem('materials', material);
    return material;
}
export function updateMaterial(materialId, updates, userId) {
    const material = getStore().materials.get(materialId);
    if (!material)
        throw new Error('Material no encontrado.');
    if (material.userId !== userId)
        throw new Error('No tienes permiso para modificar este material.');
    const next = { ...material, ...updates, updatedAt: new Date().toISOString() };
    getStore().materials.set(materialId, next);
    persistItem('materials', next);
    return next;
}
export function deleteMaterial(materialId, userId) {
    const store = getStore();
    const material = store.materials.get(materialId);
    if (!material)
        throw new Error('Material no encontrado.');
    if (material.userId !== userId)
        throw new Error('No tienes permiso para eliminar este material.');
    store.materials.delete(materialId);
    removeItem('materials', materialId);
    return material;
}
export function listRequests() {
    return Array.from(getStore().requests.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function createRequest(input) {
    const request = {
        ...input,
        id: createId('req'),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    getStore().requests.set(request.id, request);
    persistItem('requests', request);
    return request;
}
export function findMatchesForRequest(requestId) {
    const request = getStore().requests.get(requestId);
    if (!request)
        throw new Error('Solicitud no encontrada.');
    const matches = [];
    for (const material of listMaterials()) {
        const result = findMaterialMatches(`${material.name} ${material.description} ${material.category}`, `${request.material} ${request.description} ${request.category}`);
        const sameLocation = material.location.toLowerCase() === request.location.toLowerCase();
        const enoughQuantity = material.quantity >= request.quantity;
        const score = Math.min(100, result.score + (enoughQuantity ? 8 : 0) + (sameLocation ? 8 : 0));
        if (!result.compatible && score < 60)
            continue;
        const match = {
            id: createId('match'),
            materialId: material.id,
            requestId: request.id,
            score,
            reason: `${result.matches.length ? `Coincide por ${result.matches.join(', ')}` : `Coincide por categoría ${request.category}`}${enoughQuantity ? ' y cantidad disponible' : ''}${sameLocation ? ' en la misma ubicación' : ''}`,
            createdAt: new Date().toISOString(),
        };
        matches.push(match);
        getStore().matches.set(match.id, match);
        persistItem('matches', match);
    }
    return matches;
}
export function listRequestsForUser(userId) {
    return listRequests().filter((request) => request.userId === userId);
}
export function listFavorites(userId) {
    return Array.from(getStore().favorites.values()).filter((favorite) => favorite.userId === userId);
}
export function addFavorite(userId, materialId) {
    const store = getStore();
    if (!store.materials.has(materialId))
        throw new Error('Material no encontrado.');
    const existing = Array.from(store.favorites.values()).find((favorite) => favorite.userId === userId && favorite.materialId === materialId);
    if (existing)
        return existing;
    const favorite = {
        id: createId('fav'),
        userId,
        materialId,
        createdAt: new Date().toISOString(),
    };
    store.favorites.set(favorite.id, favorite);
    persistItem('favorites', favorite);
    return favorite;
}
export function removeFavorite(userId, materialId) {
    const favorite = Array.from(getStore().favorites.values()).find((entry) => entry.userId === userId && entry.materialId === materialId);
    if (!favorite)
        return null;
    getStore().favorites.delete(favorite.id);
    removeItem('favorites', favorite.id);
    return favorite;
}
export function findMatchesForMaterial(materialId) {
    const material = getMaterial(materialId);
    const requests = listRequests();
    const matches = [];
    for (const request of requests) {
        const result = findMaterialMatches(`${material.name} ${material.description}`, `${request.material} ${request.description}`);
        const score = Math.min(100, result.score + (material.location.toLowerCase() === request.location.toLowerCase() ? 8 : 0));
        if (!result.compatible && score < 60)
            continue;
        const match = {
            id: createId('match'),
            materialId: material.id,
            requestId: request.id,
            score,
            reason: `Coincidencia por ${result.matches.join(', ') || result.suggestedCategory}`,
            createdAt: new Date().toISOString(),
        };
        matches.push(match);
        getStore().matches.set(match.id, match);
        persistItem('matches', match);
    }
    return matches;
}
export function getMatches() {
    return Array.from(getStore().matches.values());
}
export function getMatchesForUser(userId) {
    const requestIds = new Set(listRequestsForUser(userId).map((request) => request.id));
    const materialIds = new Set(Array.from(getStore().materials.values()).filter((material) => material.userId === userId).map((material) => material.id));
    return getMatches().filter((match) => requestIds.has(match.requestId) || materialIds.has(match.materialId));
}
export function classifyMaterialText(input) {
    return classifyMaterial(input);
}
