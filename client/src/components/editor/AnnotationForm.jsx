import { useState } from 'react';
import { LabeledField } from '../ui/LabeledField.jsx';
import { AudiencePicker } from './AudiencePicker.jsx';
import { annotationKinds } from '../../musicOptions.js';

const emptyAnnotation = { kind: 'cue', text: '', audience: ['all'], leadInBars: 1 };

export function AnnotationForm({ barIdx, onAdd, onClose }) {
  const [draft, setDraft] = useState(emptyAnnotation);

  function update(event) {
    setDraft({ ...draft, [event.target.name]: event.target.value });
  }

  function submit(event) {
    event.preventDefault();
    if (!draft.text.trim()) return;
    onAdd({ ...draft, barIdx, text: draft.text.trim(), leadInBars: Number(draft.leadInBars) });
    setDraft(emptyAnnotation);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 border-t border-line pt-5">
      <h3 className="text-pretitle font-extrabold">Note on bar {barIdx + 1}</h3>
      <div className="grid grid-cols-2 gap-4">
        <LabeledField label="Kind">
          <select className="field" name="kind" value={draft.kind} onChange={update}>
            {annotationKinds.map((kind) => <option key={kind}>{kind}</option>)}
          </select>
        </LabeledField>
        <LabeledField label="Show bars before">
          <input className="field tabular" type="number" name="leadInBars" min={0} max={8} value={draft.leadInBars} onChange={update} />
        </LabeledField>
      </div>
      <LabeledField label="Text">
        <input className="field" name="text" value={draft.text} onChange={update} maxLength={200} placeholder="Drums enter" />
      </LabeledField>
      <AudiencePicker audience={draft.audience} onChange={(audience) => setDraft({ ...draft, audience })} />
      <div className="flex gap-3">
        <button type="submit" className="pill pill-primary">Add note</button>
        <button type="button" className="pill pill-secondary" onClick={onClose}>Close</button>
      </div>
    </form>
  );
}
