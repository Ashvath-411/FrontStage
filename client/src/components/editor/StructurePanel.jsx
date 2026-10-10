import { useState } from 'react';
import { ToolPanel } from './ToolPanel.jsx';
import { LabeledField } from '../ui/LabeledField.jsx';
import { ErrorText } from '../ui/ErrorText.jsx';
import { Toggle } from '../ui/Toggle.jsx';
import { addSection, deleteSection, duplicateSection, moveSection } from '../../engine/chartStructure.js';
import { resolveSections } from '../../engine/songTiming.js';

const quickBarCounts = [4, 8, 12, 16];
const emptyForm = { name: '', barCount: 8, bpm: '' };

function SectionRow({ section, index, sectionCount, onChange }) {
  return (
    <li className="flex flex-col gap-2 border-b border-line py-3">
      <p className="flex flex-wrap gap-x-3">
        <span className="font-semibold">{section.name}</span>
        <span className="tabular text-muted">{section.barCount} bars · {section.bpm} BPM{section.ownBpm ? ' (own tempo)' : ''}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="pill pill-small pill-secondary" disabled={index === 0} onClick={() => onChange((sections) => moveSection(sections, index, -1))}>Up</button>
        <button type="button" className="pill pill-small pill-secondary" disabled={index === sectionCount - 1} onClick={() => onChange((sections) => moveSection(sections, index, 1))}>Down</button>
        <button type="button" className="pill pill-small pill-secondary" onClick={() => onChange((sections, copyWords) => duplicateSection(sections, index, copyWords))}>Duplicate</button>
        <button type="button" className="pill pill-small pill-danger" onClick={() => onChange((sections) => deleteSection(sections, index))}>Delete</button>
      </div>
    </li>
  );
}

export function StructurePanel({ editor }) {
  const [form, setForm] = useState(emptyForm);
  const [copyWords, setCopyWords] = useState(false);
  const [error, setError] = useState('');
  const sections = resolveSections(editor.sections, editor.defaults).map((section, index) => ({ ...section, ownBpm: Boolean(editor.sections[index].bpm) }));
  const update = (changes) => setForm({ ...form, ...changes });

  function change(transform) {
    setError(editor.changeStructure((keyed) => transform(keyed, copyWords)));
  }

  function add() {
    const bpm = form.bpm === '' ? undefined : Number(form.bpm);
    const problem = editor.changeStructure((keyed) => addSection(keyed, { name: form.name, barCount: Number(form.barCount), bpm }));
    setError(problem);
    if (!problem) setForm(emptyForm);
  }

  return (
    <ToolPanel title="Song structure">
      <ul>
        {sections.map((section, index) => <SectionRow key={`${index}-${section.name}`} section={section} index={index} sectionCount={sections.length} onChange={change} />)}
      </ul>
      <Toggle label="Duplicate copies the words too" checked={copyWords} onChange={setCopyWords} />
      <h3 className="font-semibold">Add a section</h3>
      <LabeledField label="Name">
        <input className="field" value={form.name} maxLength={60} placeholder="Chorus" onChange={(event) => update({ name: event.target.value })} />
      </LabeledField>
      <div className="flex flex-wrap items-end gap-2">
        {quickBarCounts.map((count) => (
          <button key={count} type="button" aria-pressed={Number(form.barCount) === count} className={`pill pill-small ${Number(form.barCount) === count ? 'pill-selected' : 'pill-secondary'}`} onClick={() => update({ barCount: count })}>{count}</button>
        ))}
        <LabeledField label="Bars" className="w-24">
          <input className="field tabular" type="number" min={1} max={64} value={form.barCount} onChange={(event) => update({ barCount: event.target.value })} />
        </LabeledField>
      </div>
      <LabeledField label="Own tempo (optional)" hint="Leave empty to use the tempo before it.">
        <input className="field tabular" type="number" min={20} max={300} value={form.bpm} placeholder="BPM" onChange={(event) => update({ bpm: event.target.value })} />
      </LabeledField>
      <div><button type="button" className="pill pill-primary" onClick={add}>Add section</button></div>
      <ErrorText error={error} />
    </ToolPanel>
  );
}
