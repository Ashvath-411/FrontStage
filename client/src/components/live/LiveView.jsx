import { SongHeader } from './SongHeader.jsx';
import { CurrentChord } from './CurrentChord.jsx';
import { BeatDots } from './BeatDots.jsx';
import { LyricChart } from './LyricChart.jsx';
import { AnnotationLayer } from './AnnotationLayer.jsx';
import { NextUpCard } from './NextUpCard.jsx';
import { StageOverlay } from './StageOverlay.jsx';
import { chordLabel } from '../../liveDisplay.js';
import { activeAnnotations } from '../../engine/annotations.js';
import { nextChordChange } from '../../engine/timeline.js';

const textScales = { normal: 1, large: 1.2, huge: 1.4 };

function showNextUp(session, position, hasNext) {
  if (!hasNext || session.state.playState !== 'playing') return false;
  if (position.phase === 'gap' || position.phase === 'waiting') return true;
  return position.phase === 'song' && position.msToPhaseEnd <= session.settings.nextUpSeconds * 1000;
}

function BigLyric({ text }) {
  return <p className="font-chord text-center text-3xl leading-tight font-semibold sm:text-5xl">{text || '…'}</p>;
}

export function LiveView({ session, position, timelines, prefs, instrument, compact = false }) {
  const item = session.snapshot[position.itemIdx];
  const timeline = timelines[position.itemIdx];
  const nextItem = session.snapshot[position.itemIdx + 1];
  const inSong = position.phase === 'song';
  const showLyrics = session.settings.showLyrics && !prefs.hideLyrics;
  const notes = session.settings.showAnnotations && inSong ? activeAnnotations(item, position.barIdx, instrument) : [];
  const currentChord = timeline.chords[position.chordIdx]?.chord;
  const nextChord = nextChordChange(timeline, position.chordIdx)?.chord;
  const headerItem = position.phase === 'gap' ? nextItem : item;
  const scale = textScales[prefs.textSize] ?? 1;
  const show = { lyrics: showLyrics, chords: !prefs.hideChords, chordsAbove: prefs.chordsPosition === 'above' };
  const hiddenWhenCompact = compact ? 'max-[899px]:hidden' : '';
  const beats = inSong ? timeline.barBeats[position.barIdx] : timeline.openingBeats;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className={hiddenWhenCompact}>
        <SongHeader item={headerItem} position={position} itemCount={session.snapshot.length} sectionName={inSong ? item.sections[position.sectionIdx]?.name : ''} />
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col gap-3">
        <div className={`flex flex-col items-center gap-2 overflow-hidden ${hiddenWhenCompact}`}>
          {prefs.hideChords
            ? <BigLyric text={inSong ? item.bars[position.barIdx]?.lyric : ''} />
            : <CurrentChord chord={chordLabel(item, currentChord)} nextChord={chordLabel(item, nextChord)} scale={scale} />}
          <BeatDots beats={beats} currentBeat={inSong ? position.beatInBar : 0} />
        </div>
        <AnnotationLayer annotations={notes} barIdx={position.barIdx} />
        {showNextUp(session, position, Boolean(nextItem)) && (
          <NextUpCard nextItem={nextItem} nextTimeline={timelines[position.itemIdx + 1]} msToNextSong={position.msToNextSong} />
        )}
        <LyricChart item={item} timeline={timeline} position={position} show={show} scale={scale} inSong={inSong} />
        <StageOverlay session={session} position={position} timelines={timelines} />
      </div>
    </div>
  );
}
