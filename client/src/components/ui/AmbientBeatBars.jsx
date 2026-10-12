const barDelays = [0, 0.6, 1.2, 1.8, 0.3, 0.9, 1.5, 2.1, 0.45, 1.05, 1.65, 2.25];

export function AmbientBeatBars() {
  return (
    <div aria-hidden="true" className="flex h-20 items-end gap-2 sm:h-28 sm:gap-3">
      {barDelays.map((delay, index) => (
        <span
          key={index}
          className="ambient-bar block w-2 rounded-full sm:w-3"
          style={{
            height: '100%',
            animationDelay: `${delay}s`,
            background: index % 4 === 0 ? 'var(--color-cyan)' : 'var(--color-purple)'
          }}
        />
      ))}
    </div>
  );
}
