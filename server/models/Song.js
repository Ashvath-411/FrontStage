import mongoose from 'mongoose';

const { Schema } = mongoose;

const barSchema = new Schema({
  chords: {
    type: [{ _id: false, beat: { type: Number, min: 1, max: 17 }, chord: { type: String, required: true, maxlength: 16 } }],
    validate: { validator: (chords) => chords.length <= 16, message: 'A bar has at most 16 chords' }
  },
  lyric: { type: String, maxlength: 300 }
}, { _id: false });

const sectionSchema = new Schema({
  name: { type: String, required: true, maxlength: 60 },
  bpm: { type: Number, min: 20, max: 300 },
  beatsPerBar: { type: Number, min: 1, max: 16 },
  bars: [barSchema]
}, { _id: false });

const annotationSchema = new Schema({
  barIdx: { type: Number, min: 0, required: true },
  kind: { type: String, enum: ['cue', 'dynamics', 'gear', 'transition', 'note'], default: 'note' },
  text: { type: String, required: true, maxlength: 200 },
  audience: { type: [String], default: ['all'] },
  leadInBars: { type: Number, min: 0, max: 8, default: 1 }
}, { _id: false });

const songSchema = new Schema({
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  artist: { type: String, trim: true, maxlength: 120 },
  keyRoot: { type: String, required: true, match: /^[A-G][#b]?$/ },
  keyMode: { type: String, enum: ['major', 'minor'], default: 'major' },
  bpm: { type: Number, required: true, min: 20, max: 300 },
  beatsPerBar: { type: Number, default: 4, min: 1, max: 16 },
  energy: { type: Number, min: 1, max: 5 },
  sections: [sectionSchema],
  annotations: [annotationSchema]
}, { timestamps: true });

export const Song = mongoose.model('Song', songSchema);
