export const amazingGrace = {
  title: 'Amazing Grace',
  artist: 'John Newton (1779), traditional tune',
  keyRoot: 'G',
  keyMode: 'major',
  bpm: 80,
  beatsPerBar: 3,
  energy: 2,
  chart: `# Verse 1
G / First line
G / of verse one
C / goes
G / here
G / Second line
G / of verse one
D / goes
D /
G / Third line
G / of verse one
C / goes
G / here
G / Fourth line
D / of verse
G / one
G /
# Verse 2
G / First line
G / of verse two
C / goes
G / here
G / Second line
G / of verse two
D / goes
D /
G / Third line
G / of verse two
C / goes
G / here
G / Fourth line
D / of verse
G / two
G /`,
  annotations: [{ barIdx: 16, kind: 'dynamics', text: 'Soft pad, build into verse 2', audience: ['keys'], leadInBars: 2 }]
};

export const saints = {
  title: 'When the Saints Go Marching In',
  artist: 'Traditional',
  keyRoot: 'C',
  keyMode: 'major',
  bpm: 112,
  beatsPerBar: 4,
  energy: 4,
  chart: `# Chorus
C / First line
C / of the chorus
C / second line
G / of the chorus
C / Third line
F / of the chorus
C G / fourth line
C / to end it
# Last chorus bpm=132
C / First line
C / of the last chorus
C / second line
G / of the last chorus
C / Third line
F / of the last chorus
C G / fourth line
C / to end the song`,
  annotations: [{ barIdx: 8, kind: 'cue', text: 'Double time, full kit', audience: ['drums'], leadInBars: 1 }]
};
