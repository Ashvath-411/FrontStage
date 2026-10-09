export function CurrentChord({ chord, nextChord, scale }) {
  return (
    <div className="flex min-w-0 items-baseline justify-center gap-4 sm:gap-8">
      <span
        className="font-chord leading-none font-bold text-text"
        style={{ fontSize: `calc(clamp(3.5rem, 13vw, 7.5rem) * ${scale})` }}
      >
        {chord || '–'}
      </span>
      {nextChord && (
        <span className="font-chord flex flex-col leading-none font-semibold text-purple-text" style={{ fontSize: `calc(clamp(1.75rem, 5vw, 3rem) * ${scale})` }}>
          <span className="text-label font-body font-normal text-muted">next</span>
          {nextChord}
        </span>
      )}
    </div>
  );
}
