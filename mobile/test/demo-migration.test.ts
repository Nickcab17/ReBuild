import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildMigrationRecords,
  planRecords,
  stableDemoUuid,
  summarizeMigrationPreview,
  type MigrationRecord,
} from '../scripts/migrate-demo-to-supabase.js';

const targetUserId = '123e4567-e89b-42d3-a456-426614174000';
const runAt = new Date('2026-10-05T12:00:00.000Z');

function emptyRows() {
  return { materials: [] as Array<Record<string, unknown>>, requests: [] as Array<Record<string, unknown>> };
}

test('demo migration uses the exact 16 source IDs with UUIDs and target ownership', () => {
  const records = buildMigrationRecords(targetUserId, runAt);
  assert.equal(records.length, 16);
  assert.equal(records.filter(({ table }) => table === 'materials').length, 8);
  assert.equal(records.filter(({ table }) => table === 'requests').length, 8);
  assert.deepEqual(records.map(({ sourceId }) => sourceId), [
    'mat-01', 'mat-02', 'mat-03', 'mat-05', 'mat-06',
    'req-01', 'req-02',
    'web-azulejo-01', 'web-azulejo-02', 'web-azulejo-03', 'web-azulejo-04',
    'web-azulejo-05', 'web-azulejo-06', 'web-wood-01', 'web-brick-01', 'web-paint-01',
  ]);
  for (const { row } of records) {
    assert.match(row.id, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    assert.equal(row.user_id, targetUserId);
  }
});

test('demo migration keeps source deadlines and uses stable IDs for repeat runs', () => {
  const first = buildMigrationRecords(targetUserId, runAt);
  const second = buildMigrationRecords(targetUserId, new Date('2027-01-01T00:00:00.000Z'));
  assert.deepEqual(first.map(({ row }) => row.id), second.map(({ row }) => row.id));
  const datedRequests = first.filter((record): record is Extract<MigrationRecord, { table: 'requests' }> => record.table === 'requests' && record.hasSourceDeadline);
  assert.deepEqual(datedRequests.map(({ row }) => row.needed_by), [
    '2025-07-12T00:00:00.000Z',
    '2025-07-20T00:00:00.000Z',
  ]);
  const undated = first.find((record) => record.table === 'requests' && record.sourceId === 'web-azulejo-04');
  assert.ok(undated && undated.table === 'requests');
  assert.equal(undated.row.needed_by, runAt.toISOString());
});

test('re-running the migration skips stable-ID records without changing them', () => {
  const records = buildMigrationRecords(targetUserId, runAt);
  const firstPlan = planRecords(records, emptyRows());
  assert.equal(firstPlan.filter(({ action }) => action === 'insert').length, 16);

  const afterFirstRun = emptyRows();
  for (const { record } of firstPlan) {
    afterFirstRun[record.table].push({ ...record.row, created_at: runAt.toISOString() });
  }
  const secondPlan = planRecords(records, afterFirstRun);
  assert.equal(secondPlan.filter(({ action }) => action === 'insert').length, 0);
  assert.equal(secondPlan.filter(({ reason }) => reason === 'stable-id').length, 16);
});

test('migration skips an equivalent existing user publication and rejects a conflicting stable ID', () => {
  const records = buildMigrationRecords(targetUserId, runAt);
  const offer = records.find((record) => record.table === 'materials');
  assert.ok(offer && offer.table === 'materials');
  const equivalent = { ...offer.row, id: '123e4567-e89b-42d3-a456-426614174001' };
  const current = emptyRows();
  current.materials.push(equivalent);
  const plan = planRecords([offer], current);
  assert.equal(plan[0].action, 'skip');
  assert.equal(plan[0].reason, 'equivalent-content');

  const conflictingId = emptyRows();
  conflictingId.materials.push({ ...offer.row, name: 'Un registro distinto' });
  assert.throws(() => planRecords([offer], conflictingId), /Conflicto/);
});

test('stable demo UUIDs are deterministic and source-kind scoped', () => {
  assert.equal(stableDemoUuid('materials', 'mat-01'), stableDemoUuid('materials', 'mat-01'));
  assert.notEqual(stableDemoUuid('materials', 'mat-01'), stableDemoUuid('requests', 'mat-01'));
});

test('dry-run summary reports insertions, skips, and conflicts without changing existing records', () => {
  const records = buildMigrationRecords(targetUserId, runAt);
  const existing = emptyRows();
  const [stableOffer, equivalentOffer, conflictingRequest] = [
    records.find((record) => record.table === 'materials')!,
    records.find((record) => record.table === 'materials' && record.sourceId === 'mat-02')!,
    records.find((record) => record.table === 'requests')!,
  ];
  existing.materials.push({ ...stableOffer.row });
  existing.materials.push({ ...equivalentOffer.row, id: '123e4567-e89b-42d3-a456-426614174001' });
  if (conflictingRequest.table !== 'requests') throw new Error('Expected a request record.');
  existing.requests.push({ ...conflictingRequest.row, material: 'Conflicting source row' });

  const summary = summarizeMigrationPreview(records, existing);
  assert.equal(summary.account.email, 'nicocg170709@gmail.com');
  assert.equal(summary.account.userId, targetUserId);
  assert.equal(summary.publications.length, 16);
  assert.equal(summary.offersFound, 8);
  assert.equal(summary.requestsFound, 8);
  assert.equal(summary.offersToInsert, 6);
  assert.equal(summary.offersSkipped, 2);
  assert.equal(summary.requestsToInsert, 7);
  assert.equal(summary.requestsSkipped, 0);
  assert.equal(summary.conflicts, 1);

  const stable = summary.publications.find(({ demoId }) => demoId === stableOffer.sourceId);
  assert.ok(stable);
  assert.equal(stable.status, 'skip');
  assert.match(stable.reason, /ID determinístico/);
  assert.equal(stable.migrationId, stableOffer.row.id);
  assert.equal(stable.existingId, stableOffer.row.id);

  const equivalent = summary.publications.find(({ demoId }) => demoId === equivalentOffer.sourceId);
  assert.ok(equivalent);
  assert.equal(equivalent.status, 'skip');
  assert.match(equivalent.reason, /equivalente/);
  assert.equal(equivalent.existingId, '123e4567-e89b-42d3-a456-426614174001');

  const conflict = summary.publications.find(({ demoId }) => demoId === conflictingRequest.sourceId);
  assert.ok(conflict);
  assert.equal(conflict.type, 'request');
  assert.equal(conflict.status, 'conflict');
  assert.match(conflict.reason, /Conflicto/);

  const insert = summary.publications.find(({ status }) => status === 'insert');
  assert.ok(insert);
  assert.match(insert.reason, /No se encontró/);
  assert.equal(insert.migrationId, records.find(({ sourceId }) => sourceId === insert.demoId)?.row.id);

  assert.equal(
    summary.publications.filter(({ status }) => status === 'insert' || status === 'skip' || status === 'conflict').length,
    16,
  );
});
