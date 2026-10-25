import { Toggle } from '../ui/Toggle.jsx';
import { Slider } from '../ui/Slider.jsx';

function padStatusText(pad) {
  const { status } = pad;
  if (status.state === 'unsupported') return 'This browser cannot play sound.';
  if (!pad.on) return 'Plays the chart’s chords on the piano. Only this device hears it.';
  if (!pad.running) return 'Tap anywhere to start the pad.';
  if (status.state === 'failed') return 'Piano sound could not load, so a simple tone plays instead.';
  if (status.state === 'loading') return `Loading piano ${status.loaded} of ${status.total || '…'}.`;
  return 'Pad on. Silent during the count-in and between songs.';
}

export function PadControls({ pad }) {
  return (
    <section aria-label="Piano pad" className="flex flex-col gap-2 border-b border-line pb-3">
      <Toggle label="Piano pad on this device" checked={pad.on} onChange={pad.setOn} />
      {pad.on && <Slider label="Pad volume" value={Math.round(pad.volume * 100)} min={0} max={100} step={5} format={(value) => `${value}%`} onChange={(value) => pad.setVolume(value / 100)} />}
      <p role="status" className="text-label text-muted">{padStatusText(pad)}</p>
    </section>
  );
}
