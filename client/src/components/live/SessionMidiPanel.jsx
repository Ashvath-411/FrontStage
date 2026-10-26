import { MidiDevicePanel, midiStatusText } from '../record/MidiDevicePanel.jsx';
import { sessionActionLabels, sessionActions } from '../../midi/sessionMidi.js';

const sessionCopy = {
  status: {
    ...midiStatusText,
    unsupported: 'This browser has no Web MIDI. Use Chrome or Edge to control the session from a MIDI keyboard. The on-screen buttons still work.',
    idle: 'Plug in a MIDI keyboard or pedal, then connect it.'
  },
  noDevice: 'No MIDI keyboard found. Plug one in and it appears here. The on-screen buttons still work.',
  learnTitle: (deviceName) => `Buttons on ${deviceName}`,
  learnHint: 'Press Learn, then press a key, pad, button or pedal. Pressing it afterwards does the action. Saved on this device for this keyboard.',
  learnOpen: true,
  resetAll: true
};

export function SessionMidiPanel({ sessionMidi }) {
  if (sessionMidi.ended) return null;
  return (
    <section aria-labelledby="midi-buttons-title" className="flex flex-col gap-2 border-b border-line py-3">
      <h3 id="midi-buttons-title" className="font-semibold">MIDI buttons</h3>
      {sessionMidi.allowed ? (
        <MidiDevicePanel midi={sessionMidi.midi} learn={sessionMidi.learn} learnDevice={sessionMidi.learnDevice} actions={sessionActions} actionLabels={sessionActionLabels} copy={sessionCopy} label="MIDI keyboard for session controls" />
      ) : (
        <p className="text-label text-muted">Only the host can control the session.</p>
      )}
    </section>
  );
}
