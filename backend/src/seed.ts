import { getStore } from './utils/store.js';
import { createMaterial, createRequest, findMatchesForRequest } from './services/materialService.js';
import { registerUser } from './services/authService.js';
import type { Material, MaterialRequest } from './types.js';

const demoPassword = process.env.DEMO_USER_PASSWORD || 'Nico200@';

export async function createDemoData() {
  const store = getStore();

  if (store.users.size > 0 || store.materials.size > 0 || store.requests.size > 0) {
    return;
  }

  const nico = await registerUser({
    name: 'Nico',
    email: 'nicocg1707@gmail.com',
    password: demoPassword,
    city: 'Ciudad de México',
  });

  const ana = await registerUser({
    name: 'Ana García',
    email: 'ana@rebuild.dev',
    password: demoPassword,
    city: 'Ciudad de México',
  });

  const userNicoId = nico.user.id;
  const userAnaId = ana.user.id;

  const demoOfferings: Array<Omit<Material, 'id' | 'createdAt' | 'updatedAt'> & { userId: string }> = [
    {
      userId: userNicoId,
      name: 'Tablas de madera de pino',
      description: 'Me sobraron 5 tablas de madera de pino de aproximadamente 2 metros después de hacer unos muebles. Están en buen estado.',
      category: 'Madera',
      quantity: 5,
      unit: 'tablas',
      condition: 'Buena',
      location: 'Ciudad de México',
      latitude: 19.4326,
      longitude: -99.1332,
      availability: 'Disponible',
      photos: ['https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80'],
      aiTags: ['madera', 'pino', 'tabla'],
      isFeatured: true,
    },
    {
      userId: userNicoId,
      name: 'Azulejo blanco',
      description: 'Tengo varias piezas de azulejo blanco que sobraron de una remodelación de baño.',
      category: 'Construcción',
      quantity: 18,
      unit: 'piezas',
      condition: 'Buena',
      location: 'Ciudad de México',
      latitude: 19.422,
      longitude: -99.14,
      availability: 'Disponible',
      photos: ['https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80'],
      aiTags: ['azulejo', 'ceramica', 'baño'],
    },
    {
      userId: userNicoId,
      name: 'Cemento gris',
      description: 'Me quedaron 4 bolsas de cemento gris nuevas de una construcción.',
      category: 'Construcción',
      quantity: 4,
      unit: 'bolsas',
      condition: 'Excelente',
      location: 'Ciudad de México',
      latitude: 19.439,
      longitude: -99.11,
      availability: 'Disponible',
      photos: ['https://images.unsplash.com/photo-1523413651479-597eb2da0ad6?auto=format&fit=crop&w=600&q=80'],
      aiTags: ['cemento', 'gris', 'construccion'],
    },
    {
      userId: userNicoId,
      name: 'Tubos de PVC',
      description: 'Tengo tubos de PVC que ya no voy a utilizar. Son de aproximadamente 2 metros.',
      category: 'Plástico',
      quantity: 6,
      unit: 'metros',
      condition: 'Buena',
      location: 'Ciudad de México',
      latitude: 19.44,
      longitude: -99.15,
      availability: 'Disponible',
      photos: ['https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80'],
      aiTags: ['pvc', 'tuberia', 'plastic'],
    },
    {
      userId: userNicoId,
      name: 'Cartón grueso',
      description: 'Me sobraron algunas láminas de cartón grueso después de un proyecto.',
      category: 'Otros',
      quantity: 8,
      unit: 'láminas',
      condition: 'Buena',
      location: 'Ciudad de México',
      latitude: 19.431,
      longitude: -99.125,
      availability: 'Disponible',
      photos: ['https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80'],
      aiTags: ['carton', 'lamina', 'proyecto'],
    },
    {
      userId: userNicoId,
      name: 'Cajas de cerámica',
      description: 'Tengo unas cajas de cerámica que quedaron de una remodelación.',
      category: 'Construcción',
      quantity: 10,
      unit: 'cajas',
      condition: 'Usada',
      location: 'Ciudad de México',
      latitude: 19.437,
      longitude: -99.136,
      availability: 'Disponible',
      photos: ['https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80'],
      aiTags: ['ceramica', 'remodelacion', 'material'],
    },
    {
      userId: userAnaId,
      name: 'Cables eléctricos',
      description: 'Tengo cables eléctricos en buen estado para reparación general.',
      category: 'Material eléctrico',
      quantity: 12,
      unit: 'metros',
      condition: 'Buena',
      location: 'Ciudad de México',
      latitude: 19.434,
      longitude: -99.127,
      availability: 'Disponible',
      photos: ['https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80'],
      aiTags: ['cables', 'electricos'],
    },
  ];

  const createdMaterials = demoOfferings.map((material) => createMaterial(material));

  const demoRequests: Array<Omit<MaterialRequest, 'id' | 'createdAt' | 'updatedAt'> & { userId: string }> = [
    {
      userId: userAnaId,
      material: 'madera',
      category: 'Madera',
      quantity: 2,
      unit: 'tablas',
      description: 'Busco madera para construir una repisa para mi casa.',
      location: 'Ciudad de México',
      neededBy: new Date(Date.now() + 86400000).toISOString(),
    },
    {
      userId: userNicoId,
      material: 'cerámica',
      category: 'Construcción',
      quantity: 5,
      unit: 'piezas',
      description: 'Necesito algunas piezas de cerámica blanca para terminar mi baño.',
      location: 'Ciudad de México',
      neededBy: new Date(Date.now() + 86400000).toISOString(),
    },
    {
      userId: userAnaId,
      material: 'cemento',
      category: 'Construcción',
      quantity: 2,
      unit: 'bolsas',
      description: 'Necesito cemento para terminar una reparación en una pared.',
      location: 'Ciudad de México',
      neededBy: new Date(Date.now() + 172800000).toISOString(),
    },
    {
      userId: userAnaId,
      material: 'tubería de PVC',
      category: 'Plástico',
      quantity: 3,
      unit: 'metros',
      description: 'Busco tubería de PVC para una reparación de agua.',
      location: 'Ciudad de México',
      neededBy: new Date(Date.now() + 172800000).toISOString(),
    },
    {
      userId: userNicoId,
      material: 'cartón',
      category: 'Otros',
      quantity: 3,
      unit: 'láminas',
      description: 'Necesito cartón resistente para hacer una maqueta.',
      location: 'Ciudad de México',
      neededBy: new Date(Date.now() + 172800000).toISOString(),
    },
    {
      userId: userAnaId,
      material: 'material para piso',
      category: 'Construcción',
      quantity: 6,
      unit: 'piezas',
      description: 'Estoy buscando material para reparar una sección del piso.',
      location: 'Ciudad de México',
      neededBy: new Date(Date.now() + 172800000).toISOString(),
    },
    {
      userId: userNicoId,
      material: 'madera para mesa',
      category: 'Madera',
      quantity: 1,
      unit: 'tabla',
      description: 'Busco madera para una mesa para el taller.',
      location: 'Monterrey',
      neededBy: new Date(Date.now() + 86400000).toISOString(),
    },
  ];

  const createdRequests = demoRequests.map((request) => createRequest(request));

  const matchesToCreate = [
    { materialIndex: 0, requestIndex: 0 },
    { materialIndex: 1, requestIndex: 1 },
    { materialIndex: 2, requestIndex: 2 },
    { materialIndex: 3, requestIndex: 3 },
    { materialIndex: 4, requestIndex: 4 },
  ];

  for (const pair of matchesToCreate) {
    const material = createdMaterials[pair.materialIndex];
    const request = createdRequests[pair.requestIndex];
    findMatchesForRequest(request.id);
    store.matches.set(`${material.id}-${request.id}`, {
      id: `${material.id}-${request.id}`,
      materialId: material.id,
      requestId: request.id,
      score: 86,
      reason: 'Coincidencia detectada por la IA de Rebuild',
      createdAt: new Date().toISOString(),
    });
  }

  return { nico, ana, materials: createdMaterials, requests: createdRequests };
}

export default createDemoData;
