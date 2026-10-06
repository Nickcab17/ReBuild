import app from './app.js';
import { config } from './config.js';
import { createDemoData } from './seed.js';
import { hydrateStore, isDynamoEnabled } from './utils/dynamo.js';

async function startServer() {
  if (isDynamoEnabled()) await hydrateStore();
  if (config.isLocal) await createDemoData();
  app.listen(config.port, () => {
    console.log(`Rebuild API running on http://localhost:${config.port}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
