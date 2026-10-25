export const earliestNoteBeat = -1;
const shortestNoteBeats = 0.01;
export const stopGraceBeats = 0.5;
export const oldestEventMs = 1000;

export function beatSeconds(bpm) {
  return 60 / bpm;
}

export function eventContextTime(eventPerfMs, outputStamp, fallback) {
  if (outputStamp?.performanceTime > 0) return outputStamp.contextTime + (eventPerfMs - outputStamp.performanceTime) / 1000;
  return fallback.currentTime - fallback.latencySeconds - (fallback.nowPerfMs - eventPerfMs) / 1000;
}

export function trustedEventTime(timeStamp, nowPerfMs) {
  const age = nowPerfMs - timeStamp;
  return Number.isFinite(timeStamp) && timeStamp > 0 && age >= 0 && age <= oldestEventMs ? timeStamp : nowPerfMs;
}

export function startTake({ bpm, beatsPerBar, countInBars, startTime }) {
  const countInBeats = countInBars * beatsPerBar;
  return { bpm, beatsPerBar, countInBeats, beatZero: startTime + countInBeats * beatSeconds(bpm), notes: [], pedal: [], open: {} };
}

export function beatAtTime(take, time) {
  return (time - take.beatZero) / beatSeconds(take.bpm);
}

function closeNote(take, pitch, endBeat) {
  const note = take.open[pitch];
  if (!note) return take;
  const open = { ...take.open };
  delete open[pitch];
  const closed = { ...note, end: Math.max(endBeat, note.start + shortestNoteBeats) };
  return { ...take, open, notes: [...take.notes, closed] };
}

export function takeNoteOn(take, pitch, velocity, time) {
  const beat = beatAtTime(take, time);
  if (beat < earliestNoteBeat) return take;
  const closed = closeNote(take, pitch, beat);
  return { ...closed, open: { ...closed.open, [pitch]: { pitch, velocity, start: beat } } };
}

export function takeNoteOff(take, pitch, time) {
  return closeNote(take, pitch, beatAtTime(take, time));
}

export function takePedal(take, down, time) {
  const beat = beatAtTime(take, time);
  if (beat < earliestNoteBeat) return take;
  return { ...take, pedal: [...take.pedal, { beat, down }] };
}

export function finishTake(take, time) {
  const stopBeat = beatAtTime(take, time);
  let closed = take;
  Object.keys(take.open).forEach((pitch) => {
    closed = closeNote(closed, Number(pitch), stopBeat);
  });
  const lastBeat = Math.max(stopBeat - stopGraceBeats, ...closed.notes.map((note) => note.start + shortestNoteBeats));
  const barCount = Math.max(1, Math.ceil(lastBeat / take.beatsPerBar));
  const notes = [...closed.notes]
    .sort((first, second) => first.start - second.start || first.pitch - second.pitch);
  return {
    bpm: take.bpm,
    beatsPerBar: take.beatsPerBar,
    barCount,
    notes,
    pedal: closed.pedal
  };
}

export function clickBeats(fromBeat, toBeat, { countInBeats, beatsPerBar, clickOn }) {
  const beats = [];
  for (let beat = Math.max(Math.ceil(fromBeat), -countInBeats) || 0; beat < toBeat; beat += 1) {
    if (beat >= 0 && !clickOn) continue;
    beats.push({ beat, accent: ((beat % beatsPerBar) + beatsPerBar) % beatsPerBar === 0 });
  }
  return beats;
}

export function positionLabel(beat, beatsPerBar) {
  if (beat < 0) return { countIn: Math.ceil(-beat), bar: null, beat: null };
  return { countIn: null, bar: Math.floor(beat / beatsPerBar) + 1, beat: Math.floor(beat % beatsPerBar) + 1 };
}
