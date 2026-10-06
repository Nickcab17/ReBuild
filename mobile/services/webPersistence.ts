import type { DemoMatch, DemoPublication } from '../data/webDemo';
import { api, type ApiMatch, type ApiMaterial, type ApiRequest, type ApiUser } from './api';

export interface PersistedWebData {
  publications: DemoPublication[];
  myMatches: Array<{ source: DemoPublication; match: DemoMatch }>;
}

function toMaterialPublication(material: ApiMaterial): DemoPublication {
  return {
    id: material.id,
    intent: 'offer',
    material: material.name,
    category: material.category,
    type: material.type ?? '',
    quantity: material.quantity,
    unit: material.unit,
    condition: material.condition,
    location: material.location,
    owner: material.ownerName ?? 'Comunidad ReBuild',
    ownerId: material.userId,
    description: material.description,
    photoUri: material.photos.find((photo) => /^https?:\/\//i.test(photo)),
    latitude: material.latitude,
    longitude: material.longitude,
  };
}

function toRequestPublication(request: ApiRequest, user: ApiUser): DemoPublication {
  return {
    id: request.id,
    intent: 'need',
    material: request.material,
    category: request.category,
    type: request.type ?? '',
    quantity: request.quantity,
    unit: request.unit,
    condition: request.condition ?? '',
    location: request.location,
    owner: request.ownerName ?? (request.userId === user.id ? user.name : 'Comunidad ReBuild'),
    ownerId: request.userId,
    description: request.description,
  };
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase();
}

function toPersistedMatch(entry: ApiMatch, user: ApiUser) {
  const material = entry.material;
  const request = entry.request;
  if (!material || !request || !Number.isFinite(entry.score) || typeof entry.reason !== 'string') {
    throw new Error('La API devolvió una coincidencia incompleta.');
  }

  const offer = toMaterialPublication(material);
  const need = toRequestPublication(request, user);
  const source = material.userId === user.id ? offer : request.userId === user.id ? need : null;
  if (!source) return null;

  const candidate = source.intent === 'offer' ? need : offer;
  const unitsMatch = normalize(offer.unit) === normalize(need.unit);
  const enoughQuantity = unitsMatch && offer.quantity >= need.quantity;
  const locationMatches = normalize(offer.location) === normalize(need.location);
  const match: DemoMatch = {
    publication: candidate,
    score: entry.score,
    level: entry.score >= 80 ? 'Alta coincidencia' : 'Coincidencia parcial',
    criteria: {
      material: 'match',
      type: normalize(offer.type) === normalize(need.type) ? 'match' : 'mismatch',
      quantity: !unitsMatch ? 'mismatch' : enoughQuantity ? 'match' : 'partial',
      unit: unitsMatch ? 'match' : 'mismatch',
      condition: normalize(offer.condition) === normalize(need.condition) || normalize(need.condition) === 'flexible' ? 'match' : 'mismatch',
      location: locationMatches ? 'match' : 'mismatch',
    },
    reason: entry.reason,
  };
  return { source, match };
}

export async function loadPersistedWebData(token: string | null, user: ApiUser | null): Promise<PersistedWebData> {
  const [materials, requests, matches] = await Promise.all([
    api.listMaterials(),
    token && user ? api.listRequests(token) : Promise.resolve([]),
    token && user ? api.getMatches(token) : Promise.resolve([]),
  ]);

  const publications = [
    ...materials.map(toMaterialPublication),
    ...(token && user ? requests.map((request) => toRequestPublication(request, user)) : []),
  ];
  const myMatches = token && user
    ? matches.map((match) => toPersistedMatch(match, user)).filter((match): match is NonNullable<typeof match> => match !== null)
    : [];

  return { publications, myMatches };
}
