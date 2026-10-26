const letterSemitones = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const chordPattern = /^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/;
export const bassRange = { low: 40, high: 51 };
export const toneRange = { low: 55, high: 66 };
const mostTones = 5;

const extensionSteps = [
  ['maj13', (tones) => tones.add(11).add(14).add(21)],
  ['maj11', (tones) => tones.add(11).add(14).add(17)],
  ['maj9', (tones) => tones.add(11).add(14)],
  ['maj7', (tones) => tones.add(11)],
  ['add13', (tones) => tones.add(21)],
  ['add11', (tones) => tones.add(17)],
  ['add9', (tones) => tones.add(14)],
  ['add4', (tones) => tones.add(5)],
  ['add2', (tones) => tones.add(2)],
  ['sus2', (tones) => replaceThird(tones, 2)],
  ['sus4', (tones) => replaceThird(tones, 5)],
  ['sus', (tones) => replaceThird(tones, 5)],
  ['69', (tones) => tones.add(9).add(14)],
  ['b13', (tones) => tones.add(20)],
  ['#11', (tones) => tones.add(18)],
  ['b9', (tones) => tones.add(13)],
  ['#9', (tones) => tones.add(15)],
  ['b5', (tones) => moveFifth(tones, 6)],
  ['#5', (tones) => moveFifth(tones, 8)],
  ['13', (tones) => tones.add(10).add(14).add(21)],
  ['11', (tones) => tones.add(10).add(14).add(17)],
  ['9', (tones) => tones.add(10).add(14)],
  ['7', (tones) => tones.add(10)],
  ['6', (tones) => tones.add(9)],
  ['5', (tones) => replaceThird(tones, null)]
];

function replaceThird(tones, interval) {
  tones.delete(3);
  tones.delete(4);
  if (interval !== null) tones.add(interval);
  return tones;
}

function moveFifth(tones, interval) {
  tones.delete(7);
  tones.add(interval);
  return tones;
}

export function pitchClassOf(noteName) {
  const accidental = noteName[1] === '#' ? 1 : noteName[1] === 'b' ? -1 : 0;
  return (letterSemitones[noteName[0]] + accidental + 12) % 12;
}

function baseTones(quality) {
  const tones = new Set([0, 4, 7]);
  if (/^dim7/.test(quality)) return { tones: new Set([0, 3, 6, 9]), rest: quality.slice(4) };
  if (/^dim/.test(quality)) return { tones: new Set([0, 3, 6]), rest: quality.slice(3) };
  if (/^(aug|\+)/.test(quality)) return { tones: new Set([0, 4, 8]), rest: quality.replace(/^(aug|\+)/, '') };
  if (/^(min|m)(?!aj)/.test(quality) || /^-/.test(quality)) return { tones: new Set([0, 3, 7]), rest: quality.replace(/^(min|m|-)/, '') };
  if (/^maj(?![0-9])/.test(quality)) return { tones, rest: quality.slice(3) };
  return { tones, rest: quality };
}

export function chordIntervals(quality) {
  let { tones, rest } = baseTones(quality);
  while (rest.length > 0) {
    const step = extensionSteps.find(([token]) => rest.startsWith(token));
    if (!step) break;
    tones = step[1](tones);
    rest = rest.slice(step[0].length);
  }
  return [...tones].sort((first, second) => first - second);
}

function placeInRange(pitchClass, range) {
  return range.low + ((((pitchClass - range.low) % 12) + 12) % 12);
}

function trimmedIntervals(intervals) {
  if (intervals.length <= mostTones) return intervals;
  return intervals.filter((interval) => interval !== 7).slice(0, mostTones);
}

export function chordNotes(chord, transpose = 0) {
  const match = typeof chord === 'string' ? chord.trim().replace('6/9', '69').match(chordPattern) : null;
  if (!match) return null;
  const [, root, quality, slashBass] = match;
  const intervals = chordIntervals(quality);
  const rootPc = (pitchClassOf(root) + transpose + 1200) % 12;
  const bassPc = slashBass ? (pitchClassOf(slashBass) + transpose + 1200) % 12 : rootPc;
  const tones = [...new Set(trimmedIntervals(intervals).map((interval) => placeInRange((rootPc + interval) % 12, toneRange)))].sort((first, second) => first - second);
  const bass = placeInRange(bassPc, bassRange);
  return { bass, tones, pitches: [bass, ...tones] };
}
