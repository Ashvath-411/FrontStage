import mongoose from 'mongoose';

const joinAttemptSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  pid: { type: String, required: true },
  at: { type: Date, default: Date.now, expires: 600 }
});

export const JoinAttempt = mongoose.model('JoinAttempt', joinAttemptSchema);
