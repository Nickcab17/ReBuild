import { config } from '../config.js';

export type VisionMaterialResult = {
  status: 'ok' | 'not_configured';
  material?: string;
  confidence?: 'Alta' | 'Media' | 'Baja';
  possibleUses?: string[];
  condition?: string;
  message?: string;
};

export async function analyzeMaterialImage(imageDataUrl: string): Promise<VisionMaterialResult> {
  if (!config.aiVisionApiUrl || !config.aiVisionApiKey) {
    return {
      status: 'not_configured',
      message: 'La identificación visual requiere configurar AI_VISION_API_URL y AI_VISION_API_KEY en el backend.',
    };
  }

  if (!imageDataUrl.startsWith('data:image/')) {
    throw new Error('La imagen debe enviarse como data URL.');
  }

  const response = await fetch(config.aiVisionApiUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.aiVisionApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.aiVisionModel,
      response_format: { type: 'json_object' },
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'Identifica el material visible para una app de reutilización. Responde solo JSON con material, confidence (Alta|Media|Baja), possibleUses (array de strings) y condition.' },
          { type: 'image_url', image_url: { url: imageDataUrl } },
        ],
      }],
    }),
  });

  if (!response.ok) throw new Error(`El servicio de visión respondió con HTTP ${response.status}.`);
  const body = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new Error('El servicio de visión no devolvió una identificación.');
  const result = JSON.parse(content) as Omit<VisionMaterialResult, 'status'>;

  return { status: 'ok', material: result.material, confidence: result.confidence, possibleUses: result.possibleUses, condition: result.condition };
}