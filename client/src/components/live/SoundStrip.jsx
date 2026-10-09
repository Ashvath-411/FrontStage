export function SoundStrip({ sound }) {
  if (sound.enabled) return null;
  if (sound.contextState === 'unsupported') return <p className="text-label border-b border-line py-2 text-muted">This browser cannot play the click. Spoken cues may still work.</p>;
  return (
    <button type="button" className="text-label flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 border-b border-alert/60 text-alert hover:text-text" onClick={sound.enable}>
      Sound off, tap to enable
    </button>
  );
}
