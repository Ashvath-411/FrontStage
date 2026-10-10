import { LabeledField } from '../ui/LabeledField.jsx';
import { ErrorText } from '../ui/ErrorText.jsx';

const formatHint = 'One bar per line. Chords before " / ", words after. A dot holds the previous chord. "# Chorus bpm=100 ts=3" starts a section.';

export function ChartTextPane({ text, error, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      <LabeledField label="Chart as text" hint={formatHint}>
        <textarea
          className="field font-mono min-h-80 text-sm"
          value={text}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
          rows={18}
        />
      </LabeledField>
      <ErrorText error={error} />
    </div>
  );
}
