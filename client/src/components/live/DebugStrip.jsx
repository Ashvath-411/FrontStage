import { useState } from 'react';

function latencyText(seconds) {
  return typeof seconds === 'number' ? `${(seconds * 1000).toFixed(1)} ms` : 'not given';
}

function debugRows({ clock, session, position, connected, audio }) {
  const serverNow = Date.now() + clock.offsetMs;
  return [
    ['Clock offset', `${clock.offsetMs.toFixed(1)} ms`],
    ['Round trip', clock.rttMs === null ? 'measuring' : `${clock.rttMs} ms`],
    ['Server time', new Date(serverNow).toISOString().slice(11, 23)],
    ['Socket', connected ? 'connected' : 'down'],
    ['State', `${session.state.playState} v${session.state.version}`],
    ['Phase', position.phase],
    ['Song', position.itemIdx + 1],
    ['Bar', position.phase === 'song' ? position.barIdx + 1 : '-'],
    ['Beat', position.beat.toFixed(2)],
    ['Audio', audio.state],
    ['Base latency', latencyText(audio.baseLatency)],
    ['Output latency', latencyText(audio.outputLatency)],
    ['Click offset', `${audio.clickOffsetMs} ms`]
  ];
}

export function DebugStrip({ onHide, ...details }) {
  const [expanded, setExpanded] = useState(false);
  const rows = debugRows(details);
  return (
    <section aria-label="Timing details" className="tabular text-label shrink-0 border-t border-line">
      <div className="flex min-h-12 items-center gap-3">
        <button type="button" className="flex min-h-12 flex-1 cursor-pointer items-center gap-3 text-left text-muted" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
          <span aria-hidden="true">{expanded ? '▾' : '▸'}</span>
          <span>Timing · offset {rows[0][1]} · round trip {rows[1][1]} · {rows[4][1]} · bar {rows[7][1]}</span>
        </button>
        <button type="button" className="pill pill-small" onClick={onHide}>Hide</button>
      </div>
      {expanded && (
        <dl className="grid max-h-24 grid-cols-2 sm:max-h-40 gap-x-6 overflow-y-auto pb-2 sm:grid-cols-4">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-2">
              <dt className="text-muted">{label}</dt>
              <dd className="m-0">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
