import { lazy, Suspense, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSongEditor } from '../hooks/useSongEditor.js';
import { useChartTextMode } from '../hooks/useChartTextMode.js';
import { AppShell } from '../components/ui/AppShell.jsx';
import { ErrorText } from '../components/ui/ErrorText.jsx';
import { ErrorState, LoadingRows } from '../components/ui/LoadState.jsx';
import { SongMetaFields } from '../components/editor/SongMetaFields.jsx';
import { ChartWorkspace } from '../components/editor/ChartWorkspace.jsx';
import { AnnotationForm } from '../components/editor/AnnotationForm.jsx';
import { AnnotationList } from '../components/editor/AnnotationList.jsx';
import { LoopFillPanel } from '../components/editor/LoopFillPanel.jsx';
import { PasteLyricsPanel } from '../components/editor/PasteLyricsPanel.jsx';
import { StructurePanel } from '../components/editor/StructurePanel.jsx';
import { TemplatePicker } from '../components/editor/TemplatePicker.jsx';
import { ChordPalette } from '../components/editor/ChordPalette.jsx';
import { addChordToBar } from '../engine/chordPalette.js';
import { useToast } from '../toastContext.jsx';
import { useConfirm } from '../hooks/useConfirm.jsx';
import { useSongDraftGuard } from '../hooks/useSongDraftGuard.js';
import { SaveBar } from '../components/editor/SaveBar.jsx';
import { DraftPrompt } from '../components/editor/DraftPrompt.jsx';

const RecordPanel = lazy(() => import('../components/record/RecordPanel.jsx').then((module) => ({ default: module.RecordPanel })));

export function SongEditorPage() {
  const { id } = useParams();
  return <SongEditor key={id} id={id} />;
}

function SongEditor({ id }) {
  const navigate = useNavigate();
  const editor = useSongEditor(id);
  const textMode = useChartTextMode(editor);
  const [selection, setSelection] = useState({ barIdx: null, focusChord: false, chipIdx: null });
  const [noteBar, setNoteBar] = useState(null);
  const [addToBar, setAddToBar] = useState(false);
  const showToast = useToast();
  const confirm = useConfirm();
  const guard = useSongDraftGuard(editor, id, confirm);
  const [saving, setSaving] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);

  function pickChord({ barIdx, bar, beatsPerBar, barCount }, chord, shiftKey) {
    const { chipIdx } = selection;
    const append = addToBar || shiftKey || chipIdx === 'new';
    const result = addChordToBar(bar, chord, beatsPerBar, { append, chipIdx: Number.isInteger(chipIdx) ? chipIdx : null });
    editor.changeBar(barIdx, { chords: result.chords });
    if (result.advance && barIdx + 1 < barCount) setSelection({ barIdx: barIdx + 1, focusChord: false, chipIdx: null });
  }

  async function save() {
    const chart = textMode.readDraft();
    if (chart.error) return;
    if (textMode.isText) textMode.closeText();
    setSaving(true);
    const saved = await editor.save(chart.sections);
    setSaving(false);
    showToast(saved ? 'Song saved' : 'Song not saved. See the message above.', saved ? 'info' : 'error');
    if (!saved) return;
    guard.markSaved(saved._id, chart.sections);
    if (editor.isNew) navigate(`/songs/${saved._id}`, { replace: true });
  }

  async function remove() {
    const confirmed = await confirm.ask({
      title: `Delete ${editor.meta.title || 'this song'}?`,
      text: 'The song is removed from your library and from every setlist. Sessions that are already running keep their copy.',
      confirmLabel: 'Delete song'
    });
    if (!confirmed) return;
    await editor.remove();
    guard.markSaved();
    showToast('Song deleted');
    navigate('/library');
  }

  const actions = editor.isNew ? null : <button type="button" className="pill pill-danger" onClick={remove}>Delete</button>;

  if (editor.loading) return <AppShell title="Song"><LoadingRows label="Loading song" rows={4} /></AppShell>;
  if (editor.loadError) return <AppShell title="Song"><ErrorState message={editor.loadError} onRetry={editor.retryLoad} /></AppShell>;

  return (
    <AppShell title={editor.isNew ? 'New song' : editor.meta.title || 'Song'} actions={actions}>
      {confirm.dialog}
      <DraftPrompt draft={guard.pendingDraft} onRestore={guard.restoreDraft} onDiscard={guard.discardDraft} />
      <div className="mb-6 min-h-6">
        <ErrorText error={editor.error} />
      </div>
      <div className="mb-8">
        {recordOpen && !textMode.isText ? (
          <Suspense fallback={<LoadingRows label="Opening record mode" rows={2} />}>
            <RecordPanel editor={editor} startBar={selection.barIdx} onClose={() => setRecordOpen(false)} />
          </Suspense>
        ) : (
          <button type="button" className="pill pill-primary" disabled={textMode.isText} onClick={() => setRecordOpen(true)}>
            Record from a keyboard
          </button>
        )}
      </div>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="flex flex-col gap-6">
          <SongMetaFields meta={editor.meta} onChange={editor.setMeta} />
          {!textMode.isText && (
            <div className="flex flex-col gap-3">
              {editor.isNew && <TemplatePicker editor={editor} />}
              <StructurePanel editor={editor} />
              <LoopFillPanel editor={editor} />
              <PasteLyricsPanel editor={editor} />
            </div>
          )}
          <section>
            <h2 className="text-pretitle mb-3 font-extrabold">Stage notes</h2>
            <AnnotationList
              annotations={editor.annotations}
              onRemove={(index) => editor.setAnnotations(editor.annotations.filter((_, position) => position !== index))}
            />
          </section>
        </div>
        <ChartWorkspace
          editor={editor}
          textMode={textMode}
          selection={selection}
          onSelect={(barIdx, focusChord) => setSelection({ barIdx, focusChord, chipIdx: null })}
          onSelectChip={(chipIdx) => setSelection((current) => ({ ...current, focusChord: false, chipIdx }))}
          onAddNote={() => setNoteBar(selection.barIdx)}
          renderBarTools={(target) => (
            <ChordPalette
              meta={editor.meta}
              selectedChord={target.bar.chords[0]?.chord}
              addToBar={addToBar}
              onAddToBarChange={setAddToBar}
              onPick={(chord, shiftKey) => pickChord(target, chord, shiftKey)}
            />
          )}
          noteForm={noteBar !== null && (
            <AnnotationForm
              barIdx={noteBar}
              onAdd={(annotation) => editor.setAnnotations([...editor.annotations, annotation])}
              onClose={() => setNoteBar(null)}
            />
          )}
        />
      </div>
      <SaveBar dirty={guard.dirty} savedAt={editor.savedAt} busy={saving} onSave={save} />
    </AppShell>
  );
}
