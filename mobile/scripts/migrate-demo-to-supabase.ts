import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createMatchesForMaterial, createMatchesForRequest, type MaterialRow, type RequestRow } from '../api/[...path].js';
import { getAdminClient } from '../api/supabase.js';
import { demoMaterials, demoRequests } from '../data/demoData.js';
import { webDemoPublications, type DemoPublication } from '../data/webDemo.js';

export const TARGET_EMAIL = 'nicocg170709@gmail.com';

const ID_NAMESPACE = 'c0fdb1a5-18e9-4cf5-b4a1-13b5eef9a622';
const MIGRATION_VERSION = 2;
const PAGE_SIZE = 500;

type MaterialInsert = Omit<MaterialRow, 'created_at' | 'owner'> & { id: string; user_id: string };
type RequestInsert = Omit<RequestRow, 'created_at' | 'owner'> & { id: string; user_id: string };

export type MigrationRecord =
  | { table: 'materials'; sourceId: string; row: MaterialInsert; hasSourceDeadline: false }
  | { table: 'requests'; sourceId: string; row: RequestInsert; hasSourceDeadline: boolean };

export interface PlannedRecord {
  record: MigrationRecord;
  action: 'insert' | 'skip';
  reason?: 'stable-id' | 'equivalent-content';
  existing?: Record<string, unknown>;
}

export interface MigrationPreview {
  account: { email: string; userId: string };
  offersFound: number;
  requestsFound: number;
  offersToInsert: number;
  offersSkipped: number;
  requestsToInsert: number;
  requestsSkipped: number;
  conflicts: number;
  publications: PublicationPreview[];
}

export interface PublicationPreview {
  demoId: string;
  type: 'offer' | 'request';
  name: string;
  status: 'insert' | 'skip' | 'conflict';
  reason: string;
  migrationId: string;
  existingId?: string;
}

export interface MigrationManifest {
  version: number;
  targetUserId: string;
  createdMaterials: MaterialRow[];
  createdRequests: RequestRow[];
  pendingMaterials: MaterialInsert[];
  pendingRequests: RequestInsert[];
  createdMatches: Array<{
    id: string;
    material_id: string;
    request_id: string;
    score: number;
    reason: string;
  }>;
  baselineMatchIds: string[];
}

export class MigrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MigrationError';
  }
}

const materialById = new Map(demoMaterials.map((material) => [material.id, material]));
const requestById = new Map(demoRequests.map((request) => [request.id, request]));

export function stableDemoUuid(table: MigrationRecord['table'], sourceId: string) {
  const namespace = Buffer.from(ID_NAMESPACE.replaceAll('-', ''), 'hex');
  const bytes = createHash('sha1')
    .update(namespace)
    .update(`rebuild-demo-v1:${table}:${sourceId}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function categoryFor(publication: DemoPublication) {
  const base = materialById.get(publication.id) ?? requestById.get(publication.id);
  if (base) return base.category;
  if (publication.type === 'Cerámico' || publication.type === 'Ladrillo' || publication.type === 'Construcción') return 'Construcción';
  if (publication.type === 'Tubería') return 'Plástico';
  if (publication.type.trim()) return publication.type;
  throw new MigrationError(`No se pudo inferir la categoría para ${publication.id}.`);
}

export function buildMigrationRecords(userId: string, runAt = new Date()) {
  const fallbackDeadline = runAt.toISOString();
  const records: MigrationRecord[] = webDemoPublications.map((publication) => {
    const category = categoryFor(publication);
    if (publication.intent === 'offer') {
      return {
        table: 'materials',
        sourceId: publication.id,
        hasSourceDeadline: false,
        row: {
          id: stableDemoUuid('materials', publication.id),
          user_id: userId,
          name: publication.material,
          type: publication.type || null,
          description: publication.description,
          category,
          quantity: publication.quantity,
          unit: publication.unit,
          condition: publication.condition,
          location: publication.location,
          latitude: publication.latitude ?? null,
          longitude: publication.longitude ?? null,
          availability: 'Disponible',
          photos: [],
        },
      };
    }

    const sourceRequest = requestById.get(publication.id);
    return {
      table: 'requests',
      sourceId: publication.id,
      hasSourceDeadline: Boolean(sourceRequest?.neededBy),
      row: {
        id: stableDemoUuid('requests', publication.id),
        user_id: userId,
        material: publication.material,
        type: publication.type || null,
        category,
        quantity: publication.quantity,
        unit: publication.unit,
        condition: publication.condition || null,
        description: publication.description,
        location: publication.location,
        needed_by: sourceRequest?.neededBy
          ? new Date(`${sourceRequest.neededBy}T00:00:00.000Z`).toISOString()
          : fallbackDeadline,
      },
    };
  });

  if (records.length !== 16
    || records.filter((record) => record.table === 'materials').length !== 8
    || records.filter((record) => record.table === 'requests').length !== 8
    || new Set(records.map(({ table, sourceId }) => `${table}:${sourceId}`)).size !== records.length
    || new Set(records.map(({ row }) => row.id)).size !== records.length) {
    throw new MigrationError('El conjunto demo no coincide con los 16 registros esperados (8 ofertas y 8 necesidades).');
  }
  return records;
}

function contentFields(record: MigrationRecord): string[] {
  return record.table === 'materials'
    ? ['user_id', 'name', 'type', 'description', 'category', 'quantity', 'unit', 'condition', 'location', 'latitude', 'longitude', 'availability', 'photos']
    : [
      'user_id',
      'material',
      'type',
      'category',
      'quantity',
      'unit',
      'condition',
      'description',
      'location',
      ...(record.hasSourceDeadline ? ['needed_by'] : []),
    ];
}

function valuesEqual(first: unknown, second: unknown) {
  if (Array.isArray(first) && Array.isArray(second)) return JSON.stringify(first) === JSON.stringify(second);
  return first === second;
}

function matchesSource(record: MigrationRecord, existing: Record<string, unknown>) {
  return contentFields(record).every((field) => valuesEqual(existing[field], record.row[field as keyof typeof record.row]));
}

export function planRecords(
  records: MigrationRecord[],
  existingRows: Record<MigrationRecord['table'], Array<Record<string, unknown>>>,
): PlannedRecord[] {
  return records.map((record) => {
    const tableRows = existingRows[record.table];
    const deterministicId = tableRows.find((row) => row.id === record.row.id);
    if (deterministicId) {
      if (!matchesSource(record, deterministicId)) {
        throw new MigrationError(`Conflicto en ${record.table} para el ID de migración ${record.sourceId}; no se modificó ningún dato.`);
      }
      return { record, action: 'skip', reason: 'stable-id', existing: deterministicId };
    }

    const equivalents = tableRows.filter((row) => matchesSource(record, row));
    if (equivalents.length > 1) {
      throw new MigrationError(`Hay varias publicaciones equivalentes para ${record.sourceId}; se detuvo la migración para evitar duplicados.`);
    }
    if (equivalents.length === 1) {
      return { record, action: 'skip', reason: 'equivalent-content', existing: equivalents[0] };
    }
    return { record, action: 'insert' };
  });
}

export function summarizeMigrationPreview(
  records: MigrationRecord[],
  existingRows: Record<MigrationRecord['table'], Array<Record<string, unknown>>>,
  targetUserId = records[0]?.row.user_id ?? '',
): MigrationPreview {
  const publications: PublicationPreview[] = records.map((record) => {
    try {
      const [plan] = planRecords([record], existingRows);
      const type = record.table === 'materials' ? 'offer' : 'request';
      if (plan.action === 'skip') {
        const reason = plan.reason === 'stable-id'
          ? 'Ya existe una publicación con el ID determinístico y sus datos coinciden.'
          : 'Ya existe una publicación equivalente con estos datos.';
        return {
          demoId: record.sourceId,
          type,
          name: record.table === 'materials' ? record.row.name : record.row.material,
          status: 'skip',
          reason,
          migrationId: record.row.id,
          existingId: String(plan.existing?.id ?? ''),
        };
      }
      return {
        demoId: record.sourceId,
        type,
        name: record.table === 'materials' ? record.row.name : record.row.material,
        status: 'insert',
        reason: 'No se encontró una publicación con el ID determinístico ni una equivalente.',
        migrationId: record.row.id,
      };
    } catch (error) {
      if (!(error instanceof MigrationError)) throw error;
      return {
        demoId: record.sourceId,
        type: record.table === 'materials' ? 'offer' : 'request',
        name: record.table === 'materials' ? record.row.name : record.row.material,
        status: 'conflict',
        reason: error.message,
        migrationId: record.row.id,
      };
    }
  });
  const offers = publications.filter(({ type }) => type === 'offer');
  const requests = publications.filter(({ type }) => type === 'request');
  return {
    account: { email: TARGET_EMAIL, userId: targetUserId },
    offersFound: offers.length,
    requestsFound: requests.length,
    offersToInsert: offers.filter(({ status }) => status === 'insert').length,
    offersSkipped: offers.filter(({ status }) => status === 'skip').length,
    requestsToInsert: requests.filter(({ status }) => status === 'insert').length,
    requestsSkipped: requests.filter(({ status }) => status === 'skip').length,
    conflicts: publications.filter(({ status }) => status === 'conflict').length,
    publications,
  };
}

export async function previewDemoMigration(): Promise<MigrationPreview> {
  const client = getAdminClient();
  const target = await locateTargetUser(client);
  const records = buildMigrationRecords(target.id);
  const existing = await loadExistingRows(client, records, target.id);
  return summarizeMigrationPreview(records, existing, target.id);
}

function requiredEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new MigrationError(`Falta la variable de entorno ${name}.`);
  return value;
}

async function locateTargetUser(client: ReturnType<typeof getAdminClient>) {
  const matches: Array<{ id: string; email?: string }> = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) throw new MigrationError(`No se pudo consultar Supabase Auth (${error.code ?? error.status ?? 'error'}).`);
    for (const user of data.users) {
      if (user.email?.toLowerCase() === TARGET_EMAIL.toLowerCase()) matches.push({ id: user.id, email: user.email });
    }
    if (data.users.length < PAGE_SIZE) break;
  }
  if (matches.length !== 1) {
    throw new MigrationError(matches.length === 0
      ? 'No se encontró exactamente una cuenta destino en Supabase Auth.'
      : 'La búsqueda del usuario destino devolvió más de una cuenta.');
  }
  const { data: profile, error } = await client
    .from('profiles')
    .select('id')
    .eq('id', matches[0].id)
    .maybeSingle();
  if (error || !profile || profile.id !== matches[0].id) {
    throw new MigrationError('La cuenta destino no tiene un perfil válido; no se insertó ningún registro.');
  }
  return matches[0];
}

async function fetchByIds(client: ReturnType<typeof getAdminClient>, table: MigrationRecord['table'], ids: string[]) {
  if (!ids.length) return [];
  const query = table === 'materials'
    ? client.from('materials').select('*').in('id', ids)
    : client.from('requests').select('*').in('id', ids);
  const { data, error } = await query;
  if (error) throw new MigrationError(`No se pudieron revisar IDs existentes en ${table} (${error.code ?? 'error'}).`);
  return (data ?? []) as Array<Record<string, unknown>>;
}

async function fetchOwnedRows(client: ReturnType<typeof getAdminClient>, table: MigrationRecord['table'], userId: string) {
  const rows: Array<Record<string, unknown>> = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const query = table === 'materials'
      ? client.from('materials').select('*').eq('user_id', userId).range(from, from + PAGE_SIZE - 1)
      : client.from('requests').select('*').eq('user_id', userId).range(from, from + PAGE_SIZE - 1);
    const { data, error } = await query;
    if (error) throw new MigrationError(`No se pudieron leer los registros destino de ${table} (${error.code ?? 'error'}).`);
    rows.push(...(data ?? []) as Array<Record<string, unknown>>);
    if ((data ?? []).length < PAGE_SIZE) break;
  }
  return rows;
}

async function loadExistingRows(client: ReturnType<typeof getAdminClient>, records: MigrationRecord[], userId: string) {
  const materialIds = records.filter((record) => record.table === 'materials').map(({ row }) => row.id);
  const requestIds = records.filter((record) => record.table === 'requests').map(({ row }) => row.id);
  const [materialIdsFound, requestIdsFound, ownedMaterials, ownedRequests] = await Promise.all([
    fetchByIds(client, 'materials', materialIds),
    fetchByIds(client, 'requests', requestIds),
    fetchOwnedRows(client, 'materials', userId),
    fetchOwnedRows(client, 'requests', userId),
  ]);
  return {
    materials: [...new Map([...materialIdsFound, ...ownedMaterials].map((row) => [String(row.id), row])).values()],
    requests: [...new Map([...requestIdsFound, ...ownedRequests].map((row) => [String(row.id), row])).values()],
  };
}

async function insertOne(client: ReturnType<typeof getAdminClient>, record: MigrationRecord) {
  const result = record.table === 'materials'
    ? await client.from('materials').insert(record.row).select('*').single()
    : await client.from('requests').insert(record.row).select('*').single();
  if (result.error || !result.data) {
    throw new MigrationError(`No se pudo insertar ${record.table} ${record.sourceId} (${result.error?.code ?? 'error'}); no se sobrescribió ningún registro.`);
  }
  return result.data as unknown as MaterialRow | RequestRow;
}

async function loadManifest(
  manifestPath: string,
  targetUserId: string,
  records: MigrationRecord[],
  allowCreate: boolean,
): Promise<MigrationManifest> {
  try {
    const parsed = JSON.parse(await readFile(manifestPath, 'utf8')) as MigrationManifest;
    if (parsed.version !== MIGRATION_VERSION || parsed.targetUserId !== targetUserId
      || !Array.isArray(parsed.createdMaterials)
      || !Array.isArray(parsed.createdRequests)
      || !Array.isArray(parsed.pendingMaterials)
      || !Array.isArray(parsed.pendingRequests)
      || !Array.isArray(parsed.createdMatches)
      || !Array.isArray(parsed.baselineMatchIds)) {
      throw new MigrationError('El manifiesto no corresponde a esta migración o al usuario destino.');
    }
    const expected = new Map(records.map((record) => [`${record.table}:${record.row.id}`, record]));
    const createdRows = [
      ...parsed.createdMaterials.map((row) => ({ table: 'materials' as const, row })),
      ...parsed.createdRequests.map((row) => ({ table: 'requests' as const, row })),
      ...parsed.pendingMaterials.map((row) => ({ table: 'materials' as const, row })),
      ...parsed.pendingRequests.map((row) => ({ table: 'requests' as const, row })),
    ];
    const seenRows = new Set<string>();
    for (const entry of createdRows) {
      const key = `${entry.table}:${entry.row.id}`;
      const source = expected.get(key);
      if (!source || entry.row.user_id !== targetUserId || !matchesSource(source, entry.row as unknown as Record<string, unknown>) || seenRows.has(key)) {
        throw new MigrationError('El manifiesto contiene publicaciones fuera del conjunto demo destino.');
      }
      seenRows.add(key);
    }
    const expectedMaterialIds = new Set(records.filter((record) => record.table === 'materials').map(({ row }) => row.id));
    const expectedRequestIds = new Set(records.filter((record) => record.table === 'requests').map(({ row }) => row.id));
    const seenMatchIds = new Set<string>();
    if (parsed.createdMatches.some((match) => {
      if (typeof match.id !== 'string'
        || (!expectedMaterialIds.has(match.material_id) && !expectedRequestIds.has(match.request_id))
        || seenMatchIds.has(match.id)) return true;
      seenMatchIds.add(match.id);
      return false;
    }) || parsed.baselineMatchIds.some((id) => typeof id !== 'string')) {
      throw new MigrationError('El manifiesto contiene coincidencias ajenas a las publicaciones demo.');
    }
    return parsed;
  } catch (error) {
    if (error instanceof MigrationError) throw error;
    if ((error as NodeJS.ErrnoException).code === 'ENOENT' && allowCreate) {
      return {
        version: MIGRATION_VERSION,
        targetUserId,
        createdMaterials: [],
        createdRequests: [],
        pendingMaterials: [],
        pendingRequests: [],
        createdMatches: [],
        baselineMatchIds: [],
      };
    }
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new MigrationError('No se encontró el manifiesto requerido para rollback.');
    }
    throw new MigrationError('No se pudo leer el manifiesto de migración.');
  }
}

async function saveManifest(manifestPath: string, manifest: MigrationManifest) {
  await mkdir(path.dirname(manifestPath), { recursive: true });
  const temporaryPath = `${manifestPath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  await rename(temporaryPath, manifestPath);
}

async function captureMatches(client: ReturnType<typeof getAdminClient>, materialIds: string[], requestIds: string[]) {
  const materialMatches = materialIds.length
    ? await client.from('matches').select('id, material_id, request_id, score, reason').in('material_id', materialIds)
    : { data: [], error: null };
  const requestMatches = requestIds.length
    ? await client.from('matches').select('id, material_id, request_id, score, reason').in('request_id', requestIds)
    : { data: [], error: null };
  if (materialMatches.error || requestMatches.error) {
    throw new MigrationError(`No se pudieron consultar coincidencias (${materialMatches.error?.code ?? requestMatches.error?.code ?? 'error'}).`);
  }
  return [...new Map(
    [...(materialMatches.data ?? []), ...(requestMatches.data ?? [])].map((match) => [match.id, match]),
  ).values()];
}

function printSummary(
  title: string,
  plans: PlannedRecord[],
  insertedMaterials: number,
  insertedRequests: number,
  dryRun = false,
) {
  const offers = plans.filter(({ record }) => record.table === 'materials');
  const requests = plans.filter(({ record }) => record.table === 'requests');
  const plannedOffers = offers.filter(({ action }) => action === 'insert').length;
  const plannedRequests = requests.filter(({ action }) => action === 'insert').length;
  const skippedOffers = offers.length - plannedOffers + (plannedOffers - insertedMaterials);
  const skippedRequests = requests.length - plannedRequests + (plannedRequests - insertedRequests);
  console.log(title);
  console.log(`Target user: ${TARGET_EMAIL.replace(/^(.).+(@.*)$/, '$1***$2')}`);
  console.log(`Offers found: ${offers.length}`);
  console.log(`Requests found: ${requests.length}`);
  console.log(`${dryRun ? 'Would insert' : 'Inserted'} offers: ${dryRun ? plannedOffers : insertedMaterials}`);
  console.log(`Skipped existing offers: ${skippedOffers}`);
  console.log(`${dryRun ? 'Would insert' : 'Inserted'} requests: ${dryRun ? plannedRequests : insertedRequests}`);
  console.log(`Skipped existing requests: ${skippedRequests}`);
  console.log(`${dryRun ? 'Total to migrate' : 'Total migrated'}: ${dryRun ? plannedOffers + plannedRequests : insertedMaterials + insertedRequests}`);
}

async function reconcilePending(
  client: ReturnType<typeof getAdminClient>,
  manifest: MigrationManifest,
  manifestPath: string,
  records: MigrationRecord[],
) {
  const expected = new Map(records.map((record) => [`${record.table}:${record.row.id}`, record]));
  const [pendingMaterials, pendingRequests] = await Promise.all([
    fetchByIds(client, 'materials', manifest.pendingMaterials.map(({ id }) => id)),
    fetchByIds(client, 'requests', manifest.pendingRequests.map(({ id }) => id)),
  ]);
  for (const source of manifest.pendingMaterials) {
    const existing = pendingMaterials.find(({ id }) => id === source.id);
    const original = expected.get(`materials:${source.id}`);
    if (!original || (existing && !matchesSource(original, existing))) {
      throw new MigrationError('Un ID pendiente de la migración ahora contiene otros datos; operación detenida.');
    }
    manifest.pendingMaterials = manifest.pendingMaterials.filter(({ id }) => id !== source.id);
    if (existing && !manifest.createdMaterials.some(({ id }) => id === source.id)) {
      manifest.createdMaterials.push(existing as unknown as MaterialRow);
    }
  }
  for (const source of manifest.pendingRequests) {
    const existing = pendingRequests.find(({ id }) => id === source.id);
    const original = expected.get(`requests:${source.id}`);
    if (!original || (existing && !matchesSource(original, existing))) {
      throw new MigrationError('Un ID pendiente de la migración ahora contiene otros datos; operación detenida.');
    }
    manifest.pendingRequests = manifest.pendingRequests.filter(({ id }) => id !== source.id);
    if (existing && !manifest.createdRequests.some(({ id }) => id === source.id)) {
      manifest.createdRequests.push(existing as unknown as RequestRow);
    }
  }
  await saveManifest(manifestPath, manifest);
}

async function applyMigration(client: ReturnType<typeof getAdminClient>, plans: PlannedRecord[], manifest: MigrationManifest, manifestPath: string) {
  let insertedMaterials = 0;
  let insertedRequests = 0;
  const matchingMaterials: MaterialRow[] = [];
  const matchingRequests: RequestRow[] = [];
  for (const plan of plans) {
    if (plan.action === 'skip' && !plan.existing) {
      throw new MigrationError('No se encontró el registro existente que debía omitirse.');
    }
    let row: MaterialRow | RequestRow;
    if (plan.action === 'skip') {
      row = plan.existing as unknown as MaterialRow | RequestRow;
    } else {
      if (plan.record.table === 'materials' && !manifest.pendingMaterials.some(({ id }) => id === plan.record.row.id)) {
        manifest.pendingMaterials.push(plan.record.row);
        await saveManifest(manifestPath, manifest);
      } else if (plan.record.table === 'requests' && !manifest.pendingRequests.some(({ id }) => id === plan.record.row.id)) {
        manifest.pendingRequests.push(plan.record.row);
        await saveManifest(manifestPath, manifest);
      }
      row = await insertOne(client, plan.record);
    }
    if (plan.record.table === 'materials') {
      matchingMaterials.push(row as MaterialRow);
      if (plan.action === 'insert') {
        manifest.pendingMaterials = manifest.pendingMaterials.filter(({ id }) => id !== row.id);
        const index = manifest.createdMaterials.findIndex(({ id }) => id === row.id);
        if (index >= 0) manifest.createdMaterials[index] = row as MaterialRow;
        else manifest.createdMaterials.push(row as MaterialRow);
        insertedMaterials += 1;
      }
    } else {
      matchingRequests.push(row as RequestRow);
      if (plan.action === 'insert') {
        manifest.pendingRequests = manifest.pendingRequests.filter(({ id }) => id !== row.id);
        const index = manifest.createdRequests.findIndex(({ id }) => id === row.id);
        if (index >= 0) manifest.createdRequests[index] = row as RequestRow;
        else manifest.createdRequests.push(row as RequestRow);
        insertedRequests += 1;
      }
    }
    if (plan.action === 'insert') await saveManifest(manifestPath, manifest);
  }

  const materialIds = matchingMaterials.map(({ id }) => id);
  const requestIds = matchingRequests.map(({ id }) => id);
  if (!manifest.baselineMatchIds.length) {
    manifest.baselineMatchIds = (await captureMatches(client, materialIds, requestIds)).map(({ id }) => id);
    await saveManifest(manifestPath, manifest);
  }
  const baselineMatchIds = new Set(manifest.baselineMatchIds);
  const knownMatchIds = new Set(manifest.createdMatches.map(({ id }) => id));
  const saveNewMatches = async () => {
    const current = await captureMatches(client, materialIds, requestIds);
    for (const match of current) {
      if (!baselineMatchIds.has(match.id) && !knownMatchIds.has(match.id)) {
        manifest.createdMatches.push(match);
        knownMatchIds.add(match.id);
      }
    }
    await saveManifest(manifestPath, manifest);
  };
  for (const material of matchingMaterials) {
    try {
      await createMatchesForMaterial(material);
    } finally {
      await saveNewMatches();
    }
  }
  for (const request of matchingRequests) {
    try {
      await createMatchesForRequest(request);
    } finally {
      await saveNewMatches();
    }
  }
  printSummary('ReBuild demo migration', plans, insertedMaterials, insertedRequests);
}

function rowsMatchSnapshot(actual: Record<string, unknown>, snapshot: Record<string, unknown>) {
  return Object.entries(snapshot).every(([key, value]) => valuesEqual(actual[key], value));
}

async function rollbackMigration(client: ReturnType<typeof getAdminClient>, manifest: MigrationManifest) {
  const materialIds = manifest.createdMaterials.map(({ id }) => id);
  const requestIds = manifest.createdRequests.map(({ id }) => id);
  const [currentMaterials, currentRequests, currentMatches] = await Promise.all([
    fetchByIds(client, 'materials', materialIds),
    fetchByIds(client, 'requests', requestIds),
    captureMatches(client, materialIds, requestIds),
  ]);
  const manifestMatchIds = new Set(manifest.createdMatches.map(({ id }) => id));
  const baselineMatchIds = new Set(manifest.baselineMatchIds);
  const unknownMatches = currentMatches.filter((match) => !manifestMatchIds.has(match.id) && !baselineMatchIds.has(match.id));
  if (unknownMatches.length) {
    throw new MigrationError('Hay coincidencias no registradas en el manifiesto; rollback detenido para evitar borrar datos ajenos.');
  }

  for (const snapshot of manifest.createdMaterials) {
    const actual = currentMaterials.find((row) => row.id === snapshot.id);
    if (actual && !rowsMatchSnapshot(actual, snapshot as unknown as Record<string, unknown>)) {
      throw new MigrationError('Un material migrado cambió desde la importación; rollback detenido sin borrar registros.');
    }
  }
  for (const snapshot of manifest.createdRequests) {
    const actual = currentRequests.find((row) => row.id === snapshot.id);
    if (actual && !rowsMatchSnapshot(actual, snapshot as unknown as Record<string, unknown>)) {
      throw new MigrationError('Una necesidad migrada cambió desde la importación; rollback detenido sin borrar registros.');
    }
  }
  for (const snapshot of manifest.createdMatches) {
    const actual = currentMatches.find((row) => row.id === snapshot.id);
    if (actual && !rowsMatchSnapshot(actual, snapshot)) {
      throw new MigrationError('Una coincidencia migrada cambió; rollback detenido sin borrar registros.');
    }
  }

  if (manifest.createdMatches.length) {
    const ids = manifest.createdMatches.map(({ id }) => id);
    const { error } = await client.from('matches').delete().in('id', ids);
    if (error) throw new MigrationError(`No se pudieron revertir las coincidencias (${error.code ?? 'error'}).`);
  }
  for (const row of manifest.createdMaterials) {
    const { error } = await client.from('materials').delete().eq('id', row.id).eq('user_id', manifest.targetUserId);
    if (error) throw new MigrationError(`No se pudo revertir material migrado (${error.code ?? 'error'}).`);
  }
  for (const row of manifest.createdRequests) {
    const { error } = await client.from('requests').delete().eq('id', row.id).eq('user_id', manifest.targetUserId);
    if (error) throw new MigrationError(`No se pudo revertir necesidad migrada (${error.code ?? 'error'}).`);
  }
  console.log('ReBuild demo migration rollback');
  console.log(`Removed migration-created offers: ${currentMaterials.length}`);
  console.log(`Removed migration-created requests: ${currentRequests.length}`);
  console.log(`Removed migration-created matches: ${currentMatches.length}`);
}

async function loadEnvironmentFile(filePath: string) {
  const contents = await readFile(filePath, 'utf8');
  for (const line of contents.split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match || !['SUPABASE_URL', 'SUPABASE_SECRET_KEY'].includes(match[1]) || process.env[match[1]]) continue;
    const rawValue = match[2];
    const value = rawValue.length >= 2 && (
      (rawValue.startsWith('"') && rawValue.endsWith('"'))
      || (rawValue.startsWith("'") && rawValue.endsWith("'"))
    ) ? rawValue.slice(1, -1) : rawValue.replace(/\s+#.*$/, '');
    process.env[match[1]] = value;
  }
}

function parseArguments(args: string[]) {
  const modes = args.filter((arg) => ['--dry-run', '--apply', '--rollback'].includes(arg));
  if (modes.length > 1) throw new MigrationError('Usa solo uno entre --dry-run, --apply y --rollback.');
  const mode = modes[0] ?? '--dry-run';
  const manifestIndex = args.indexOf('--manifest');
  const manifestPath = manifestIndex >= 0 ? args[manifestIndex + 1] : undefined;
  const envFileIndex = args.indexOf('--env-file');
  const envFile = envFileIndex >= 0 ? args[envFileIndex + 1] : undefined;
  if (manifestIndex >= 0 && (!manifestPath || manifestPath.startsWith('--'))) {
    throw new MigrationError('--manifest requiere una ruta.');
  }
  if (envFileIndex >= 0 && (!envFile || envFile.startsWith('--'))) {
    throw new MigrationError('--env-file requiere una ruta.');
  }
  if ((mode === '--apply' || mode === '--rollback') && !manifestPath) {
    throw new MigrationError(`${mode} requiere --manifest <ruta fuera del repositorio>.`);
  }
  return {
    mode,
    manifestPath: manifestPath ? path.resolve(manifestPath) : undefined,
    envFile: envFile ? path.resolve(envFile) : undefined,
  };
}

async function run() {
  const options = parseArguments(process.argv.slice(2));
  if (options.envFile) await loadEnvironmentFile(options.envFile);
  requiredEnvironment('SUPABASE_URL');
  requiredEnvironment('SUPABASE_SECRET_KEY');
  const client = getAdminClient();
  const target = await locateTargetUser(client);
  const records = buildMigrationRecords(target.id);
  if (options.mode === '--rollback') {
    const manifest = await loadManifest(options.manifestPath!, target.id, records, false);
    await reconcilePending(client, manifest, options.manifestPath!, records);
    await rollbackMigration(client, manifest);
    return;
  }

  const manifest = options.mode === '--apply'
    ? await loadManifest(options.manifestPath!, target.id, records, true)
    : undefined;
  if (manifest) await reconcilePending(client, manifest, options.manifestPath!, records);
  const existing = await loadExistingRows(client, records, target.id);
  const plans = planRecords(records, existing);
  const insertedMaterials = plans.filter(({ action, record }) => action === 'insert' && record.table === 'materials').length;
  const insertedRequests = plans.filter(({ action, record }) => action === 'insert' && record.table === 'requests').length;
  if (options.mode === '--dry-run') {
    printSummary('ReBuild demo migration (dry run; no writes)', plans, 0, 0, true);
    return;
  }

  await saveManifest(options.manifestPath!, manifest!);
  await applyMigration(client, plans, manifest!, options.manifestPath!);
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) {
  void run().catch((error: unknown) => {
    if (error instanceof MigrationError) console.error(`Migration failed: ${error.message}`);
    else {
      const value = error as { code?: string; status?: number; name?: string };
      console.error(`Migration failed unexpectedly (${value.code ?? value.status ?? value.name ?? 'unknown error'}). No secret values were logged.`);
    }
    process.exitCode = 1;
  });
}
