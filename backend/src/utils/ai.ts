export type MaterialClassification = {
  material: string;
  type?: string;
  condition: string;
  estimatedCategory: string;
  keywords: string[];
};

const keywordMap: Record<string, string[]> = {
  madera: ['madera', 'tabla', 'triplay', 'pino', 'mueble'],
  metal: ['metal', 'acero', 'hierro', 'tubo', 'perfil'],
  pintura: ['pintura', 'brocha', 'barniz', 'laca', 'color'],
  herramientas: ['martillo', 'taladro', 'llave', 'herramienta', 'destornillador'],
  plastico: ['plástico', 'tubo', 'bidón', 'tapa', 'perfil'],
  electric: ['cable', 'tomacorriente', 'transformador', 'motor', 'electricidad'],
};

export function classifyMaterial(input: string): MaterialClassification {
  const text = input.toLowerCase();

  let material = 'otros';
  for (const [key, words] of Object.entries(keywordMap)) {
    if (words.some((word) => text.includes(word))) {
      material = key;
      break;
    }
  }

  const condition = /usada|gastada|vieja|usado/.test(text)
    ? 'usado'
    : /nueva|buena|excelente/.test(text)
      ? 'bueno'
      : 'usado';

  const keywords = Array.from(
    new Set(
      text
        .replace(/[^a-záéíóúñü\s]/g, ' ')
        .split(/\s+/)
        .filter((word) => word.length > 2)
        .slice(0, 6),
    ),
  );

  return {
    material,
    type: material === 'madera' ? 'pino' : undefined,
    condition,
    estimatedCategory: material === 'otros' ? 'Otros' : material,
    keywords: keywords.length ? keywords : ['material', 'reutilizable'],
  };
}

export function findMaterialMatches(materialText: string, requestText?: string) {
  const source = classifyMaterial(materialText);
  const candidate = requestText ? classifyMaterial(requestText) : source;

  const score = Math.min(
    100,
    40 +
      (source.estimatedCategory === candidate.estimatedCategory ? 30 : 0) +
      (source.keywords.some((word) => candidate.keywords.includes(word)) ? 20 : 0) +
      (source.material === candidate.material ? 10 : 0),
  );

  return {
    suggestedCategory: source.estimatedCategory,
    score,
    matches: source.keywords.filter((word) => candidate.keywords.includes(word)),
  };
}
