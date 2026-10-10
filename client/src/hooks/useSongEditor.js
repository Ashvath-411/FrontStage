import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { parseChart } from '../engine/parseChart.js';
import { updateBar } from '../engine/chartEdits.js';
import { unreadableChords } from '../engine/chordCheck.js';
import { remapAnnotations, withBarKeys, withoutBarKeys } from '../engine/barKeys.js';

const starterChart = `# Verse
C / First line of the verse
F . C G / Second line
# Chorus
F C / Chorus line
G . C / End of chorus`;

function withTrimmedLyrics(sections) {
  return sections.map((section) => ({ ...section, bars: section.bars.map((bar) => ({ ...bar, lyric: (bar.lyric ?? '').trim() })) }));
}

const blankMeta = { title: '', artist: '', keyRoot: 'C', keyMode: 'major', bpm: 96, beatsPerBar: 4, energy: 3 };

function metaFromSong(song) {
  return {
    title: song.title,
    artist: song.artist ?? '',
    keyRoot: song.keyRoot,
    keyMode: song.keyMode,
    bpm: song.bpm,
    beatsPerBar: song.beatsPerBar,
    energy: song.energy ?? 3
  };
}

export function useSongEditor(songId) {
  const isNew = songId === 'new';
  const [meta, setMeta] = useState(blankMeta);
  const [sections, setSections] = useState(() => (isNew ? parseChart(starterChart, { beatsPerBar: 4 }) : []));
  const [annotations, setAnnotations] = useState([]);
  const [undoState, setUndoState] = useState(null);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    setLoadError('');
    api.getSong(songId)
      .then((song) => {
        setMeta(metaFromSong(song));
        setSections(song.sections);
        setAnnotations(song.annotations);
      })
      .catch((problem) => setLoadError(problem.message))
      .finally(() => setLoading(false));
  }, [songId, isNew, loadAttempt]);

  const defaults = { bpm: Number(meta.bpm) || 96, beatsPerBar: Number(meta.beatsPerBar) || 4 };

  function changeBar(barIdx, changes, refreshFields = false) {
    setSections((current) => updateBar(current, barIdx, changes));
    if (refreshFields) setRevision((value) => value + 1);
  }

  function replaceChart(nextSections, nextAnnotations = annotations) {
    setUndoState({ sections, annotations });
    setSections(nextSections);
    setAnnotations(nextAnnotations);
    setRevision((value) => value + 1);
  }

  function changeStructure(transform) {
    const keyed = withBarKeys(sections);
    const result = transform(keyed);
    if (result.error) return result.error;
    replaceChart(withoutBarKeys(result.sections), remapAnnotations(annotations, result.sections));
    return '';
  }

  function restore(content) {
    setMeta(content.meta);
    replaceChart(content.sections, content.annotations);
  }

  function undo() {
    if (!undoState) return;
    setSections(undoState.sections);
    setAnnotations(undoState.annotations);
    setUndoState(null);
    setRevision((value) => value + 1);
  }

  async function save(sectionsToSave = sections) {
    const unreadable = unreadableChords(sectionsToSave);
    if (unreadable.length > 0) {
      setError(`These chords cannot be transposed. Fix them before saving: ${unreadable.join(', ')}`);
      return null;
    }
    setError('');
    const song = { ...meta, bpm: Number(meta.bpm), beatsPerBar: Number(meta.beatsPerBar), energy: Number(meta.energy), sections: withTrimmedLyrics(sectionsToSave), annotations };
    try {
      const saved = isNew ? await api.createSong(song) : await api.updateSong(songId, song);
      setSavedAt(new Date());
      return saved;
    } catch (problem) {
      setError(problem.message);
      return null;
    }
  }

  async function remove() {
    await api.deleteSong(songId);
  }

  return {
    isNew, meta, setMeta, defaults, sections, changeBar, replaceChart, changeStructure, restore, undo, canUndo: Boolean(undoState), revision,
    annotations, setAnnotations, loading, error, setError, savedAt, save, remove,
    loadError, retryLoad: () => setLoadAttempt((value) => value + 1)
  };
}
