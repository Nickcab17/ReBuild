import { createId, getStore, normalizeEmail } from './utils/store.js';
import { createMaterial, createRequest } from './services/materialService.js';
import { registerUser } from './services/authService.js';

export async function createDemoData() {
  const store = getStore();

  if (store.users.size > 0 || store.materials.size > 0 || store.requests.size > 0) {
    return;
  }

  const userA = await registerUser({
    name: 'Ana García',
    email: 'ana@rebuild.dev',
    password: 'secret123',
    city: 'Ciudad de México',
  });

  const userB = await registerUser({
    name: 'Luis Méndez',
    email: 'luis@rebuild.dev',
    password: 'secret123',
    city: 'Guadalajara',
  });

  const userAId = userA.user.id;
  const userBId = userB.user.id;

  const materials: Array<Omit<import('./types.js').Material, 'id' | 'createdAt' | 'updatedAt'> & { userId: string }> = [
    {
      userId: userAId,
      name: 'Tablas de pino',
      description: 'Me sobraron varias tablas de pino en buenas condiciones para reutilizar.',
      category: 'Madera',
      quantity: 10,
      unit: 'tablas',
      condition: 'Buena',
      location: 'Ciudad de México',
      latitude: 19.4326,
      longitude: -99.1332,
      availability: 'Disponible',
      photos: ['https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80'],
      aiTags: ['pino', 'tabla', 'madera'],
      isFeatured: true,
    },
    {
      userId: userBId,
      name: 'Pintura exterior blanca',
      description: 'Botes de pintura blanca para exteriores con poca utilización.',
      category: 'Pintura',
      quantity: 3,
      unit: 'botes',
      condition: 'Buena',
      location: 'Guadalajara',
      latitude: 20.6597,
      longitude: -103.3496,
      availability: 'Disponible',
      photos: ['https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80'],
      aiTags: ['pintura', 'blanco', 'reutilizable'],
    },
    {
      userId: userAId,
      name: 'Taladro y brocas',
      description: 'Herramientas de uso doméstico para reparación y bricolaje.',
      category: 'Herramientas',
      quantity: 1,
      unit: 'set',
      condition: 'Excelente',
      location: 'Ciudad de México',
      latitude: 19.4192,
      longitude: -99.118,
      availability: 'Disponible',
      photos: ['https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=600&q=80'],
      aiTags: ['taladro', 'herramienta', 'broca'],
    },
    {
      userId: userBId,
      name: 'Cables eléctricos',
      description: 'Cableado y conectores de varios tamaños para proyectos pequeños.',
      category: 'Material eléctrico',
      quantity: 12,
      unit: 'rollos',
      condition: 'Usada',
      location: 'Guadalajara',
      latitude: 20.6736,
      longitude: -103.405,
      availability: 'Disponible',
      photos: ['https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80'],
      aiTags: ['cable', 'eléctrico', 'material'],
    },
  ];

  for (const material of materials) {
    createMaterial(material);
  }

  const request1 = createRequest({
    userId: userBId,
    material: 'tablas de madera',
    category: 'Madera',
    quantity: 8,
    unit: 'tablas',
    description: 'Busco madera para construir una mesa de trabajo.',
    location: 'Ciudad de México',
    neededBy: new Date(Date.now() + 86400000).toISOString(),
  });

  const request2 = createRequest({
    userId: userAId,
    material: 'pintura blanca',
    category: 'Pintura',
    quantity: 2,
    unit: 'botes',
    description: 'Necesito pintura para renovar un mueble.',
    location: 'Guadalajara',
    neededBy: new Date(Date.now() + 172800000).toISOString(),
  });

  store.matches.set(createId('match'), {
    id: createId('match'),
    materialId: Array.from(store.materials.values())[0].id,
    requestId: request1.id,
    score: 92,
    reason: 'Coincidencia por madera y tablas de pino',
    createdAt: new Date().toISOString(),
  });

  store.matches.set(createId('match'), {
    id: createId('match'),
    materialId: Array.from(store.materials.values())[1].id,
    requestId: request2.id,
    score: 88,
    reason: 'Coincidencia por categoría de pintura',
    createdAt: new Date().toISOString(),
  });

  return { userA, userB, request1, request2 };
}

export default createDemoData;
