import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import {
  registerUser,
  loginUser,
  getCurrentUser,
} from '../services/authService.js';
import {
  addFavorite,
  classifyMaterialText,
  createMaterial,
  createRequest,
  deleteMaterial,
  findMatchesForMaterial,
  findMatchesForRequest,
  getMaterial,
  getMatches,
  getMatchesForUser,
  listFavorites,
  listMaterials,
  listRequests,
  listRequestsForUser,
  removeFavorite,
  searchMaterials,
  updateMaterial,
} from '../services/materialService.js';
import { getStore } from '../utils/store.js';
import { persistItem } from '../utils/dynamo.js';
import { analyzeMaterialImage } from '../services/visionService.js';
import { ConversationError, createConversationForMatch, getConversationMessages, listConversationsForUser, sendConversationMessage } from '../services/conversationService.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'Rebuild API', timestamp: new Date().toISOString() });
});

apiRouter.post('/auth/register', async (req, res) => {
  try {
    const payload = await registerUser({
      name: req.body?.name ?? '',
      email: req.body?.email ?? '',
      password: req.body?.password ?? '',
      city: req.body?.city ?? '',
    });
    res.status(201).json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo registrar.';
    res.status(400).json({ message });
  }
});

apiRouter.post('/auth/login', async (req, res) => {
  try {
    const payload = await loginUser({
      email: req.body?.email ?? '',
      password: req.body?.password ?? '',
    });
    res.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo iniciar sesión.';
    res.status(401).json({ message });
  }
});

apiRouter.get('/auth/me', requireAuth, (req: AuthRequest, res) => {
  try {
    const user = getCurrentUser(req.user!.userId);
    res.json(user);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo obtener el usuario.';
    res.status(404).json({ message });
  }
});

apiRouter.post('/auth/logout', (_req, res) => {
  res.json({ ok: true, message: 'Sesión cerrada.' });
});

apiRouter.get('/materials', (req, res) => {
  const latitude = req.query.latitude ? Number(req.query.latitude) : undefined;
  const longitude = req.query.longitude ? Number(req.query.longitude) : undefined;
  const materials = listMaterials({
    query: String(req.query.q ?? ''),
    category: String(req.query.category ?? ''),
    condition: String(req.query.condition ?? ''),
    location: String(req.query.location ?? ''),
    latitude: Number.isFinite(latitude) ? latitude : undefined,
    longitude: Number.isFinite(longitude) ? longitude : undefined,
    radiusKm: req.query.radiusKm ? Number(req.query.radiusKm) : undefined,
  }).map((material) => ({
    ...material,
    ownerName: getStore().users.get(material.userId)?.name,
  }));
  res.json(materials);
});

apiRouter.get('/materials/search', (req, res) => {
  const query = String(req.query.q ?? '');
  res.json(searchMaterials(query));
});

apiRouter.get('/materials/:id', (req, res) => {
  try {
    const material = getMaterial(req.params.id);
    let owner;
    try {
      owner = getCurrentUser(material.userId);
    } catch {
      owner = undefined;
    }
    res.json({ ...material, owner });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Material no encontrado.';
    res.status(404).json({ message });
  }
});

apiRouter.post('/materials/:id/interest', requireAuth, (req: AuthRequest, res) => {
  try {
    const materialId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const material = getMaterial(materialId);
    if (material.userId === req.user!.userId) return res.status(400).json({ message: 'No puedes mostrar interés en tu propio material.' });
    return res.json({ ok: true, message: 'Tu interés fue registrado.', materialId: material.id, interestedBy: req.user!.userId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Material no encontrado.';
    return res.status(404).json({ message });
  }
});

apiRouter.post('/materials', requireAuth, async (req: AuthRequest, res) => {
  try {
    const material = await createMaterial({
      userId: req.user!.userId,
      name: req.body?.name ?? '',
      type: req.body?.type,
      description: req.body?.description ?? '',
      category: req.body?.category ?? 'Otros',
      quantity: Number(req.body?.quantity ?? 1),
      unit: req.body?.unit ?? 'unidad',
      condition: req.body?.condition ?? 'Buena',
      location: req.body?.location ?? 'Ciudad de México',
      latitude: Number(req.body?.latitude ?? 19.4326),
      longitude: Number(req.body?.longitude ?? -99.1332),
      availability: req.body?.availability ?? 'Disponible',
      photos: Array.isArray(req.body?.photos) ? req.body.photos : [],
      isFeatured: Boolean(req.body?.isFeatured),
      aiTags: Array.isArray(req.body?.aiTags) ? req.body.aiTags : [],
    });
    await findMatchesForMaterial(material.id);
    res.status(201).json(material);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo crear el material.';
    res.status(400).json({ message });
  }
});

apiRouter.patch('/materials/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const materialId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    res.json(await updateMaterial(materialId, req.body ?? {}, req.user!.userId));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo actualizar el material.';
    res.status(400).json({ message });
  }
});

apiRouter.delete('/materials/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const materialId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    res.json({ ok: true, material: await deleteMaterial(materialId, req.user!.userId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo eliminar el material.';
    res.status(400).json({ message });
  }
});

apiRouter.get('/requests', requireAuth, (req: AuthRequest, res) => {
  res.json(listRequestsForUser(req.user!.userId));
});

apiRouter.post('/requests', requireAuth, async (req: AuthRequest, res) => {
  try {
    const request = await createRequest({
      userId: req.user!.userId,
      material: req.body?.material ?? '',
      type: req.body?.type,
      category: req.body?.category ?? 'Otros',
      quantity: Number(req.body?.quantity ?? 1),
      unit: req.body?.unit ?? 'unidad',
      condition: req.body?.condition,
      description: req.body?.description ?? '',
      location: req.body?.location ?? 'Ciudad de México',
      neededBy: req.body?.neededBy ?? new Date().toISOString(),
    });
    await findMatchesForRequest(request.id);
    res.status(201).json(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo crear la solicitud.';
    res.status(400).json({ message });
  }
});

apiRouter.get('/matches', requireAuth, (req: AuthRequest, res) => {
  const matches = getMatchesForUser(req.user!.userId);
  res.json(matches.map((match) => {
    const material = getStore().materials.get(match.materialId);
    const request = getStore().requests.get(match.requestId);
    return {
      ...match,
      material: material && { ...material, ownerName: getStore().users.get(material.userId)?.name },
      request: request && { ...request, ownerName: getStore().users.get(request.userId)?.name },
    };
  }));
});

apiRouter.get('/conversations', requireAuth, (req: AuthRequest, res) => {
  res.json(listConversationsForUser(req.user!.userId));
});

apiRouter.post('/conversations', requireAuth, async (req: AuthRequest, res) => {
  try {
    const conversation = await createConversationForMatch(String(req.body?.matchId ?? ''), req.user!.userId);
    res.status(201).json(conversation);
  } catch (error) {
    const status = error instanceof ConversationError ? error.status : 400;
    const message = error instanceof Error ? error.message : 'No se pudo abrir la conversación.';
    res.status(status).json({ message });
  }
});

apiRouter.get('/conversations/:id/messages', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await getConversationMessages(req.params.id as string, req.user!.userId);
    res.json(result);
  } catch (error) {
    const status = error instanceof ConversationError ? error.status : 400;
    const message = error instanceof Error ? error.message : 'No se pudieron cargar los mensajes.';
    res.status(status).json({ message });
  }
});

apiRouter.post('/conversations/:id/messages', requireAuth, async (req: AuthRequest, res) => {
  try {
    const message = await sendConversationMessage(req.params.id as string, req.user!.userId, String(req.body?.text ?? ''));
    res.status(201).json(message);
  } catch (error) {
    const status = error instanceof ConversationError ? error.status : 400;
    const message = error instanceof Error ? error.message : 'No se pudo enviar el mensaje.';
    res.status(status).json({ message });
  }
});

apiRouter.post('/matches/:id/interest', requireAuth, (req: AuthRequest, res) => {
  const matchId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const store = getStore();
  const match = store.matches.get(matchId);
  if (!match) {
    return res.status(404).json({ message: 'Coincidencia no encontrada.' });
  }
  return res.json({ ok: true, match, message: 'Se registró el interés.' });
});

apiRouter.get('/favorites', requireAuth, (req: AuthRequest, res) => {
  res.json(listFavorites(req.user!.userId));
});

apiRouter.post('/favorites/:materialId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const materialId = Array.isArray(req.params.materialId) ? req.params.materialId[0] : req.params.materialId;
    res.status(201).json(await addFavorite(req.user!.userId, materialId));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo guardar el material.';
    res.status(400).json({ message });
  }
});

apiRouter.delete('/favorites/:materialId', requireAuth, async (req: AuthRequest, res) => {
  const materialId = Array.isArray(req.params.materialId) ? req.params.materialId[0] : req.params.materialId;
  const removed = await removeFavorite(req.user!.userId, materialId);
  res.json({ ok: true, removed });
});

apiRouter.get('/users/me', requireAuth, (req: AuthRequest, res) => {
  try {
    res.json(getCurrentUser(req.user!.userId));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo obtener el perfil.';
    res.status(404).json({ message });
  }
});

apiRouter.patch('/users/me', requireAuth, async (req: AuthRequest, res) => {
  const user = getStore().users.get(req.user!.userId);
  if (!user) {
    return res.status(404).json({ message: 'Usuario no encontrado.' });
  }

  const updated = {
    ...user,
    name: typeof req.body?.name === 'string' ? req.body.name.trim() : user.name,
    city: typeof req.body?.city === 'string' ? req.body.city.trim() : user.city,
    avatar: typeof req.body?.avatar === 'string' ? req.body.avatar : user.avatar,
    updatedAt: new Date().toISOString(),
  };
  try {
    await persistItem('users', updated as unknown as Record<string, unknown>);
  } catch {
    return res.status(500).json({ message: 'No se pudo guardar el perfil.' });
  }
  getStore().users.set(user.id, updated);
  return res.json({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    city: updated.city,
    role: updated.role,
    createdAt: updated.createdAt,
  });
});

apiRouter.post('/ai/classify-material', (req, res) => {
  const text = String(req.body?.text ?? '');
  res.json(classifyMaterialText(text));
});

apiRouter.post('/ai/analyze-material-image', async (req, res) => {
  try {
    const result = await analyzeMaterialImage(String(req.body?.imageDataUrl ?? ''));
    if (result.status === 'not_configured') return res.status(503).json(result);
    return res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo analizar la imagen.';
    return res.status(502).json({ message });
  }
});

apiRouter.post('/ai/find-matches', (req, res) => {
  const materialText = String(req.body?.materialText ?? '');
  const requestText = String(req.body?.requestText ?? '');

  const result = {
    status: 'ok',
    data: {
      suggestedCategory: classifyMaterialText(materialText).estimatedCategory,
      requestMatch: classifyMaterialText(requestText).estimatedCategory,
      score: 82,
    },
  };

  res.json(result);
});

apiRouter.get('/materials/:id/matches', async (req, res) => {
  try {
    res.json(await findMatchesForMaterial(req.params.id));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron calcular coincidencias.';
    res.status(400).json({ message });
  }
});
