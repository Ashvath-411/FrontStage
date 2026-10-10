import { describe, it, expect } from 'vitest';
import { activeAnnotations } from './annotations.js';

const item = {
  annotations: [
    { barIdx: 8, kind: 'cue', text: 'Drums enter', audience: ['drums'], leadInBars: 1 },
    { barIdx: 8, kind: 'gear', text: 'Switch to organ', audience: ['keys'], leadInBars: 2 },
    { barIdx: 12, kind: 'dynamics', text: 'Everyone soft', audience: ['all'], leadInBars: 0 }
  ]
};

const texts = (annotations) => annotations.map((annotation) => annotation.text);

describe('activeAnnotations', () => {
  it('shows a drummer only drum cues and notes for everyone', () => {
    expect(texts(activeAnnotations(item, 7, 'drums'))).toEqual(['Drums enter']);
    expect(texts(activeAnnotations(item, 12, 'drums'))).toEqual(['Everyone soft']);
  });

  it('shows keys only keys cues', () => {
    expect(texts(activeAnnotations(item, 6, 'keys'))).toEqual(['Switch to organ']);
    expect(texts(activeAnnotations(item, 7, 'keys'))).toEqual(['Switch to organ']);
  });

  it('starts leadInBars before the bar and stops after the bar passes', () => {
    expect(texts(activeAnnotations(item, 6, 'drums'))).toEqual([]);
    expect(texts(activeAnnotations(item, 8, 'drums'))).toEqual(['Drums enter']);
    expect(texts(activeAnnotations(item, 9, 'drums'))).toEqual([]);
  });

  it('shows every note when no instrument is chosen or all is chosen', () => {
    expect(texts(activeAnnotations(item, 8, ''))).toEqual(['Drums enter', 'Switch to organ']);
    expect(texts(activeAnnotations(item, 8, 'all'))).toEqual(['Drums enter', 'Switch to organ']);
  });
});
