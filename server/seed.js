import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from './db.js';
import { User } from './models/User.js';
import { Song } from './models/Song.js';
import { Setlist } from './models/Setlist.js';
import { Session } from './models/Session.js';
import { parseChart } from '../client/src/engine/parseChart.js';
import { amazingGrace, saints } from './seedSongs.js';

const demoEmail = 'demo@frontstage.test';
const demoPassword = 'demo1234';

async function resetDemoHost() {
  const existing = await User.findOne({ email: demoEmail });
  if (existing) {
    await Promise.all([Song.deleteMany({ ownerId: existing._id }), Setlist.deleteMany({ ownerId: existing._id }), Session.deleteMany({ hostId: existing._id })]);
    await existing.deleteOne();
  }
  const passwordHash = await bcrypt.hash(demoPassword, 10);
  return User.create({ email: demoEmail, passwordHash, displayName: 'Demo Host', defaultInstrument: 'keys' });
}

function createSong(ownerId, { chart, ...song }) {
  return Song.create({ ...song, ownerId, sections: parseChart(chart, { beatsPerBar: song.beatsPerBar }) });
}

async function seed() {
  await connectDatabase();
  const host = await resetDemoHost();
  const grace = await createSong(host._id, amazingGrace);
  const marching = await createSong(host._id, saints);
  await Setlist.create({
    ownerId: host._id,
    name: 'Demo set',
    venue: 'Rehearsal room',
    items: [
      { songId: grace._id, countInBars: 1, gapMode: 'countdown', gapSeconds: 8 },
      { songId: marching._id, countInBars: 1, gapMode: 'countdown', gapSeconds: 8 }
    ]
  });
  console.log(`Seeded ${demoEmail} / ${demoPassword} with 2 songs and 1 setlist`);
  await disconnectDatabase();
}

seed();
