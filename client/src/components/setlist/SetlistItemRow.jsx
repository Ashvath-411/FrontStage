import { NumberField } from './NumberField.jsx';
import { transposeKey } from '../../engine/transpose.js';
import { formatDuration } from '../../engine/songTiming.js';

function keyLabel(song, transpose) {
  const { root } = transposeKey(song.keyRoot, song.keyMode, transpose);
  return `${root}${song.keyMode === 'minor' ? 'm' : ''}`;
}

export function SetlistItemRow({ item, song, position, count, durationMs, onChange, onMove, onRemove }) {
  return (
    <li className="flex flex-col gap-4 border-b border-line py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <span className="tabular text-label text-muted">{position + 1}</span>
          <span className="font-chord text-2xl font-semibold">{song?.title ?? 'Loading…'}</span>
          {song && (
            <span className="tabular text-label text-muted">
              {keyLabel(song, item.transpose)} · {Math.round((song.bpm * item.tempoPct) / 100)} BPM · {formatDuration(durationMs)}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" className="pill pill-small" aria-label="Move up" disabled={position === 0} onClick={() => onMove(-1)}>↑</button>
          <button type="button" className="pill pill-small" aria-label="Move down" disabled={position === count - 1} onClick={() => onMove(1)}>↓</button>
          <button type="button" className="pill pill-small pill-danger" onClick={onRemove}>Remove</button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <NumberField label="Transpose" value={item.transpose} min={-11} max={11} onChange={(transpose) => onChange({ transpose })} />
        <NumberField label="Tempo %" value={item.tempoPct} min={50} max={200} onChange={(tempoPct) => onChange({ tempoPct })} />
        <NumberField label="Count-in bars" value={item.countInBars} min={0} max={4} onChange={(countInBars) => onChange({ countInBars })} />
        <label className="flex flex-col gap-1">
          <span className="text-label text-muted">Gap</span>
          <select className="field" value={item.gapMode} onChange={(event) => onChange({ gapMode: event.target.value })}>
            <option value="countdown">countdown</option>
            <option value="immediate">immediate</option>
            <option value="manual">manual</option>
          </select>
        </label>
        <NumberField label="Gap seconds" value={item.gapSeconds} min={0} max={120} disabled={item.gapMode !== 'countdown'} onChange={(gapSeconds) => onChange({ gapSeconds })} />
        <label className="flex flex-col gap-1">
          <span className="text-label text-muted">Note</span>
          <input className="field" value={item.note ?? ''} maxLength={200} onChange={(event) => onChange({ note: event.target.value })} />
        </label>
      </div>
    </li>
  );
}
