import { useEffect, useState } from 'react';
import { api } from '../api.js';

const newItemDefaults = { transpose: 0, tempoPct: 100, countInBars: 1, gapMode: 'countdown', gapSeconds: 8, note: '' };

function moveInList(list, from, to) {
  if (to < 0 || to >= list.length) return list;
  const copy = [...list];
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved);
  return copy;
}

export function useSetlistBuilder(setlistId) {
  const [details, setDetails] = useState({ name: '', venue: '', eventDate: '' });
  const [items, setItems] = useState([]);
  const [library, setLibrary] = useState([]);
  const [songsById, setSongsById] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [removedCount, setRemovedCount] = useState(0);
  const [loadAttempt, setLoadAttempt] = useState(0);

  async function loadSongs(songIds) {
    const missing = [...new Set(songIds)].filter((songId) => !songsById[songId]);
    const songs = await Promise.all(missing.map((songId) => api.getSong(songId)));
    setSongsById((current) => ({ ...current, ...Object.fromEntries(songs.map((song) => [song._id, song])) }));
  }

  useEffect(() => {
    setLoading(true);
    setLoadError('');
    Promise.all([api.getSetlist(setlistId), api.listSongs()])
      .then(async ([setlist, songs]) => {
        setDetails({ name: setlist.name, venue: setlist.venue ?? '', eventDate: setlist.eventDate?.slice(0, 10) ?? '' });
        const libraryIds = new Set(songs.map((song) => song._id));
        const kept = setlist.items.filter((item) => libraryIds.has(item.songId));
        setItems(kept);
        setRemovedCount(setlist.items.length - kept.length);
        setLibrary(songs);
        await loadSongs(kept.map((item) => item.songId));
      })
      .catch((problem) => setLoadError(problem.message))
      .finally(() => setLoading(false));
  }, [setlistId, loadAttempt]);

  function updateItem(index, fields) {
    setItems(items.map((item, position) => (position === index ? { ...item, ...fields } : item)));
  }

  async function addSong(songId) {
    setItems([...items, { ...newItemDefaults, songId }]);
    await loadSongs([songId]);
  }

  async function save() {
    setError('');
    try {
      await api.updateSetlist(setlistId, { ...details, eventDate: details.eventDate || null, items });
      setSavedAt(new Date());
      return true;
    } catch (problem) {
      setError(problem.message);
      return false;
    }
  }

  return {
    details,
    setDetails,
    items,
    library,
    songsById,
    loading,
    error,
    savedAt,
    save,
    addSong,
    updateItem,
    moveItem: (index, delta) => setItems(moveInList(items, index, index + delta)),
    removeItem: (index) => setItems(items.filter((_, position) => position !== index))
  , loadError, removedCount, retryLoad: () => setLoadAttempt((value) => value + 1) };
}
