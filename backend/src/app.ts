import express from 'express';
import cors from 'cors';
import { apiRouter } from './routes/api.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use('/api', apiRouter);

export default app;
