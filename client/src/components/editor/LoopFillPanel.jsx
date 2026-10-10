import { useState } from 'react';
import { ToolPanel } from './ToolPanel.jsx';
import { LabeledField } from '../ui/LabeledField.jsx';
import { ErrorText } from '../ui/ErrorText.jsx';
import { applyLoopToSection, fillLoop, loopBars } from '../../engine/loopFill.js';
import { resolveSections } from '../../engine/songTiming.js';

function targetBarCount(form, loopText, section) {
  const count = Number(form.count) || 0;
  return form.mode === 'repeat' ? loopBars(loopText).length * (count || 1) : count || section?.barCount || 0;
}

export function LoopFillPanel({ editor }) {
  const [form, setForm] = useState({ sectionIdx: 0, loop: '', mode: 'fill', count: '' });
  const [message, setMessage] = useState({ error: '', done: '' });
  const sections = resolveSections(editor.sections, editor.defaults);
  const section = sections[form.sectionIdx];
  const barCount = targetBarCount(form, form.loop, section);
  const update = (changes) => setForm({ ...form, ...changes });

  function apply() {
    const error = editor.changeStructure((keyed) => applyLoopToSection(keyed, form.sectionIdx, fillLoop(form.loop, barCount), section?.beatsPerBar ?? 4));
    setMessage(error ? { error, done: '' } : { error: '', done: `${section.name} now has ${barCount} bars.` });
  }

  return (
    <ToolPanel title="Fill with a loop">
      <LabeledField label="Section">
        <select className="field" value={form.sectionIdx} onChange={(event) => update({ sectionIdx: Number(event.target.value), count: '' })}>
          {sections.map((candidate, index) => <option key={index} value={index}>{candidate.name} ({candidate.barCount} bars)</option>)}
        </select>
      </LabeledField>
      <LabeledField label="Loop" hint="Bars separated by |, two chords in a bar with a space.">
        <input className="field" value={form.loop} onChange={(event) => update({ loop: event.target.value })} placeholder="Am | Em | F Dm | G" autoCapitalize="none" spellCheck={false} />
      </LabeledField>
      <div className="grid grid-cols-2 gap-3">
        <LabeledField label="How">
          <select className="field" value={form.mode} onChange={(event) => update({ mode: event.target.value })}>
            <option value="fill">Fill N bars</option>
            <option value="repeat">Repeat N times</option>
          </select>
        </LabeledField>
        <LabeledField label={form.mode === 'repeat' ? 'Times' : 'Bars'}>
          <input className="field tabular" type="number" min={1} max={64} value={form.count} placeholder={String(form.mode === 'fill' ? section?.barCount ?? '' : 1)} onChange={(event) => update({ count: event.target.value })} />
        </LabeledField>
      </div>
      <p className="text-label text-muted">Gives {barCount} bars. Chords are replaced, words are kept.</p>
      <div><button type="button" className="pill pill-primary" disabled={!section || barCount === 0} onClick={apply}>Apply loop</button></div>
      <ErrorText error={message.error} />
      {message.done && <p className="text-muted">{message.done}</p>}
    </ToolPanel>
  );
}
