import assert from 'node:assert/strict';
import test from 'node:test';
import { findMaterialMatches as findBackendMatches } from '../../backend/src/utils/ai.js';
import { findMaterialMatches as findVercelMatches } from '../api/matching.js';

test('Vercel matching preserves backend scores, reasons, and compatibility', () => {
  const cases: Array<[string, string | undefined]> = [
    ['20 blocks de concreto, buen estado, CDMX', 'Necesito blocks de concreto para una obra pequeña en CDMX.'],
    ['Me sobraron 12 tablas de pino en buen estado', 'Busco tablas de madera para construir una repisa.'],
    ['Azulejo cerámico blanco nuevo', 'Necesito loseta para terminar el piso de un baño.'],
    ['Tubos de PVC usados', 'Busco tubería plástica para reparar una instalación.'],
    ['Materiales sobrantes de construcción', undefined],
  ];

  for (const [offer, request] of cases) {
    assert.deepEqual(findVercelMatches(offer, request), findBackendMatches(offer, request));
  }
});
