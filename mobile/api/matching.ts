export type MaterialClassification = {
  material: string;
  type?: string;
  condition: string;
  estimatedCategory: string;
  keywords: string[];
};

export type PublicationIntent = 'OFRECER' | 'SOLICITAR' | 'DESCONOCIDA';

export type PublicationProfile = {
  intencion: PublicationIntent;
  material: string;
  tipo?: string;
  cantidad?: number;
  unidad?: string;
  dimensiones?: string;
  color?: string;
  estado?: string;
  uso?: string;
  ubicacion?: string;
  descripcion: string;
  keywords: string[];
  originalText: string;
};

const MATERIAL_ALIASES: Record<string, string[]> = {
  madera: ['madera', 'tabla', 'tablas', 'triplay', 'pino', 'pinotea', 'mueble', 'melamina', 'tablon', 'tablones'],
  ceramica: ['ceramica', 'ceramica', 'azulejo', 'azulejos', 'baldosa', 'baldosas', 'loseta', 'losetas', 'porcelanato', 'ceramic'],
  cemento: ['cemento', 'hormigon', 'hormigon', 'mortero', 'concreto'],
  pvc: ['pvc', 'tuberia', 'tuberia', 'tubo', 'tubos', 'plastica', 'plastico', 'tuberia plastica'],
  carton: ['carton', 'carton', 'cartulina', 'corrugado', 'lamina', 'lamina', 'tablero'],
  metal: ['metal', 'acero', 'hierro', 'perfil', 'perfiles', 'tubo', 'tubos', 'lata', 'lamina'],
  pintura: ['pintura', 'barniz', 'brocha', 'laca', 'color', 'esmalte'],
  herramientas: ['martillo', 'taladro', 'llave', 'herramienta', 'destornillador', 'sierra', 'broca', 'brocas'],
  electrico: ['cable', 'cables', 'electrico', 'electricidad', 'tomacorriente', 'transformador', 'motor'],
};

const CATEGORY_LABELS: Record<string, string> = {
  madera: 'Madera',
  ceramica: 'Construcción',
  cemento: 'Construcción',
  pvc: 'Plástico',
  carton: 'Otros',
  metal: 'Metal',
  pintura: 'Pintura',
  herramientas: 'Herramientas',
  electrico: 'Material eléctrico',
};

const OFFER_WORDS = ['me sobran', 'me sobraron', 'tengo', 'tiene', 'ofrezco', 'ofrece', 'dispongo', 'queda', 'quedan', 'me quedaron', 'me queda', 'sobrante'];
const REQUEST_WORDS = ['busco', 'necesito', 'quiero', 'requiero', 'estoy buscando', 'solicito', 'buscan', 'necesita'];
const COLOR_WORDS = ['blanco', 'blanca', 'gris', 'negro', 'rojo', 'azul', 'verde', 'amarillo', 'beige', 'marron'];
const STOP_WORDS = new Set(['para', 'mi', 'muy', 'como', 'que', 'con', 'por', 'sin', 'desde', 'hasta', 'despues', 'después', 'de', 'del', 'tras', 'una', 'unas', 'unos', 'algo', 'sobre', 'despues']);

const normalizeText = (value: string) => value
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

function canonicalMaterialKey(text: string): string | null {
  const normalized = normalizeText(text);
  for (const [key, aliases] of Object.entries(MATERIAL_ALIASES)) {
    if (aliases.some((alias) => normalized.includes(alias))) return key;
  }
  return null;
}

function extractQuantityAndUnit(text: string) {
  const match = /(\d+(?:[.,]\d+)?)\s*(piezas?|pieza|bolsas?|bote|botes|tablas?|tabla|metros?|metro|kg|kilogramos?|set|sets|rollos?|rollo|latas?|lata)/i.exec(text);
  if (!match) return { cantidad: undefined, unidad: undefined };
  return { cantidad: Number(match[1].replace(',', '.')), unidad: match[2].toLowerCase() };
}

function resolveCondition(text: string) {
  if (/(nueva|nuevo|nuevas|nuevos|excelente|en buen estado|buen estado)/i.test(text)) return 'nuevo';
  if (/(usada|usado|gastada|gastado|vieja|viejo|deteriorada|dañada)/i.test(text)) return 'usado';
  if (/(buena|buen|aceptable)/i.test(text)) return 'bueno';
  return 'desconocido';
}

function extractUsage(text: string) {
  if (/(reparacion|reparación|reparar|arreglar|pared|baño|mesa|mueble|proyecto|construir|obra|techo|piso|cocina)/i.test(text)) {
    if (/(baño|sanitario)/i.test(text)) return 'baño';
    if (/(pared|reparacion|reparación|obra|reparar|arreglar)/i.test(text)) return 'reparación';
    if (/(mesa|mueble|estanteria|repisa|proyecto)/i.test(text)) return 'proyecto';
    if (/(piso|suelo)/i.test(text)) return 'piso';
    return 'proyecto';
  }
  return undefined;
}

function extractDimensions(text: string) {
  const match = /(?:aproximadamente\s*)?(\d+(?:[.,]\d+)?)\s*(metros?|cm|mm|m\b)/i.exec(text);
  return match ? `${match[1]} ${match[2]}` : undefined;
}

function extractColor(text: string) {
  for (const color of COLOR_WORDS) if (new RegExp(color, 'i').test(text)) return color;
  return undefined;
}

function extractLocation(text: string) {
  const locationMatch = /(ciudad de mexico|ciudad de méxico|guadalajara|monterrey|queretaro|querétaro|mexico|cdmx|gdl|estado de mexico|estado de méxico)/i.exec(text);
  return locationMatch ? locationMatch[0].trim() : undefined;
}

function getKeywords(text: string) {
  return Array.from(new Set(
    normalizeText(text)
      .split(/\s+/)
      .filter((word) => word.length > 2 && !STOP_WORDS.has(word)),
  )).slice(0, 8);
}

export function extractPublicationProfile(text: string): PublicationProfile {
  const cleaned = text.trim();
  const normalized = normalizeText(cleaned);
  const intencion: PublicationIntent = OFFER_WORDS.some((word) => normalized.includes(word))
    ? 'OFRECER'
    : REQUEST_WORDS.some((word) => normalized.includes(word))
      ? 'SOLICITAR'
      : 'DESCONOCIDA';

  const materialKey = canonicalMaterialKey(normalized) ?? 'material';
  const material = materialKey === 'material' ? 'material' : materialKey;
  const tipo = materialKey === 'madera' && /(pino|madera)/i.test(normalized) ? 'pino' : undefined;
  const quantity = extractQuantityAndUnit(normalized);

  return {
    intencion,
    material,
    tipo,
    cantidad: quantity.cantidad,
    unidad: quantity.unidad,
    dimensiones: extractDimensions(normalized),
    color: extractColor(normalized),
    estado: resolveCondition(normalized),
    uso: extractUsage(normalized),
    ubicacion: extractLocation(normalized),
    descripcion: cleaned,
    keywords: getKeywords(normalized),
    originalText: cleaned,
  };
}

export function findMaterialMatches(materialText: string, requestText?: string) {
  const offerProfile = extractPublicationProfile(materialText);
  const requestProfile = requestText ? extractPublicationProfile(requestText) : offerProfile;

  const offerMaterial = canonicalMaterialKey(offerProfile.originalText) ?? offerProfile.material;
  const requestMaterial = canonicalMaterialKey(requestProfile.originalText) ?? requestProfile.material;
  const sharedTokens = Array.from(new Set([...offerProfile.keywords, ...requestProfile.keywords]))
    .filter((token) => offerProfile.keywords.includes(token) && requestProfile.keywords.includes(token));

  const materialCompatible = !!offerMaterial && !!requestMaterial && offerMaterial === requestMaterial;
  const relatedMaterial = !!offerMaterial && !!requestMaterial && (
    offerMaterial === requestMaterial
    || (offerMaterial === 'madera' && requestMaterial === 'ceramica')
    || (offerMaterial === 'ceramica' && requestMaterial === 'madera')
  );

  let score = 20;
  if (materialCompatible) score += 38;
  else if (relatedMaterial) score += 18;
  if (offerProfile.intencion !== 'DESCONOCIDA' && requestProfile.intencion !== 'DESCONOCIDA' && offerProfile.intencion !== requestProfile.intencion) score += 24;
  if (offerProfile.tipo && requestProfile.tipo && offerProfile.tipo === requestProfile.tipo) score += 10;
  if (offerProfile.uso && requestProfile.uso && offerProfile.uso === requestProfile.uso) score += 10;
  if (offerProfile.color && requestProfile.color && offerProfile.color === requestProfile.color) score += 8;
  if (offerProfile.cantidad && requestProfile.cantidad && requestProfile.cantidad <= offerProfile.cantidad) score += 6;
  if (offerProfile.ubicacion && requestProfile.ubicacion && offerProfile.ubicacion.toLowerCase() === requestProfile.ubicacion.toLowerCase()) score += 10;
  if (sharedTokens.length > 0) score += Math.min(18, sharedTokens.length * 8);

  const finalScore = Math.min(100, Math.max(0, score));
  const matches = Array.from(new Set([
    ...(materialCompatible ? [offerMaterial] : []),
    ...sharedTokens,
    ...[offerProfile.material, requestProfile.material].filter((value) => value && value !== 'material'),
  ])).filter(Boolean);
  const suggestedCategory = (materialCompatible || offerMaterial)
    ? (CATEGORY_LABELS[offerMaterial] ?? CATEGORY_LABELS[requestMaterial] ?? 'Otros')
    : 'Otros';

  return {
    suggestedCategory,
    score: Math.round(finalScore),
    matches,
    compatible: finalScore >= 60,
    offerProfile,
    requestProfile,
  };
}
