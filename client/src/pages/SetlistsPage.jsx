import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { AppShell } from '../components/ui/AppShell.jsx';
import { ErrorText } from '../components/ui/ErrorText.jsx';
import { useLoad } from '../hooks/useLoad.js';
import { ErrorState, LoadingRows } from '../components/ui/LoadState.jsx';

export function SetlistsPage() {
  const navigate = useNavigate();
  const { data: setlists, error: loadError, loading, retry } = useLoad(api.listSetlists);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  async function create(event) {
    event.preventDefault();
    try {
      const setlist = await api.createSetlist({ name, items: [] });
      navigate(`/setlists/${setlist._id}`);
    } catch (problem) {
      setError(problem.message);
    }
  }

  return (
    <AppShell title="Setlists">
      <form onSubmit={create} className="mb-10 flex max-w-xl flex-wrap gap-3">
        <input className="field flex-1 basis-60" value={name} onChange={(event) => setName(event.target.value)} placeholder="Name, for example Friday at the Hall" required maxLength={120} aria-label="New setlist name" />
        <button type="submit" className="pill pill-primary">Create setlist</button>
      </form>
      <ErrorText error={error} />
      {loading && <LoadingRows label="Loading your setlists" />}
      {loadError && <ErrorState message={loadError} onRetry={retry} />}
      {setlists?.length === 0 && <p className="max-w-xl text-muted">Your setlists will appear here. Name one above, then add songs and set the gaps between them.</p>}
      <ul className="max-w-4xl">
        {setlists?.map((setlist) => (
          <li key={setlist._id} className="border-b border-line">
            <Link to={`/setlists/${setlist._id}`} className="flex min-h-14 flex-wrap items-center justify-between gap-4 py-3 text-text no-underline hover:text-cyan">
              <span className="font-chord text-2xl font-semibold">{setlist.name}</span>
              <span className="tabular text-label text-muted">{setlist.items.length} songs{setlist.venue ? ` · ${setlist.venue}` : ''}</span>
            </Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
