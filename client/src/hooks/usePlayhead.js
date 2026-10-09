import { useEffect, useMemo, useRef, useState } from 'react';
import { buildTimeline, positionAt } from '../engine/timeline.js';

function elapsedForState(state, timelines, serverNow) {
  if (state.playState === 'playing') return serverNow - state.anchorServerMs + state.anchorOffsetMs;
  if (state.playState === 'paused') return state.anchorOffsetMs;
  return timelines[state.itemIdx]?.countInMs ?? 0;
}

function currentPosition(session, timelines, serverNow) {
  const { state } = session;
  const position = positionAt(timelines, state.itemIdx, elapsedForState(state, timelines, serverNow), session.settings.autoAdvance);
  if (state.playState === 'ended') return { ...position, phase: 'finished' };
  return position;
}

function changeKey(position) {
  const wholeSeconds = position.msToPhaseEnd === null ? '' : Math.ceil(position.msToPhaseEnd / 1000);
  return [position.phase, position.itemIdx, position.barIdx, position.chordIdx, position.beatInBar, wholeSeconds].join('|');
}

export function usePlayhead(session, clockOffsetMs) {
  const timelines = useMemo(() => (session?.snapshot ?? []).map(buildTimeline), [session?.snapshot]);
  const [position, setPosition] = useState(null);
  const lastKey = useRef('');
  const latestPosition = useRef(null);

  useEffect(() => {
    if (!session) return undefined;
    let frame = 0;
    function tick() {
      const next = currentPosition(session, timelines, Date.now() + clockOffsetMs);
      latestPosition.current = next;
      const key = changeKey(next);
      if (key !== lastKey.current) {
        lastKey.current = key;
        setPosition(next);
      }
      frame = requestAnimationFrame(tick);
    }
    tick();
    return () => cancelAnimationFrame(frame);
  }, [session, timelines, clockOffsetMs]);

  return { position, timelines, latestPosition };
}
