const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const sustainController = 64;
export const pedalDownFrom = 64;

export function parseMidiMessage(bytes) {
  const [status = 0, first = 0, second = 0] = bytes;
  const kind = status & 0xf0;
  const channel = (status & 0x0f) + 1;
  if (kind === 0x90 && second > 0) return { kind: 'noteOn', channel, note: first, velocity: second };
  if (kind === 0x80 || kind === 0x90) return { kind: 'noteOff', channel, note: first, velocity: 0 };
  if (kind === 0xb0) return { kind: 'control', channel, controller: first, value: second };
  if (kind === 0xc0) return { kind: 'program', channel, program: first };
  return { kind: 'other', channel };
}

export function isSustainMessage(message) {
  return message.kind === 'control' && message.controller === sustainController;
}

export function pedalIsDown(value) {
  return value >= pedalDownFrom;
}

export function noteName(pitch) {
  return `${noteNames[pitch % 12]}${Math.floor(pitch / 12) - 1}`;
}

export function pitchClass(pitch) {
  return ((pitch % 12) + 12) % 12;
}
