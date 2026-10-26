import { Toggle } from '../ui/Toggle.jsx';
import { Slider } from '../ui/Slider.jsx';
import { padStatusText } from '../../midi/padPlayer.js';

export function PadControls({ pad }) {
  return (
    <section aria-label="Piano pad" className="flex flex-col gap-2 border-b border-line pb-3">
      <Toggle label="Piano pad on this device" checked={pad.on} onChange={pad.setOn} />
      {pad.on && <Slider label="Pad volume" value={Math.round(pad.volume * 100)} min={0} max={100} step={5} format={(value) => `${value}%`} onChange={(value) => pad.setVolume(value / 100)} />}
      <p role="status" className="text-label text-muted">{padStatusText({ ...pad.status, on: pad.on, running: pad.running, chord: pad.chord })}</p>
      {!pad.on && <p className="text-label text-muted">Plays the chart’s chords on the piano. Only this device hears it. Silent during the count-in and between songs.</p>}
    </section>
  );
}
