function seekOffset(timeline, position, barDelta) {
  const currentBar = position.phase === 'song' ? position.barIdx : 0;
  const lastBar = Math.max(0, timeline.barStartsMs.length - 1);
  const targetBar = Math.min(lastBar, Math.max(0, currentBar + barDelta));
  return timeline.countInMs + (timeline.barStartsMs[targetBar] ?? 0);
}

function JumpSelect({ snapshot, itemIdx, disabled, onJump }) {
  return (
    <select
      className="pill pill-small max-w-40 appearance-none"
      aria-label="Jump to song"
      value={itemIdx}
      disabled={disabled}
      onChange={(event) => onJump(Number(event.target.value))}
    >
      {snapshot.map((item) => <option key={item.itemIdx} value={item.itemIdx}>{item.itemIdx + 1}. {item.title}</option>)}
    </select>
  );
}

function MainButton({ playState, phase, controls, itemIdx }) {
  if (playState === 'idle') return <button type="button" className="pill pill-primary" onClick={() => controls.send('start')}>Start</button>;
  if (playState === 'paused') return <button type="button" className="pill pill-primary" onClick={() => controls.send('resume')}>Resume</button>;
  if (phase === 'waiting') return <button type="button" className="pill pill-primary" onClick={() => controls.send('next', { itemIdx })}>Play next</button>;
  return <button type="button" className="pill pill-primary" onClick={() => controls.send('pause')}>Pause</button>;
}

export function ControlBar({ session, position, timelines, controls }) {
  const { playState } = session.state;
  if (playState === 'ended') return null;
  const itemIdx = position.itemIdx;
  const timeline = timelines[itemIdx];
  const isLast = itemIdx >= timelines.length - 1;
  const moving = playState !== 'idle';
  return (
    <nav aria-label="Playback controls" className="flex flex-wrap items-center justify-center gap-2">
      <button type="button" className="pill pill-small" disabled={!moving || itemIdx === 0 || controls.busy} onClick={() => controls.send('prev', { itemIdx })}>Prev</button>
      <button type="button" className="pill pill-small" aria-label="Back one bar" disabled={!moving || controls.busy} onClick={() => controls.send('seek', { itemIdx, offsetMs: seekOffset(timeline, position, -1) })}>−1 bar</button>
      <MainButton playState={playState} phase={position.phase} controls={controls} itemIdx={itemIdx} />
      <button type="button" className="pill pill-small" aria-label="Forward one bar" disabled={!moving || controls.busy} onClick={() => controls.send('seek', { itemIdx, offsetMs: seekOffset(timeline, position, 1) })}>+1 bar</button>
      <button type="button" className="pill pill-small" disabled={isLast || controls.busy} onClick={() => controls.send('next', { itemIdx })}>Next</button>
      <JumpSelect snapshot={session.snapshot} itemIdx={itemIdx} disabled={controls.busy} onJump={(target) => controls.send('jump', { itemIdx: target })} />
    </nav>
  );
}
