import mongoose from 'mongoose';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const localDataPath = fileURLToPath(new URL('../.data/mongo', import.meta.url));
const localMongoPort = 27717;
const localMongoUri = `mongodb://127.0.0.1:${localMongoPort}/setlist-live`;
let localMongoServer = null;

async function startLocalMongo() {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  await mkdir(localDataPath, { recursive: true });
  try {
    localMongoServer = await MongoMemoryServer.create({
      instance: { dbPath: localDataPath, port: localMongoPort, storageEngine: 'wiredTiger' }
    });
    console.log(`Local MongoDB started with data in ${localDataPath}`);
  } catch {
    console.log('Local MongoDB already running, connecting to it');
  }
  return localMongoUri;
}

export async function connectDatabase(uri = process.env.MONGODB_URI) {
  const resolvedUri = uri || await startLocalMongo();
  await mongoose.connect(resolvedUri);
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
  if (localMongoServer) await localMongoServer.stop({ doCleanup: false });
}
