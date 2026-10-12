import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useToast } from '../toastContext.jsx';
import { useConfirm } from '../hooks/useConfirm.jsx';
import { useSetlistBuilder } from '../hooks/useSetlistBuilder.js';
import { AppShell } from '../components/ui/AppShell.jsx';
import { ErrorText } from '../components/ui/ErrorText.jsx';
import { LabeledField } from '../components/ui/LabeledField.jsx';
import { ErrorState, LoadingRows } from '../components/ui/LoadState.jsx';
import { SetlistItemRow } from '../components/setlist/SetlistItemRow.jsx';
import { AddSongPicker } from '../components/setlist/AddSongPicker.jsx';
import { itemDurationMs, formatDuration } from '../engine/songTiming.js';

export function SetlistBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const builder = useSetlistBuilder(id);
  const showToast = useToast();
  const confirm = useConfirm();

  async function save() {
    const saved = await builder.save();
    showToast(saved ? 'Setlist saved' : 'Setlist not saved. See the message above.', saved ? 'info' : 'error');
    return saved;
  }

  async function startSession() {
    if (!(await builder.save())) return showToast('Setlist not saved, so no session was started.', 'error');
    try {
      const session = await api.createSession({ setlistId: id, name: builder.details.name });
      navigate(`/session/${session.id}`);
    } catch (problem) {
      showToast(problem.message, 'error');
    }
  }
  const durations = builder.items.map((item, index) => {
    const song = builder.songsById[item.songId];
    return song ? itemDurationMs(song, item, index === builder.items.length - 1) : 0;
  });
  const totalMs = durations.reduce((sum, ms) => sum + ms, 0);

  function updateDetails(event) {
    builder.setDetails({ ...builder.details, [event.target.name]: event.target.value });
  }

  async function remove() {
    const confirmed = await confirm.ask({
      title: `Delete ${builder.details.name || 'this setlist'}?`,
      text: 'The setlist is removed. Its songs stay in your library, and sessions that are already running keep their copy.',
      confirmLabel: 'Delete setlist'
    });
    if (!confirmed) return;
    await api.deleteSetlist(id);
    showToast('Setlist deleted');
    navigate('/setlists');
  }

  const actions = (
    <>
      <button type="button" className="pill pill-danger" onClick={remove}>Delete</button>
      <button type="button" className="pill pill-secondary" onClick={save}>Save setlist</button>
    </>
  );

  if (builder.loading) return <AppShell title="Setlist"><LoadingRows label="Loading setlist" rows={4} /></AppShell>;
  if (builder.loadError) return <AppShell title="Setlist"><ErrorState message={builder.loadError} onRetry={builder.retryLoad} /></AppShell>;

  return (
    <AppShell title={builder.details.name || 'Setlist'} actions={actions}>
      {confirm.dialog}
      <div className="mb-6 min-h-6">
        <ErrorText error={builder.error} />
        {builder.removedCount > 0 && <p role="status" className="text-alert">{builder.removedCount} song{builder.removedCount === 1 ? ' was' : 's were'} deleted from your library and taken out of this setlist. Save to keep it that way.</p>}
        {builder.savedAt && !builder.error && <p className="text-muted">Saved at {builder.savedAt.toLocaleTimeString()}.</p>}
      </div>
      <div className="mb-8 grid max-w-3xl gap-4 sm:grid-cols-3">
        <LabeledField label="Name"><input className="field" name="name" value={builder.details.name} onChange={updateDetails} maxLength={120} /></LabeledField>
        <LabeledField label="Venue"><input className="field" name="venue" value={builder.details.venue} onChange={updateDetails} maxLength={120} /></LabeledField>
        <LabeledField label="Date"><input className="field" type="date" name="eventDate" value={builder.details.eventDate} onChange={updateDetails} /></LabeledField>
      </div>
      <section aria-label="Setlist summary" className="mb-6 flex max-w-3xl flex-wrap items-center justify-between gap-4 rounded-[4px] border border-line bg-surface p-4">
        <div>
          <p className="tabular text-pretitle font-extrabold">{builder.items.length} songs · running time {formatDuration(totalMs)}</p>
          <p className="text-label text-muted">Includes count-ins and countdown gaps. Manual gaps wait for a tap and are not counted.</p>
        </div>
        <button type="button" className="pill pill-primary" disabled={builder.items.length === 0} onClick={startSession}>Start session</button>
      </section>
      {builder.items.length === 0 && <p className="mb-6 text-muted">The songs of this setlist will be listed here in play order. Add the first one below.</p>}
      <ol className="mb-8">
        {builder.items.map((item, index) => (
          <SetlistItemRow
            key={`${item.songId}-${index}`}
            item={item}
            song={builder.songsById[item.songId]}
            position={index}
            count={builder.items.length}
            durationMs={durations[index]}
            onChange={(fields) => builder.updateItem(index, fields)}
            onMove={(delta) => builder.moveItem(index, delta)}
            onRemove={() => builder.removeItem(index)}
          />
        ))}
      </ol>
      <AddSongPicker library={builder.library} onAdd={builder.addSong} />
    </AppShell>
  );
}
