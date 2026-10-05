import mongoose from 'mongoose';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function requireObjectBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Request body must be a JSON object');
  return body;
}

export function pickFields(body, allowedFields) {
  requireObjectBody(body);
  return Object.fromEntries(allowedFields.filter((field) => body[field] !== undefined).map((field) => [field, body[field]]));
}

function statusForError(error) {
  if (error instanceof HttpError) return error.status;
  if (error instanceof mongoose.Error.ValidationError) return 400;
  if (error instanceof mongoose.Error.CastError) return 400;
  if (error.type === 'entity.parse.failed') return 400;
  return 500;
}

export function handleErrors(error, req, res, next) {
  const status = statusForError(error);
  if (status === 500) console.error(error);
  const message = status === 500 ? 'Server error' : error.message;
  res.status(status).json({ error: message });
}
