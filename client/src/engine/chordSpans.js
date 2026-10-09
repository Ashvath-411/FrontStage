export function chordSpans(chords, beatsPerBar) {
  const sorted = [...chords].sort((first, second) => first.beat - second.beat);
  if (sorted.length === 0) return [];
  const segments = [];
  if (sorted[0].beat > 1) segments.push({ chord: null, beat: null, size: (sorted[0].beat - 1) / beatsPerBar });
  sorted.forEach((entry, index) => {
    const endBeat = sorted[index + 1]?.beat ?? beatsPerBar + 1;
    segments.push({ chord: entry.chord, beat: entry.beat, size: Math.max(0, endBeat - entry.beat) / beatsPerBar });
  });
  return segments;
}
