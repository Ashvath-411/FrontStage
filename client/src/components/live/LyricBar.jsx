import { chordLabel } from '../../liveDisplay.js';
import { chordSpans } from '../../engine/chordSpans.js';

const lyricSize = 'clamp(1.4rem, 4.2vw, 2.6rem)';
const chordSize = 'clamp(1.2rem, 3.4vw, 2rem)';

function barStyle(status) {
  if (status === 'current') return 'border-2 border-cyan bg-cyan/10';
  if (status === 'played') return 'border border-line bg-surface opacity-40';
  return 'border border-line bg-surface';
}

function LyricLine({ text, scale }) {
  return (
    <p className="min-w-0 font-semibold break-words text-text" style={{ fontSize: `calc(${lyricSize} * ${scale})`, lineHeight: 1.2, minHeight: '1.2em', overflowWrap: 'anywhere' }}>
      {text || ' '}
    </p>
  );
}

function ChordLine({ item, chords, beatsPerBar, litBeat, scale }) {
  return (
    <div className="flex flex-wrap gap-x-1 font-chord font-semibold text-cyan" style={{ fontSize: `calc(${chordSize} * ${scale})`, lineHeight: 1.15, minHeight: '1.15em' }}>
      {chordSpans(chords, beatsPerBar).map((entry, index) => (
        <span
          key={index}
          className={`min-w-fit ${entry.chord && entry.beat === litBeat ? 'self-start' : ''}`}
          style={{ flex: `${entry.size} 1 0%` }}
        >
          {entry.chord && <span className={`rounded-[3px] px-1 ${entry.beat === litBeat ? 'bg-cyan text-black' : ''}`}>{chordLabel(item, entry.chord)}</span>}
        </span>
      ))}
    </div>
  );
}

export function LyricBar({ item, bar, beatsPerBar, status, litBeat, show, scale, barRef }) {
  const lyric = show.lyrics && <LyricLine text={bar.lyric} scale={scale} />;
  const chords = show.chords && <ChordLine item={item} chords={bar.chords} beatsPerBar={beatsPerBar} litBeat={litBeat} scale={scale} />;
  return (
    <div ref={barRef} className={`flex min-w-0 flex-col gap-1 rounded-[4px] p-2 sm:p-3 ${barStyle(status)}`}>
      {show.chordsAbove ? chords : lyric}
      {show.chordsAbove ? lyric : chords}
    </div>
  );
}
