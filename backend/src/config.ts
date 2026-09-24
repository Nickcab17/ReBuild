import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 3001),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret',
  apiBaseUrl: process.env.API_BASE_URL ?? 'http://localhost:3001',
  isLocal: process.env.NODE_ENV !== 'production',
  dynamoEnabled: process.env.DYNAMODB_ENABLED === 'true',
  dynamoTablePrefix: process.env.DYNAMODB_TABLE_PREFIX ?? 'Rebuild',
  aiVisionApiUrl: process.env.AI_VISION_API_URL ?? '',
  aiVisionApiKey: process.env.AI_VISION_API_KEY ?? '',
  aiVisionModel: process.env.AI_VISION_MODEL ?? 'gpt-4o-mini',
};
