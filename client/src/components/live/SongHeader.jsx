import { keyLabel } from '../../liveDisplay.js';
import { SectionBadge } from './SectionBadge.jsx';

export function SongHeader({ item, position, itemCount, sectionName }) {
  const beatsPerBar = item.sections[position.sectionIdx]?.beatsPerBar ?? item.beatsPerBar;
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <h2 className="font-chord truncate text-3xl leading-none font-semibold sm:text-4xl">
        {item.title}
        {item.artist && <span className="ml-3 align-middle font-body text-base font-normal text-muted">{item.artist}</span>}
      </h2>
      <p className="tabular flex flex-wrap items-center gap-x-4 gap-y-1 text-muted">
        <span>Key <strong className="text-text">{keyLabel(item)}</strong></span>
        <span><strong className="text-text">{Math.round(position.bpmNow)}</strong> BPM</span>
        <span><strong className="text-text">{beatsPerBar}</strong> beats</span>
        <span>Song <strong className="text-text">{item.itemIdx + 1}</strong> of {itemCount}</span>
        <SectionBadge name={sectionName} />
      </p>
    </div>
  );
}
