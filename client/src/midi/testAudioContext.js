function fakeParam(value = 0) {
  const param = { value, events: [] };
  for (const name of ['setValueAtTime', 'cancelScheduledValues', 'setTargetAtTime', 'exponentialRampToValueAtTime', 'linearRampToValueAtTime']) {
    param[name] = (...args) => {
      param.events.push([name, ...args]);
      return param;
    };
  }
  return param;
}

function fakeNode(context, extra) {
  return { connect: (target) => target, disconnect() {}, ...extra };
}

function fakeSource(context, kind, extra) {
  const source = fakeNode(context, { kind, startedAt: null, stoppedAt: null, onended: null, ...extra });
  source.start = (when = 0) => {
    source.startedAt = when;
    context.started.push(source);
  };
  source.stop = (when = 0) => {
    source.stoppedAt = when;
  };
  return source;
}

export function createTestAudioContext() {
  const context = { currentTime: 0, state: 'running', started: [], destination: {} };
  context.createGain = () => fakeNode(context, { gain: fakeParam(1) });
  context.createBiquadFilter = () => fakeNode(context, { type: 'lowpass', frequency: fakeParam(350) });
  context.createDynamicsCompressor = () => fakeNode(context, { threshold: fakeParam(-24), knee: fakeParam(30), ratio: fakeParam(12), attack: fakeParam(0.003), release: fakeParam(0.25) });
  context.createOscillator = () => fakeSource(context, 'oscillator', { type: 'sine', frequency: fakeParam(440) });
  context.createBufferSource = () => fakeSource(context, 'buffer', { buffer: null, playbackRate: fakeParam(1) });
  context.decodeAudioData = async () => ({ duration: 1 });
  return context;
}
