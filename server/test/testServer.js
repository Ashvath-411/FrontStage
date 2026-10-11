import { createServer } from 'node:http';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app.js';
import { connectDatabase, disconnectDatabase } from '../db.js';
import { attachSocket } from '../socket.js';

export async function startTestServer() {
  const mongoServer = await MongoMemoryServer.create();
  await connectDatabase(mongoServer.getUri('setlist-test'));
  const app = createApp();
  const httpServer = createServer(app);
  const io = attachSocket(httpServer);
  app.set('io', io);
  await new Promise((resolve) => httpServer.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${httpServer.address().port}`;
  const stop = async () => {
    io.close();
    httpServer.close();
    await disconnectDatabase();
    await mongoServer.stop();
  };
  return { baseUrl, httpServer, stop };
}

export function apiClient(baseUrl) {
  return async function call(method, path, body, token) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${baseUrl}/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };
}

export async function registerHost(call, email = 'host@example.com') {
  const response = await call('POST', '/auth/register', { email, password: 'password123', displayName: 'Host' });
  return response.body.token;
}
