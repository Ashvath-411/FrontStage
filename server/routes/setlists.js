import { Router } from 'express';
import { Setlist } from '../models/Setlist.js';
import { Song } from '../models/Song.js';
import { requireHost } from '../auth.js';
import { HttpError, pickFields } from '../errors.js';
import { findOwned } from './ownership.js';

export const setlistsRouter = Router();
setlistsRouter.use(requireHost);

const setlistFields = ['name', 'eventDate', 'venue', 'items'];

async function checkSongsBelongToHost(fields, userId) {
  if (fields.items === undefined) return;
  if (!Array.isArray(fields.items)) throw new HttpError(400, 'items must be a list');
  const songIds = [...new Set(fields.items.map((item) => String(item?.songId)))];
  const ownedCount = await Song.countDocuments({ _id: { $in: songIds }, ownerId: userId });
  if (ownedCount !== songIds.length) throw new HttpError(400, 'Every item must be one of your songs');
}

setlistsRouter.get('/', async (req, res) => {
  const setlists = await Setlist.find({ ownerId: req.user.id }).sort({ updatedAt: -1 }).lean();
  res.json(setlists);
});

setlistsRouter.post('/', async (req, res) => {
  const fields = pickFields(req.body, setlistFields);
  await checkSongsBelongToHost(fields, req.user.id);
  const setlist = await Setlist.create({ ...fields, ownerId: req.user.id });
  res.status(201).json(setlist);
});

setlistsRouter.get('/:id', async (req, res) => {
  res.json(await findOwned(Setlist, req.params.id, req.user.id));
});

setlistsRouter.put('/:id', async (req, res) => {
  const setlist = await findOwned(Setlist, req.params.id, req.user.id);
  const fields = pickFields(req.body, setlistFields);
  await checkSongsBelongToHost(fields, req.user.id);
  setlist.set(fields);
  await setlist.save();
  res.json(setlist);
});

setlistsRouter.delete('/:id', async (req, res) => {
  const setlist = await findOwned(Setlist, req.params.id, req.user.id);
  await setlist.deleteOne();
  res.status(204).end();
});
