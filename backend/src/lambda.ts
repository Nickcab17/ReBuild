import serverless from 'serverless-http';
import app from './app.js';
import { config } from './config.js';
import { hydrateStore, isDynamoEnabled } from './utils/dynamo.js';

const proxy = serverless(app);

export async function handler(event: Parameters<typeof proxy>[0], context: Parameters<typeof proxy>[1]) {
  if (!isDynamoEnabled()) {
    throw new Error('DynamoDB persistence must be enabled for the Lambda API.');
  }
  if (!config.jwtSecret) {
    throw new Error('A production JWT_SECRET must be configured for the Lambda API.');
  }
  await hydrateStore();
  return proxy(event, context);
}
