export const songTemplates = [
  { id: 'pop', name: 'Pop 4/4', beatsPerBar: 4, outline: [['Intro', 4], ['Verse', 8], ['Chorus', 8], ['Verse', 8], ['Chorus', 8], ['Bridge', 4], ['Chorus', 8], ['Outro', 4]] },
  { id: 'loop', name: 'Simple loop', outline: [['Intro', 4], ['Verse', 16], ['Chorus', 16], ['Outro', 4]] }
];

export function findTemplate(templateId) {
  return songTemplates.find((template) => template.id === templateId) ?? null;
}

export function templateBarCount(template) {
  return template.outline.reduce((total, [, barCount]) => total + barCount, 0);
}

export function templateSections(templateId) {
  const template = findTemplate(templateId);
  if (!template) return null;
  return template.outline.map(([name, barCount]) => ({
    name,
    bars: Array.from({ length: barCount }, () => ({ chords: [], lyric: '' }))
  }));
}
