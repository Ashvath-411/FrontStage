import { Toggle } from '../ui/Toggle.jsx';
import { LabeledField } from '../ui/LabeledField.jsx';
import { InstrumentSelect } from './InstrumentSelect.jsx';

export function ViewPrefsForm({ prefs, onChange, joinedInstrument }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-pretitle font-extrabold">My view</h3>
      <p className="text-label text-muted">Saved on this device only.</p>
      <LabeledField label="Text size">
        <select className="field" value={prefs.textSize} onChange={(event) => onChange({ textSize: event.target.value })}>
          <option value="normal">Normal</option>
          <option value="large">Large</option>
          <option value="huge">Huge</option>
        </select>
      </LabeledField>
      <LabeledField label="Chords above or below the words">
        <select className="field" value={prefs.chordsPosition} onChange={(event) => onChange({ chordsPosition: event.target.value })}>
          <option value="below">Below the words</option>
          <option value="above">Above the words</option>
        </select>
      </LabeledField>
      <InstrumentSelect label="Stage notes for" value={prefs.instrument} joinedInstrument={joinedInstrument} onChange={(instrument) => onChange({ instrument })} />
      <Toggle label="Hide lyrics" checked={prefs.hideLyrics} onChange={(hideLyrics) => onChange({ hideLyrics })} />
      <Toggle label="Hide chords (show the lyric large)" checked={prefs.hideChords} onChange={(hideChords) => onChange({ hideChords })} />
    </section>
  );
}
