import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { apiRouter } from './routes/api.js';
import { createDemoData } from './seed.js';
import { hydrateStore, isDynamoEnabled } from './utils/dynamo.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use('/api', apiRouter);

const startServer = async () => {
  if (isDynamoEnabled()) await hydrateStore();
  await createDemoData();
  app.listen(config.port, () => {
    console.log(`Rebuild API running on http://localhost:${config.port}`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});

export default app;
