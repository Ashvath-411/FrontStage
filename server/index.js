import 'dotenv/config';
import { createServer } from 'node:http';
import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './db.js';
import { attachSocket } from './socket.js';

const port = Number(process.env.PORT) || 3000;

async function startServer() {
  await connectDatabase();
  const app = createApp();
  const httpServer = createServer(app);
  app.set('io', attachSocket(httpServer));
  httpServer.listen(port, () => console.log(`FrontStage on http://localhost:${port}`));
  const shutdown = async () => {
    httpServer.close();
    await disconnectDatabase();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer();
