import { resolveSections } from '../../engine/songTiming.js';
import { chordSpans } from '../../engine/chordSpans.js';
import { isValidChord } from '../../engine/chordCheck.js';

const invalidChordStyle = 'underline decoration-alert decoration-wavy decoration-2 underline-offset-4';

function EditorBar({ bar, barIdx, beatsPerBar, noteCount, selected, onSelect }) {
  const border = selected ? 'border-2 border-cyan bg-cyan/10' : 'border border-line bg-surface hover:border-muted';
  return (
    <button type="button" onClick={() => onSelect(barIdx)} aria-pressed={selected} className={`flex min-h-24 min-w-0 cursor-pointer flex-col gap-1 rounded-[4px] p-2 text-left ${border}`}>
      <span className="tabular text-label flex justify-between text-muted">
        <span>{barIdx + 1}</span>
        {noteCount > 0 && <span className="text-purple-text">{noteCount} note{noteCount > 1 ? 's' : ''}</span>}
      </span>
      <span className="flex min-h-7 flex-wrap gap-x-1 font-chord text-xl font-semibold text-cyan">
        {chordSpans(bar.chords, beatsPerBar).map((entry, index) => (
          <span key={index} className={`min-w-fit ${entry.chord && !isValidChord(entry.chord) ? invalidChordStyle : ''}`} title={entry.chord && !isValidChord(entry.chord) ? 'Not a chord' : undefined} style={{ flex: `${entry.size} 1 0%` }}>
            {entry.chord}
          </span>
        ))}
      </span>
      <span className="text-sm break-words text-text">{bar.lyric}</span>
    </button>
  );
}

export function BarGridEditor({ sections, defaults, annotations, selectedBar, onSelectBar }) {
  if (sections.length === 0) return <p className="text-muted">No sections yet. Add a section to start.</p>;
  return (
    <div className="flex flex-col gap-6">
      {resolveSections(sections, defaults).map((section, sectionIdx) => (
        <section key={`${sectionIdx}-${section.name}`}>
          <h3 className="mb-2 flex flex-wrap gap-x-3 text-label">
            <span className="font-semibold text-text uppercase">{section.name}</span>
            <span className="tabular text-muted">{section.bpm} BPM · {section.beatsPerBar} beats · {section.barCount} bars</span>
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {section.bars.map((bar, index) => {
              const barIdx = section.firstBar + index;
              return (
                <EditorBar
                  key={barIdx}
                  bar={bar}
                  barIdx={barIdx}
                  beatsPerBar={section.beatsPerBar}
                  noteCount={annotations.filter((annotation) => annotation.barIdx === barIdx).length}
                  selected={selectedBar === barIdx}
                  onSelect={onSelectBar}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
