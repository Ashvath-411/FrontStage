import { keyLabel, openingBpm, secondsLeft } from '../../liveDisplay.js';

export function NextUpCard({ nextItem, nextTimeline, msToNextSong }) {
  return (
    <aside className="flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-purple bg-surface px-4 py-3" aria-label="Next song">
      <span className="flex flex-col">
        <span className="text-label text-muted uppercase">Next up</span>
        <span className="font-chord text-2xl font-semibold">{nextItem.title}</span>
      </span>
      <span className="tabular text-muted">
        {keyLabel(nextItem)} · {openingBpm(nextTimeline)} BPM
        {msToNextSong !== null && <strong className="ml-3 text-2xl text-cyan">{secondsLeft(msToNextSong)}s</strong>}
      </span>
    </aside>
  );
}
