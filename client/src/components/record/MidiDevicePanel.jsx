import { allDevices } from '../../hooks/useMidiInput.js';
import { describeBinding, learnableActions } from '../../midi/midiMessages.js';

const actionLabels = { record: 'Record', stop: 'Stop', play: 'Play take', undo: 'Undo' };

const statusText = {
  unsupported: 'This browser has no Web MIDI. Use Chrome or Edge for a MIDI keyboard. The on-screen keyboard works here.',
  idle: 'Plug in a MIDI keyboard, then connect it.',
  asking: 'Waiting for permission. Allow MIDI in the browser prompt.',
  denied: 'MIDI permission was blocked. Allow it in the site settings (the icon left of the address), then press Connect again.',
  error: 'The MIDI keyboard could not be opened. Unplug it, plug it back in and press Connect again.'
};

function DeviceChoice({ midi }) {
  if (midi.devices.length === 0) return <p className="text-muted">No MIDI keyboard found. Plug one in and it appears here. The on-screen keyboard still works.</p>;
  const missing = midi.deviceId !== allDevices && !midi.devices.some((device) => device.id === midi.deviceId);
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-label text-muted">MIDI input</span>
      <select className="field" value={midi.deviceId} onChange={(event) => midi.setDeviceId(event.target.value)}>
        <option value={allDevices}>All keyboards ({midi.devices.length})</option>
        {midi.devices.map((device) => (
          <option key={device.id} value={device.id}>{device.name}{device.state === 'disconnected' ? ' (unplugged)' : ''}</option>
        ))}
      </select>
      {missing && <span role="status" className="text-label text-alert">That keyboard is unplugged. Plug it back in or pick another.</span>}
    </label>
  );
}

function MidiLearn({ learn, deviceName }) {
  const bindings = learn.bindingsFor(deviceName);
  return (
    <details className="group rounded-[4px] border border-line">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 font-semibold">
        Keyboard buttons for {deviceName}
        <span aria-hidden="true" className="text-muted transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="flex flex-col gap-2 border-t border-line p-3">
        <p className="text-label text-muted">Press Learn, then press a key, pad or button on your MIDI keyboard. A learned key no longer plays a note. Saved on this device for this keyboard.</p>
        {learnableActions.map((action) => {
          const isLearning = learn.learning === action;
          return (
            <div key={action} className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2">
              <span className="min-w-24 font-semibold">{actionLabels[action]}</span>
              <span role={isLearning ? 'status' : undefined} className={`flex-1 text-label ${isLearning ? 'text-cyan' : 'text-muted'}`}>{isLearning ? 'Press a key or button now' : describeBinding(bindings[action])}</span>
              <span className="flex gap-2">
                <button type="button" className={`pill pill-small ${isLearning ? 'pill-selected' : 'pill-secondary'}`} onClick={() => (isLearning ? learn.cancelLearning() : learn.startLearning(action))}>{isLearning ? 'Cancel' : 'Learn'}</button>
                {bindings[action] && !isLearning && <button type="button" className="pill pill-small pill-secondary" aria-label={`Clear ${actionLabels[action]}`} onClick={() => learn.clear(deviceName, action)}>Clear</button>}
              </span>
            </div>
          );
        })}
      </div>
    </details>
  );
}

export function MidiDevicePanel({ midi, learn, learnDevice, children }) {
  const canConnect = ['idle', 'denied', 'error'].includes(midi.status);
  return (
    <section aria-label="MIDI keyboard" className="flex flex-col gap-3">
      {midi.status === 'ready' ? <DeviceChoice midi={midi} /> : <p role="status" className={midi.status === 'denied' || midi.status === 'error' ? 'text-alert' : 'text-muted'}>{statusText[midi.status]}</p>}
      {midi.status === 'ready' && learnDevice && <MidiLearn learn={learn} deviceName={learnDevice} />}
      {canConnect && <div><button type="button" className="pill pill-secondary" onClick={midi.connect}>Connect MIDI keyboard</button></div>}
      {children}
    </section>
  );
}
