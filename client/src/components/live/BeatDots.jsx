export function BeatDots({ beats, currentBeat, size = 'normal' }) {
  const dotSize = size === 'large' ? 'h-6 w-6' : 'h-4 w-4';
  const accentSize = size === 'large' ? 'h-8 w-8' : 'h-5 w-5';
  return (
    <div className="flex items-center justify-center gap-3" aria-label={`Beat ${currentBeat} of ${beats}`}>
      {Array.from({ length: beats }, (_, index) => {
        const beat = index + 1;
        const lit = beat === currentBeat;
        return (
          <span
            key={lit ? `lit-${currentBeat}` : beat}
            className={`block rounded-full ${beat === 1 ? accentSize : dotSize} ${lit ? 'beat-pulse bg-cyan' : 'bg-surface-2 border border-line'}`}
          />
        );
      })}
    </div>
  );
}
