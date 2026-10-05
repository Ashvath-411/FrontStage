import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { signHostToken, requireHost } from '../auth.js';
import { HttpError, requireObjectBody } from '../errors.js';

export const authRouter = Router();

function publicUser(user) {
  return { id: String(user._id), email: user.email, displayName: user.displayName, defaultInstrument: user.defaultInstrument ?? '' };
}

function readCredentials(body) {
  requireObjectBody(body);
  const { email, password } = body;
  if (typeof email !== 'string' || !email.trim()) throw new HttpError(400, 'Email is required');
  if (typeof password !== 'string' || password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');
  return { email: email.trim().toLowerCase(), password };
}

authRouter.post('/register', async (req, res) => {
  const { email, password } = readCredentials(req.body);
  const displayName = typeof req.body.displayName === 'string' ? req.body.displayName.trim() : '';
  if (!displayName) throw new HttpError(400, 'Display name is required');
  if (await User.exists({ email })) throw new HttpError(409, 'An account with this email already exists');
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, passwordHash, displayName });
  res.status(201).json({ token: signHostToken(user), user: publicUser(user) });
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = readCredentials(req.body);
  const user = await User.findOne({ email });
  const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!passwordMatches) throw new HttpError(401, 'Wrong email or password');
  res.json({ token: signHostToken(user), user: publicUser(user) });
});

authRouter.get('/me', requireHost, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new HttpError(401, 'Account not found');
  res.json({ user: publicUser(user) });
});
