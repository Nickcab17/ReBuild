import test from 'node:test';
import assert from 'node:assert/strict';

import { extractPublicationProfile, findMaterialMatches } from '../src/utils/ai.js';

test('detecta coincidencia entre madera ofrecida y madera solicitada', () => {
  const result = findMaterialMatches(
    'Me sobraron 5 tablas de madera de pino de aproximadamente 2 metros después de hacer unos muebles. Están en buen estado.',
    'Busco madera para construir una repisa para mi casa.'
  );

  assert.ok(result.score >= 70, `Esperaba una puntuación alta, recibió ${result.score}`);
  assert.ok(result.matches.length > 0, 'Debe detectar palabras clave compartidas');
  assert.equal(result.suggestedCategory, 'Madera');
});

test('detecta azulejo y cerámica como materiales relacionados', () => {
  const result = findMaterialMatches(
    'Tengo varias piezas de azulejo blanco que sobraron de una remodelación de baño.',
    'Necesito algunas piezas de cerámica blanca para terminar mi baño.'
  );

  assert.ok(result.score >= 60, `Esperaba coincidencia semántica, recibió ${result.score}`);
  assert.ok(result.matches.length > 0, 'Debe reconocer que azulejo y cerámica están relacionados');
});

test('no conecta publicaciones sin relación real', () => {
  const result = findMaterialMatches(
    'Tengo cables eléctricos.',
    'Estoy buscando madera para una mesa.'
  );

  assert.ok(result.score < 45, `No debería haber coincidencia real, recibió ${result.score}`);
});

test('extrae intención, material y cantidad de forma estructurada', () => {
  const profile = extractPublicationProfile('Me sobraron 4 bolsas de cemento gris nuevas de una remodelación.');

  assert.equal(profile.intencion, 'OFRECER');
  assert.equal(profile.material, 'cemento');
  assert.equal(profile.cantidad, 4);
  assert.equal(profile.unidad, 'bolsas');
  assert.match(profile.descripcion, /me sobraron/i);
});
