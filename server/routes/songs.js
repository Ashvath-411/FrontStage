import { Router } from 'express';
import { Song } from '../models/Song.js';
import { Setlist } from '../models/Setlist.js';
import { requireHost } from '../auth.js';
import { pickFields } from '../errors.js';
import { findOwned } from './ownership.js';

export const songsRouter = Router();
songsRouter.use(requireHost);

const songFields = ['title', 'artist', 'keyRoot', 'keyMode', 'bpm', 'beatsPerBar', 'energy', 'sections', 'annotations'];

function songSummary(song) {
  const barCount = song.sections.reduce((total, section) => total + section.bars.length, 0);
  return { _id: song._id, title: song.title, artist: song.artist, keyRoot: song.keyRoot, keyMode: song.keyMode, bpm: song.bpm, beatsPerBar: song.beatsPerBar, barCount, updatedAt: song.updatedAt };
}

songsRouter.get('/', async (req, res) => {
  const songs = await Song.find({ ownerId: req.user.id }).sort({ title: 1 }).lean();
  res.json(songs.map(songSummary));
});

songsRouter.post('/', async (req, res) => {
  const song = await Song.create({ ...pickFields(req.body, songFields), ownerId: req.user.id });
  res.status(201).json(song);
});

songsRouter.get('/:id', async (req, res) => {
  res.json(await findOwned(Song, req.params.id, req.user.id));
});

songsRouter.put('/:id', async (req, res) => {
  const song = await findOwned(Song, req.params.id, req.user.id);
  song.set(pickFields(req.body, songFields));
  await song.save();
  res.json(song);
});

songsRouter.delete('/:id', async (req, res) => {
  const song = await findOwned(Song, req.params.id, req.user.id);
  await song.deleteOne();
  await Setlist.updateMany({ ownerId: req.user.id }, { $pull: { items: { songId: song._id } } });
  res.status(204).end();
});
