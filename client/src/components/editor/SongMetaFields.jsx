import { LabeledField } from '../ui/LabeledField.jsx';
import { keyRoots } from '../../musicOptions.js';

export function SongMetaFields({ meta, onChange }) {
  function update(event) {
    onChange({ ...meta, [event.target.name]: event.target.value });
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <LabeledField label="Title" className="col-span-2">
        <input className="field" name="title" value={meta.title} onChange={update} required maxLength={120} />
      </LabeledField>
      <LabeledField label="Artist" className="col-span-2">
        <input className="field" name="artist" value={meta.artist} onChange={update} maxLength={120} />
      </LabeledField>
      <LabeledField label="Key">
        <select className="field" name="keyRoot" value={meta.keyRoot} onChange={update}>
          {keyRoots.map((root) => <option key={root}>{root}</option>)}
        </select>
      </LabeledField>
      <LabeledField label="Mode">
        <select className="field" name="keyMode" value={meta.keyMode} onChange={update}>
          <option value="major">major</option>
          <option value="minor">minor</option>
        </select>
      </LabeledField>
      <LabeledField label="BPM">
        <input className="field tabular" type="number" name="bpm" min={20} max={300} value={meta.bpm} onChange={update} />
      </LabeledField>
      <LabeledField label="Beats per bar">
        <input className="field tabular" type="number" name="beatsPerBar" min={1} max={16} value={meta.beatsPerBar} onChange={update} />
      </LabeledField>
      <LabeledField label="Energy (1 to 5)">
        <input className="field tabular" type="number" name="energy" min={1} max={5} value={meta.energy} onChange={update} />
      </LabeledField>
    </div>
  );
}
