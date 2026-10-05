import mongoose from 'mongoose';

const { Schema } = mongoose;

const setlistItemSchema = new Schema({
  songId: { type: Schema.Types.ObjectId, ref: 'Song', required: true },
  transpose: { type: Number, min: -11, max: 11, default: 0 },
  tempoPct: { type: Number, min: 50, max: 200, default: 100 },
  countInBars: { type: Number, min: 0, max: 4, default: 1 },
  gapMode: { type: String, enum: ['countdown', 'immediate', 'manual'], default: 'countdown' },
  gapSeconds: { type: Number, min: 0, max: 120, default: 8 },
  note: { type: String, maxlength: 200 }
}, { _id: false });

const setlistSchema = new Schema({
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  eventDate: Date,
  venue: { type: String, trim: true, maxlength: 120 },
  items: [setlistItemSchema]
}, { timestamps: true });

export const Setlist = mongoose.model('Setlist', setlistSchema);
