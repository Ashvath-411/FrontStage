import { Toggle } from '../ui/Toggle.jsx';
import { BarGridEditor } from './BarGridEditor.jsx';
import { ChartTextPane } from './ChartTextPane.jsx';
import { SelectedBarPanel } from './SelectedBarPanel.jsx';
import { barAt, beatsAtBar, totalBarCount } from '../../engine/chartEdits.js';
import { chartDurationMs } from '../../engine/chartStructure.js';
import { formatDuration } from '../../engine/songTiming.js';

export function ChartWorkspace({ editor, textMode, selection, onSelect, onSelectChip, onAddNote, noteForm, renderBarTools }) {
  const barCount = totalBarCount(editor.sections);
  const selectedBar = selection.barIdx !== null && selection.barIdx < barCount ? selection.barIdx : null;
  const bar = selectedBar !== null ? barAt(editor.sections, selectedBar) : null;
  const beatsPerBar = beatsAtBar(editor.sections, selectedBar ?? 0, editor.defaults.beatsPerBar);

  function toggleText(on) {
    if (on) textMode.openText();
    else textMode.closeText();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-x-6">
        <h2 className="text-pretitle font-extrabold">
          Chart <span className="tabular text-label font-normal text-muted">{barCount} bars · about {formatDuration(chartDurationMs(editor.sections, editor.defaults))}</span>
        </h2>
        <div className="flex items-center gap-4">
          {editor.canUndo && !textMode.isText && <button type="button" className="pill pill-small pill-secondary" onClick={editor.undo}>Undo</button>}
          <div className="min-w-44"><Toggle label="Edit as text" checked={textMode.isText} onChange={toggleText} /></div>
        </div>
      </div>
      {textMode.isText && <ChartTextPane text={textMode.draft} error={textMode.textError} onChange={textMode.setDraft} />}
      {!textMode.isText && bar && (
        <div className="z-10 bg-bg pb-2 lg:sticky lg:top-0">
          <SelectedBarPanel
            key={`${selectedBar}-${editor.revision}`}
            barIdx={selectedBar}
            bar={bar}
            beatsPerBar={beatsPerBar}
            barCount={barCount}
            focusChord={selection.focusChord}
            chipIdx={selection.chipIdx ?? null}
            onSelectChip={onSelectChip}
            onChange={(changes) => editor.changeBar(selectedBar, changes)}
            onSelect={onSelect}
            onAddNote={onAddNote}
          >
            {renderBarTools?.({ barIdx: selectedBar, bar, beatsPerBar, barCount })}
          </SelectedBarPanel>
        </div>
      )}
      {!textMode.isText && noteForm}
      {!textMode.isText && !bar && <p className="text-muted">Tap a bar to edit its chords and words.</p>}
      {!textMode.isText && (
        <BarGridEditor
          sections={editor.sections}
          defaults={editor.defaults}
          annotations={editor.annotations}
          selectedBar={selectedBar}
          onSelectBar={(barIdx) => onSelect(barIdx, false)}
        />
      )}
    </div>
  );
}
