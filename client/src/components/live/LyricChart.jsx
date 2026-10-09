import { useEffect, useRef } from 'react';
import { LyricBar } from './LyricBar.jsx';

function scrollBarIntoView(container, bar) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gapAbove = Math.min(container.clientHeight / 3, Math.max(0, container.clientHeight - bar.offsetHeight - 8));
  container.scrollTo({ top: bar.offsetTop - gapAbove, behavior: reduceMotion ? 'auto' : 'smooth' });
}

function useScrollToCurrentBar(containerRef, barRef, barKey) {
  const lastTop = useRef(null);
  useEffect(() => {
    const container = containerRef.current;
    const bar = barRef.current;
    if (!container || !bar || bar.offsetTop === lastTop.current) return;
    lastTop.current = bar.offsetTop;
    scrollBarIntoView(container, bar);
  }, [containerRef, barRef, barKey]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => barRef.current && scrollBarIntoView(container, barRef.current));
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, barRef]);
}

function barStatus(barIdx, currentBar) {
  if (barIdx === currentBar) return 'current';
  return barIdx < currentBar ? 'played' : 'ahead';
}

export function LyricChart({ item, timeline, position, show, scale, inSong }) {
  const containerRef = useRef(null);
  const barRef = useRef(null);
  const currentBar = inSong ? position.barIdx : -1;
  const currentChord = timeline.chords[position.chordIdx];
  const litBeat = currentChord && currentChord.barIdx === currentBar ? currentChord.beat : null;
  useScrollToCurrentBar(containerRef, barRef, `${item.itemIdx}-${currentBar}`);

  return (
    <div ref={containerRef} className="relative min-h-24 flex-1 overflow-y-auto pb-4">
      {item.sections.map((section) => (
        <section key={section.firstBar} className="mb-4">
          <h3 className="text-label mb-2 inline-block rounded-pill border border-line px-3 py-1 font-semibold text-muted uppercase">{section.name}</h3>
          <div className="grid grid-cols-2 gap-2 min-[900px]:grid-cols-4">
            {item.bars.slice(section.firstBar, section.firstBar + section.barCount).map((bar, index) => {
              const barIdx = section.firstBar + index;
              const status = barStatus(barIdx, currentBar);
              return (
                <LyricBar
                  key={barIdx}
                  item={item}
                  bar={bar}
                  beatsPerBar={timeline.barBeats[barIdx]}
                  status={status}
                  litBeat={status === 'current' ? litBeat : null}
                  show={show}
                  scale={scale}
                  barRef={status === 'current' ? barRef : null}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
