export function withBarKeys(sections) {
  let barKey = 0;
  return sections.map((section) => ({ ...section, bars: section.bars.map((bar) => ({ ...bar, barKey: barKey++ })) }));
}

export function withoutBarKeys(sections) {
  return sections.map((section) => ({ ...section, bars: section.bars.map(({ barKey, ...bar }) => bar) }));
}

export function remapAnnotations(annotations, keyedSections) {
  const newIndexByKey = new Map();
  let barIdx = 0;
  for (const section of keyedSections) {
    for (const bar of section.bars) {
      if (bar.barKey !== undefined && !newIndexByKey.has(bar.barKey)) newIndexByKey.set(bar.barKey, barIdx);
      barIdx += 1;
    }
  }
  return annotations
    .filter((annotation) => newIndexByKey.has(annotation.barIdx))
    .map((annotation) => ({ ...annotation, barIdx: newIndexByKey.get(annotation.barIdx) }));
}
