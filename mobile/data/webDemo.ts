import { demoMaterials, demoRequests, demoUsers } from './demoData';

export type PublicationIntent = 'offer' | 'need';

export interface DemoPublication {
  id: string;
  intent: PublicationIntent;
  material: string;
  type: string;
  quantity: number;
  unit: string;
  condition: string;
  location: string;
  owner: string;
  ownerId?: string;
  description: string;
  photoUri?: string;
  latitude?: number;
  longitude?: number;
}

export interface DemoMatch {
  publication: DemoPublication;
  score: number;
  level: 'Alta coincidencia' | 'Coincidencia parcial';
  criteria: {
    material: 'match';
    type: 'match' | 'mismatch';
    quantity: 'match' | 'partial' | 'mismatch';
    unit: 'match' | 'mismatch';
    condition: 'match' | 'mismatch';
    location: 'match' | 'mismatch';
  };
  reason: string;
}

export const WEB_DEMO_PUBLICATIONS_STORAGE_KEY = 'rebuild.web.publications';

export function readSavedDemoPublications() {
  const raw = window.localStorage.getItem(WEB_DEMO_PUBLICATIONS_STORAGE_KEY);
  if (!raw) return [];

  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('Los datos de publicaciones guardados no tienen un formato válido.');

  return parsed.filter((value): value is DemoPublication => {
    if (!value || typeof value !== 'object') return false;
    const publication = value as Partial<DemoPublication>;
    const photoIsValid = publication.photoUri === undefined
      || (typeof publication.photoUri === 'string' && /^data:image\/(?:jpeg|png|webp);base64,/i.test(publication.photoUri));
    return typeof publication.id === 'string'
      && (publication.intent === 'offer' || publication.intent === 'need')
      && typeof publication.material === 'string'
      && typeof publication.type === 'string'
      && typeof publication.quantity === 'number'
      && Number.isFinite(publication.quantity)
      && publication.quantity > 0
      && typeof publication.unit === 'string'
      && typeof publication.condition === 'string'
      && typeof publication.location === 'string'
      && typeof publication.owner === 'string'
      && typeof publication.description === 'string'
      && photoIsValid;
  });
}

const categoryType: Record<string, string> = {
  Madera: 'Madera',
  Pintura: 'Pintura',
  Herramientas: 'Herramientas',
  Plástico: 'Tubería',
  Metal: 'Metal',
  'Material eléctrico': 'Material eléctrico',
};

const locationCoordinates: Array<{ match: string; latitude: number; longitude: number }> = [
  { match: 'roma norte', latitude: 19.4201, longitude: -99.1602 },
  { match: 'condesa', latitude: 19.4106, longitude: -99.175 },
  { match: 'san jeronimo', latitude: 19.4371, longitude: -99.1962 },
  { match: 'coyoacan', latitude: 19.3477, longitude: -99.162 },
  { match: 'iztapalapa', latitude: 19.3574, longitude: -99.092 },
  { match: 'guadalajara', latitude: 20.6736, longitude: -103.405 },
  { match: 'monterrey', latitude: 25.6866, longitude: -100.3161 },
  { match: 'ciudad de mexico', latitude: 19.4326, longitude: -99.1332 },
  { match: 'cdmx', latitude: 19.4326, longitude: -99.1332 },
];

export function coordinatesForLocation(location: string, id = location) {
  const normalized = normalize(location);
  const center = locationCoordinates.find(({ match }) => normalized.includes(match))
    ?? { match: '', latitude: 19.4326, longitude: -99.1332 };
  let hash = 0;
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  const offset = ((Math.abs(hash) % 17) - 8) * 0.00035;
  return { latitude: center.latitude + offset, longitude: center.longitude - offset };
}

function getMaterialType(name: string, category: string) {
  const normalizedName = name.toLowerCase();
  if (/azulejo|loseta|baldosa|porcelanato/.test(normalizedName)) return 'Cerámico';
  if (/ladrillo|tabique/.test(normalizedName)) return 'Ladrillo';
  return categoryType[category] ?? category;
}

const seededOffers: DemoPublication[] = demoMaterials
  .filter((material) => material.availability === 'Disponible')
  .map((material) => ({
    id: material.id,
    intent: 'offer',
    material: material.name,
    type: getMaterialType(material.name, material.category),
    quantity: material.quantity,
    unit: material.unit,
    condition: material.condition,
    location: material.location,
    owner: demoUsers.find((user) => user.id === material.userId)?.name ?? 'Comunidad ReBuild',
    description: material.description,
    latitude: material.latitude,
    longitude: material.longitude,
  }));

const seededNeeds: DemoPublication[] = demoRequests.map((request) => ({
  id: request.id,
  intent: 'need',
  material: request.material,
  type: getMaterialType(request.material, request.category),
  quantity: request.quantity,
  unit: request.unit,
  condition: 'Flexible',
  location: request.location,
  owner: demoUsers.find((user) => user.id === request.userId)?.name ?? 'Comunidad ReBuild',
  description: request.description,
  ...coordinatesForLocation(request.location, request.id),
}));

export const webDemoPublications: DemoPublication[] = [
  ...seededOffers,
  ...seededNeeds,
  {
    id: 'web-azulejo-01',
    intent: 'offer',
    material: 'Azulejo cerámico',
    type: 'Cerámico',
    quantity: 18,
    unit: 'm²',
    condition: 'Excelente',
    location: 'Roma Norte, Ciudad de México',
    owner: 'Ana García',
    description: 'Azulejo sobrante de una remodelación, limpio y listo para instalar.',
    ...coordinatesForLocation('Roma Norte, Ciudad de México', 'web-azulejo-01'),
  },
  {
    id: 'web-azulejo-02',
    intent: 'offer',
    material: 'Loseta y azulejo',
    type: 'Cerámico',
    quantity: 9,
    unit: 'm²',
    condition: 'Buen estado',
    location: 'Coyoacán, Ciudad de México',
    owner: 'Mariana López',
    description: 'Piezas de loseta en buen estado; ideal para completar un baño.',
    ...coordinatesForLocation('Coyoacán, Ciudad de México', 'web-azulejo-02'),
  },
  {
    id: 'web-azulejo-03',
    intent: 'offer',
    material: 'Azulejo para baño',
    type: 'Cerámico',
    quantity: 24,
    unit: 'm²',
    condition: 'Usada',
    location: 'Iztapalapa, Ciudad de México',
    owner: 'Jorge Martínez',
    description: 'Azulejo recuperado de una obra. Hay piezas completas y algunas sueltas.',
    ...coordinatesForLocation('Iztapalapa, Ciudad de México', 'web-azulejo-03'),
  },
  {
    id: 'web-azulejo-04',
    intent: 'need',
    material: 'Azulejo cerámico',
    type: 'Cerámico',
    quantity: 10,
    unit: 'm²',
    condition: 'Flexible',
    location: 'Coyoacán, Ciudad de México',
    owner: 'Sofía Ruiz',
    description: 'Busco azulejo para terminar la remodelación de una cocina.',
    ...coordinatesForLocation('Coyoacán, Ciudad de México', 'web-azulejo-04'),
  },
  {
    id: 'web-azulejo-05',
    intent: 'need',
    material: 'Loseta cerámica',
    type: 'Cerámico',
    quantity: 6,
    unit: 'm²',
    condition: 'Flexible',
    location: 'Roma Norte, Ciudad de México',
    owner: 'Diego Hernández',
    description: 'Necesito loseta para reparar una parte del piso.',
    ...coordinatesForLocation('Roma Norte, Ciudad de México', 'web-azulejo-05'),
  },
  {
    id: 'web-azulejo-06',
    intent: 'need',
    material: 'Azulejo para cocina',
    type: 'Cerámico',
    quantity: 14,
    unit: 'm²',
    condition: 'Flexible',
    location: 'Iztapalapa, Ciudad de México',
    owner: 'Valeria Cruz',
    description: 'Busco azulejo para una cocina en remodelación.',
    ...coordinatesForLocation('Iztapalapa, Ciudad de México', 'web-azulejo-06'),
  },
  {
    id: 'web-wood-01',
    intent: 'need',
    material: 'Tablas de pino',
    type: 'Madera',
    quantity: 6,
    unit: 'tablas',
    condition: 'Flexible',
    location: 'Roma Norte, Ciudad de México',
    owner: 'Ana García',
    description: 'Madera para construir un mueble pequeño.',
    ...coordinatesForLocation('Roma Norte, Ciudad de México', 'web-wood-01'),
  },
  {
    id: 'web-brick-01',
    intent: 'need',
    material: 'Ladrillos reutilizables',
    type: 'Construcción',
    quantity: 20,
    unit: 'piezas',
    condition: 'Flexible',
    location: 'Condesa, Ciudad de México',
    owner: 'Luis Ortega',
    description: 'Ladrillos para un proyecto de jardinería.',
    ...coordinatesForLocation('Condesa, Ciudad de México', 'web-brick-01'),
  },
  {
    id: 'web-paint-01',
    intent: 'need',
    material: 'Pintura blanca',
    type: 'Pintura',
    quantity: 2,
    unit: 'botes',
    condition: 'Flexible',
    location: 'San Jerónimo, Ciudad de México',
    owner: 'Sofía Ruiz',
    description: 'Pintura para retocar una habitación.',
    ...coordinatesForLocation('San Jerónimo, Ciudad de México', 'web-paint-01'),
  },
];

const aliases: Array<[string, string[]]> = [
  ['ceramico', ['azulejo', 'azulejos', 'loseta', 'losetas', 'baldosa', 'porcelanato', 'ceramico']],
  ['madera', ['madera', 'tabla', 'tablas', 'pino', 'triplay', 'melamina']],
  ['ladrillo', ['ladrillo', 'ladrillos', 'tabique', 'tabiques']],
  ['pintura', ['pintura', 'barniz', 'esmalte', 'laca']],
  ['tuberia', ['tuberia', 'tubo', 'tubos', 'pvc']],
  ['cemento', ['cemento', 'mortero', 'concreto']],
  ['herramientas', ['herramienta', 'taladro', 'martillo', 'sierra', 'broca']],
  ['metal', ['metal', 'acero', 'hierro', 'perfil']],
  ['electrico', ['electrico', 'cable', 'cables']],
];

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeUnit(value: string) {
  const unit = normalize(value.replace(/²/g, '2'));
  if (['m2', 'metro cuadrado', 'metros cuadrados'].includes(unit)) return 'm2';
  if (['pza', 'pzas', 'pieza', 'piezas'].includes(unit)) return 'pieza';
  if (['tabla', 'tablas'].includes(unit)) return 'tabla';
  if (['bote', 'botes'].includes(unit)) return 'bote';
  if (['set', 'sets'].includes(unit)) return 'set';
  return unit;
}

function materialKey(publication: Pick<DemoPublication, 'material' | 'type' | 'description'>) {
  const keyFor = (value: string) => {
    const text = normalize(value);
    return aliases.find(([, words]) => words.some((word) => text.includes(word)))?.[0] ?? null;
  };
  return keyFor(publication.material) ?? keyFor(publication.type) ?? keyFor(publication.description);
}

function materialsAreCompatible(first: DemoPublication, second: DemoPublication) {
  const firstKey = materialKey(first);
  const secondKey = materialKey(second);
  if (firstKey || secondKey) return firstKey !== null && firstKey === secondKey;

  const firstName = normalize(first.material);
  const secondName = normalize(second.material);
  if (firstName === secondName || firstName.includes(secondName) || secondName.includes(firstName)) return true;

  const ignoredWords = new Set(['material', 'tengo', 'necesito', 'busco', 'ofrezco', 'sobrante', 'estado']);
  const firstWords = new Set(firstName.split(' ').filter((word) => word.length >= 3 && !ignoredWords.has(word)));
  return secondName.split(' ').some((word) => firstWords.has(word));
}

function locationCompatibility(first: string, second: string) {
  const a = normalize(first);
  const b = normalize(second);
  if (a === b) return 15;
  const mexicoCityAliases = ['ciudad de mexico', 'cdmx', 'roma norte', 'coyoacan', 'condesa', 'san jeronimo', 'iztapalapa'];
  const bothInMexicoCity = mexicoCityAliases.some((location) => a.includes(location))
    && mexicoCityAliases.some((location) => b.includes(location));
  return bothInMexicoCity ? 11 : 2;
}

function conditionCompatibility(first: string, second: string) {
  const a = normalize(first);
  const b = normalize(second);
  if (a === 'flexible' || b === 'flexible') return 8;
  if (a === b) return 10;
  if ((a.includes('buen') || a.includes('excelente')) && (b.includes('buen') || b.includes('excelente'))) return 9;
  return 5;
}

function compatibility(publication: DemoPublication, candidate: DemoPublication): DemoMatch | null {
  const materialMatches = materialsAreCompatible(publication, candidate);
  const typeMatches = normalize(publication.type) === normalize(candidate.type);
  if (!materialMatches) return null;

  const need = publication.intent === 'need' ? publication : candidate;
  const offer = publication.intent === 'offer' ? publication : candidate;
  const unitMatches = normalizeUnit(offer.unit) === normalizeUnit(need.unit);
  const quantityRatio = unitMatches
    ? Math.min(offer.quantity / need.quantity, 1)
    : 0;
  const enoughQuantity = unitMatches && offer.quantity >= need.quantity;
  const sameLocation = locationCompatibility(publication.location, candidate.location);
  const condition = conditionCompatibility(publication.condition, candidate.condition);
  const conditionMatches = condition >= 8;
  const locationMatches = sameLocation >= 11;
  const quantityState = !unitMatches ? 'mismatch' : enoughQuantity ? 'match' : 'partial';
  const score = 40
    + (typeMatches ? 20 : 0)
    + (unitMatches ? 10 : 0)
    + (unitMatches ? Math.round(quantityRatio * 15) : 0)
    + (conditionMatches ? 10 : 0)
    + (locationMatches ? 5 : 0);
  const reasons = [
    'material compatible',
    typeMatches ? 'tipo coincidente' : '',
    !unitMatches ? 'unidad distinta' : enoughQuantity ? 'cantidad suficiente' : `cubre ${Math.round(quantityRatio * 100)}% de la cantidad`,
    conditionMatches ? 'condición compatible' : '',
    locationMatches ? 'ubicación cercana' : '',
  ].filter(Boolean);

  return {
    publication: candidate,
    score,
    level: score >= 90 ? 'Alta coincidencia' : 'Coincidencia parcial',
    criteria: {
      material: 'match',
      type: typeMatches ? 'match' : 'mismatch',
      quantity: quantityState,
      unit: unitMatches ? 'match' : 'mismatch',
      condition: conditionMatches ? 'match' : 'mismatch',
      location: locationMatches ? 'match' : 'mismatch',
    },
    reason: reasons.join(' · '),
  };
}

export function findDemoMatches(publication: DemoPublication, publications = webDemoPublications) {
  const oppositeIntent = publication.intent === 'need' ? 'offer' : 'need';
  return publications
    .filter((candidate) => candidate.intent === oppositeIntent
      && candidate.id !== publication.id
      && (!publication.ownerId || candidate.ownerId !== publication.ownerId))
    .map((candidate) => compatibility(publication, candidate))
    .filter((match): match is DemoMatch => match !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}
