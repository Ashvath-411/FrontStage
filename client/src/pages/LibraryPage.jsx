import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { AppShell } from '../components/ui/AppShell.jsx';
import { useLoad } from '../hooks/useLoad.js';
import { ErrorState, LoadingRows } from '../components/ui/LoadState.jsx';
import { LabeledField } from '../components/ui/LabeledField.jsx';
import { useToast } from '../toastContext.jsx';
import { songCopy, visibleSongs } from '../songList.js';

function SongRow({ song, onDuplicate }) {
  return (
    <li className="flex items-center gap-3 border-b border-line">
      <Link to={`/songs/${song._id}`} className="flex min-h-14 min-w-0 flex-1 flex-wrap items-center justify-between gap-x-6 gap-y-1 py-3 text-text no-underline hover:text-cyan">
        <span className="min-w-0">
          <span className="font-chord text-2xl font-semibold">{song.title}</span>
          {song.artist && <span className="ml-3 text-muted">{song.artist}</span>}
        </span>
        <span className="tabular text-label text-muted">
          {song.keyRoot}{song.keyMode === 'minor' ? 'm' : ''} · {song.bpm} BPM · {song.beatsPerBar}/4 · {song.barCount} bars
        </span>
      </Link>
      <button type="button" className="pill pill-small pill-secondary shrink-0" aria-label={`Duplicate ${song.title}`} onClick={() => onDuplicate(song)}>Duplicate</button>
    </li>
  );
}

export function LibraryPage() {
  const navigate = useNavigate();
  const showToast = useToast();
  const { data: songs, error, loading, retry } = useLoad(api.listSongs);
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const shown = songs ? visibleSongs(songs, query, sortBy) : [];

  async function duplicate(song) {
    try {
      const copy = await api.createSong(songCopy(await api.getSong(song._id)));
      showToast(`Made ${copy.title}`);
      navigate(`/songs/${copy._id}`);
    } catch (problem) {
      showToast(problem.message, 'error');
    }
  }

  const newSong = <Link to="/songs/new" className="pill pill-primary no-underline">New song</Link>;

  return (
    <AppShell title="Library" actions={newSong}>
      {loading && <LoadingRows label="Loading your songs" />}
      {error && <ErrorState message={error} onRetry={retry} />}
      {songs?.length === 0 && (
        <p className="max-w-xl text-muted">
          Your songs will appear here with their key, tempo and length. Press New song, start from a template and tap chords into the bars.
        </p>
      )}
      {songs?.length > 0 && (
        <>
          <div className="mb-4 grid max-w-4xl gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <LabeledField label="Search title or artist">
              <input className="field" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Song or artist" />
            </LabeledField>
            <LabeledField label="Sort">
              <select className="field" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                <option value="recent">Recently edited</option>
                <option value="title">Title A to Z</option>
              </select>
            </LabeledField>
          </div>
          {shown.length === 0 && (
            <div className="flex max-w-xl flex-col gap-3">
              <p className="text-muted">No songs match “{query}”.</p>
              <div><button type="button" className="pill pill-secondary" onClick={() => setQuery('')}>Clear search</button></div>
            </div>
          )}
          <ul className="max-w-4xl">{shown.map((song) => <SongRow key={song._id} song={song} onDuplicate={duplicate} />)}</ul>
        </>
      )}
    </AppShell>
  );
}
