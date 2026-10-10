import { instruments } from '../../musicOptions.js';

export function AudiencePicker({ audience, onChange }) {
  function toggle(instrument) {
    if (instrument === 'all') return onChange(['all']);
    const withoutAll = audience.filter((entry) => entry !== 'all');
    const next = withoutAll.includes(instrument) ? withoutAll.filter((entry) => entry !== instrument) : [...withoutAll, instrument];
    onChange(next.length === 0 ? ['all'] : next);
  }
  return (
    <fieldset className="flex flex-wrap gap-2">
      <legend className="text-label mb-1.5 text-muted">Who sees it</legend>
      {['all', ...instruments].map((instrument) => {
        const active = audience.includes(instrument);
        return (
          <button
            key={instrument}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(instrument)}
            className={`pill pill-small ${active ? 'pill-selected' : ''}`}
          >
            {instrument}
          </button>
        );
      })}
    </fieldset>
  );
}
