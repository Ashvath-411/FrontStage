import { splitBarLine } from './parseChart.js';

const maxLyricLength = 300;

function isBarLine(line) {
  const trimmed = line.trim();
  return trimmed !== '' && !trimmed.startsWith('#');
}

function barLineWithLyric(line, lyric) {
  const chords = splitBarLine(line.trim()).chordText.trim();
  if (!lyric) return chords || '.';
  return chords && chords !== '.' ? `${chords} / ${lyric}` : `/ ${lyric}`;
}

function pastedLines(lyricsText) {
  const lines = lyricsText.replace(/\r/g, '').split('\n');
  while (lines.length > 0 && !lines.at(-1).trim()) lines.pop();
  return lines;
}

export function applyLyrics(chartText, lyricsText, { startBar = 1, barsPerLine = 1 }) {
  const lines = chartText.split('\n');
  const barLineIndexes = lines.flatMap((line, index) => (isBarLine(line) ? [index] : []));
  let placedLines = 0;
  let unplacedLines = 0;
  pastedLines(lyricsText).forEach((pastedLine, group) => {
    const words = pastedLine.trim().slice(0, maxLyricLength);
    const firstBar = startBar - 1 + group * barsPerLine;
    if (!words) return;
    if (firstBar < 0 || firstBar >= barLineIndexes.length) {
      unplacedLines += 1;
      return;
    }
    for (let offset = 0; offset < barsPerLine && firstBar + offset < barLineIndexes.length; offset += 1) {
      const lineIndex = barLineIndexes[firstBar + offset];
      lines[lineIndex] = barLineWithLyric(lines[lineIndex], offset === 0 ? words : '');
    }
    placedLines += 1;
  });
  return { text: lines.join('\n'), placedLines, unplacedLines };
}
