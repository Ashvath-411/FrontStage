import { allDevices } from '../../hooks/useMidiInput.js';

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

export function MidiDevicePanel({ midi, children }) {
  const canConnect = ['idle', 'denied', 'error'].includes(midi.status);
  return (
    <section aria-label="MIDI keyboard" className="flex flex-col gap-3">
      {midi.status === 'ready' ? <DeviceChoice midi={midi} /> : <p role="status" className={midi.status === 'denied' || midi.status === 'error' ? 'text-alert' : 'text-muted'}>{statusText[midi.status]}</p>}
      {canConnect && <div><button type="button" className="pill pill-secondary" onClick={midi.connect}>Connect MIDI keyboard</button></div>}
      {children}
    </section>
  );
}
