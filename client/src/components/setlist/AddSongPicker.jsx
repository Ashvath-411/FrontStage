import { useState } from 'react';
import { Link } from 'react-router-dom';

export function AddSongPicker({ library, onAdd }) {
  const [songId, setSongId] = useState('');
  if (library.length === 0) {
    return <p className="text-muted">Songs from your library can be added here. <Link to="/songs/new" className="text-cyan">Write your first song</Link>.</p>;
  }
  return (
    <div className="flex max-w-xl flex-wrap gap-3">
      <select className="field flex-1 basis-60" value={songId} onChange={(event) => setSongId(event.target.value)} aria-label="Song to add">
        <option value="">Choose a song</option>
        {library.map((song) => <option key={song._id} value={song._id}>{song.title}</option>)}
      </select>
      <button type="button" className="pill pill-secondary" disabled={!songId} onClick={() => onAdd(songId)}>Add song</button>
    </div>
  );
}
