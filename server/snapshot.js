function resolveSections(song) {
  let bpm = song.bpm;
  let beatsPerBar = song.beatsPerBar ?? 4;
  let firstBar = 0;
  const resolved = [];
  for (const section of song.sections ?? []) {
    bpm = section.bpm ?? bpm;
    beatsPerBar = section.beatsPerBar ?? beatsPerBar;
    const barCount = section.bars.length;
    if (barCount > 0) resolved.push({ name: section.name, bpm, beatsPerBar, firstBar, barCount });
    firstBar += barCount;
  }
  return resolved;
}

function flattenBars(song) {
  return (song.sections ?? []).flatMap((section) =>
    section.bars.map((bar) => ({
      chords: (bar.chords ?? []).map((entry) => ({ beat: entry.beat, chord: entry.chord })),
      lyric: bar.lyric ?? ''
    }))
  );
}

function validAnnotations(song, barCount) {
  return (song.annotations ?? [])
    .filter((annotation) => annotation.barIdx < barCount)
    .sort((a, b) => a.barIdx - b.barIdx)
    .map((annotation) => ({
      barIdx: annotation.barIdx,
      kind: annotation.kind,
      text: annotation.text,
      audience: [...annotation.audience],
      leadInBars: annotation.leadInBars
    }));
}

function snapshotItem(song, setlistItem, itemIdx) {
  const bars = flattenBars(song);
  return {
    itemIdx,
    songId: String(song._id),
    title: song.title,
    artist: song.artist ?? '',
    keyRoot: song.keyRoot,
    keyMode: song.keyMode ?? 'major',
    bpm: song.bpm,
    beatsPerBar: song.beatsPerBar ?? 4,
    sections: resolveSections(song),
    bars,
    annotations: validAnnotations(song, bars.length),
    transpose: setlistItem.transpose ?? 0,
    tempoPct: setlistItem.tempoPct ?? 100,
    countInBars: setlistItem.countInBars ?? 1,
    gapMode: setlistItem.gapMode ?? 'countdown',
    gapSeconds: setlistItem.gapSeconds ?? 8,
    note: setlistItem.note ?? ''
  };
}

export function buildSnapshot(setlist, songs) {
  const songsById = new Map(songs.map((song) => [String(song._id), song]));
  return setlist.items
    .map((setlistItem) => ({ setlistItem, song: songsById.get(String(setlistItem.songId)) }))
    .filter(({ song }) => song)
    .map(({ setlistItem, song }, itemIdx) => snapshotItem(song, setlistItem, itemIdx));
}
