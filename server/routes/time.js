import { Router } from 'express';

export const timeRouter = Router();

timeRouter.get('/', (req, res) => {
  res.json({ now: Date.now() });
});
