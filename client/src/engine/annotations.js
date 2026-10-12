export function annotationIsForInstrument(annotation, instrument) {
  if (!instrument || instrument === 'all') return true;
  return annotation.audience.includes('all') || annotation.audience.includes(instrument);
}

export function annotationIsDue(annotation, barIdx) {
  return barIdx >= annotation.barIdx - annotation.leadInBars && barIdx <= annotation.barIdx;
}

export function activeAnnotations(item, barIdx, instrument) {
  return item.annotations.filter((annotation) => annotationIsForInstrument(annotation, instrument) && annotationIsDue(annotation, barIdx));
}
