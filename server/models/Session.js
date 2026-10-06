import mongoose from 'mongoose';

const { Schema } = mongoose;

const participantSchema = new Schema({
  pid: { type: String, required: true },
  userId: Schema.Types.ObjectId,
  displayName: { type: String, required: true, maxlength: 40 },
  instrument: { type: String, maxlength: 20 },
  isController: { type: Boolean, default: false },
  kicked: { type: Boolean, default: false },
  joinedAt: { type: Date, default: Date.now }
}, { _id: false });

const sessionSchema = new Schema({
  code: { type: String, required: true, unique: true },
  hostId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  setlistId: Schema.Types.ObjectId,
  snapshot: { type: [Schema.Types.Mixed], default: [] },
  passwordHash: { type: String, select: false },
  maxParticipants: { type: Number, default: 8, min: 1, max: 50 },
  locked: { type: Boolean, default: false },
  allowLateJoin: { type: Boolean, default: true },
  controllerPolicy: { type: String, enum: ['host_only', 'selected', 'everyone'], default: 'host_only' },
  settings: {
    nextUpSeconds: { type: Number, default: 8, min: 3, max: 20 },
    autoAdvance: { type: Boolean, default: true },
    startLeadMs: { type: Number, default: 1500, min: 500, max: 5000 },
    showLyrics: { type: Boolean, default: true },
    showAnnotations: { type: Boolean, default: true },
    audioClick: { type: Boolean, default: false }
  },
  state: {
    playState: { type: String, enum: ['idle', 'playing', 'paused', 'ended'], default: 'idle' },
    itemIdx: { type: Number, default: 0 },
    anchorServerMs: { type: Number, default: 0 },
    anchorOffsetMs: { type: Number, default: 0 },
    version: { type: Number, default: 0 }
  },
  participants: [participantSchema],
  endedAt: { type: Date, default: null }
}, { timestamps: true });

export const Session = mongoose.model('Session', sessionSchema);
