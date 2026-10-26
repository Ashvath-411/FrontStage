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

export const learnableActions = ['record', 'stop', 'play', 'undo'];
const buttonPressFrom = 64;

export function bindingFromMessage(message, { allowSustain = false } = {}) {
  if (message.kind === 'noteOn') return { type: 'note', channel: message.channel, number: message.note };
  if (message.kind === 'control' && (allowSustain || !isSustainMessage(message)) && message.value >= buttonPressFrom) return { type: 'control', channel: message.channel, number: message.controller };
  if (message.kind === 'program') return { type: 'program', channel: message.channel, number: message.program };
  return null;
}

function messageMatches(binding, message) {
  if (binding.channel !== message.channel) return false;
  if (binding.type === 'note') return (message.kind === 'noteOn' || message.kind === 'noteOff') && message.note === binding.number;
  if (binding.type === 'control') return message.kind === 'control' && message.controller === binding.number;
  return message.kind === 'program' && message.program === binding.number;
}

export function boundAction(bindings, message, actions = learnableActions) {
  const action = actions.find((name) => bindings[name] && messageMatches(bindings[name], message));
  if (!action) return null;
  const pressed = message.kind === 'noteOn' || message.kind === 'program' || (message.kind === 'control' && message.value >= buttonPressFrom);
  return { action, pressed };
}

export function describeBinding(binding) {
  if (!binding) return 'Not set';
  if (binding.type === 'note') return `Key ${noteName(binding.number)} · channel ${binding.channel}`;
  if (binding.type === 'control') return `Control ${binding.number} · channel ${binding.channel}`;
  return `Program ${binding.number + 1} · channel ${binding.channel}`;
}

export function readBindings(text, actions = learnableActions) {
  try {
    const parsed = JSON.parse(text ?? '{}');
    return Object.fromEntries(actions.filter((name) => parsed?.[name]?.type).map((name) => [name, parsed[name]]));
  } catch {
    return {};
  }
}
