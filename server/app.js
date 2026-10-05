import express from 'express';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { attachCaller } from './auth.js';
import { handleErrors } from './errors.js';
import { timeRouter } from './routes/time.js';
import { authRouter } from './routes/auth.js';
import { songsRouter } from './routes/songs.js';
import { setlistsRouter } from './routes/setlists.js';
import { sessionsRouter } from './routes/sessions.js';

const clientDistPath = fileURLToPath(new URL('../client/dist', import.meta.url));

function serveClient(app) {
  if (!existsSync(clientDistPath)) return;
  app.use(express.static(clientDistPath));
  app.get('/{*clientRoute}', (req, res) => res.sendFile('index.html', { root: clientDistPath }));
}

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));
  app.use('/api', attachCaller);
  app.use('/api/time', timeRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/songs', songsRouter);
  app.use('/api/setlists', setlistsRouter);
  app.use('/api/sessions', sessionsRouter);
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
  app.use(handleErrors);
  serveClient(app);
  return app;
}
