import { useState } from 'react';
import { ToolPanel } from './ToolPanel.jsx';
import { LabeledField } from '../ui/LabeledField.jsx';
import { applyLyrics } from '../../engine/pasteLyrics.js';
import { formatChart, parseChart } from '../../engine/parseChart.js';
import { totalBarCount } from '../../engine/chartEdits.js';

function resultMessage({ placedLines, unplacedLines }) {
  const placed = `Placed ${placedLines} line${placedLines === 1 ? '' : 's'}.`;
  if (unplacedLines === 0) return placed;
  return `${placed} ${unplacedLines} line${unplacedLines === 1 ? '' : 's'} did not fit. Add bars or start earlier.`;
}

export function PasteLyricsPanel({ editor }) {
  const [form, setForm] = useState({ lyrics: '', startBar: 1, barsPerLine: 1 });
  const [message, setMessage] = useState('');
  const barCount = totalBarCount(editor.sections);
  const update = (changes) => setForm({ ...form, ...changes });

  function apply() {
    const startBar = Math.min(Math.max(1, Number(form.startBar) || 1), barCount);
    const result = applyLyrics(formatChart(editor.sections, editor.defaults), form.lyrics, { startBar, barsPerLine: Number(form.barsPerLine) });
    editor.replaceChart(parseChart(result.text, editor.defaults));
    setMessage(resultMessage(result));
  }

  return (
    <ToolPanel title="Paste lyrics">
      <LabeledField label="Lyrics, one line per row" hint="A blank row skips a group of bars. Chords and sections never change.">
        <textarea className="field min-h-40" value={form.lyrics} onChange={(event) => update({ lyrics: event.target.value })} rows={6} />
      </LabeledField>
      <div className="grid grid-cols-2 gap-3">
        <LabeledField label="Start at bar">
          <input className="field tabular" type="number" min={1} max={barCount} value={form.startBar} onChange={(event) => update({ startBar: event.target.value })} />
        </LabeledField>
        <LabeledField label="Bars per line">
          <select className="field" value={form.barsPerLine} onChange={(event) => update({ barsPerLine: event.target.value })}>
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={4}>4</option>
          </select>
        </LabeledField>
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="pill pill-primary" disabled={!form.lyrics.trim() || barCount === 0} onClick={apply}>Apply lyrics</button>
        {message && editor.canUndo && <button type="button" className="pill pill-secondary" onClick={() => { editor.undo(); setMessage(''); }}>Undo</button>}
      </div>
      {message && <p role="status" className="text-muted">{message}</p>}
    </ToolPanel>
  );
}
