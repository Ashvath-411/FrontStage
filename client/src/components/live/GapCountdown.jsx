import { BeatDots } from './BeatDots.jsx';
import { keyLabel, openingBpm, secondsLeft } from '../../liveDisplay.js';

export function GapCountdown({ nextItem, nextTimeline, position }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center" role="status">
      <span className="text-label text-muted uppercase">Next song in</span>
      <span className="font-chord tabular leading-none font-bold text-cyan" style={{ fontSize: 'clamp(7rem, 34vw, 18rem)' }}>
        {secondsLeft(position.msToPhaseEnd)}
      </span>
      <span className="font-chord text-4xl font-semibold sm:text-5xl">{nextItem.title}</span>
      <span className="tabular text-lg text-muted">
        Key <strong className="text-text">{keyLabel(nextItem)}</strong> · <strong className="text-text">{openingBpm(nextTimeline)}</strong> BPM
      </span>
      <BeatDots beats={nextTimeline.openingBeats} currentBeat={position.beatInBar} size="large" />
    </div>
  );
}
