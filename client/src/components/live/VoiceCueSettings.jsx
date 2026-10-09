import { Toggle } from '../ui/Toggle.jsx';
import { LabeledField } from '../ui/LabeledField.jsx';
import { Slider } from '../ui/Slider.jsx';
import { InstrumentSelect } from './InstrumentSelect.jsx';
import { cueKindInfo, cuePresetNames, matchingPreset, presetKinds, previewSamples } from '../../audio/cuePresets.js';
import { bestEnglishVoice } from '../../audio/voiceCues.js';
import { useEnglishVoices } from '../../hooks/useEnglishVoices.js';

const detailLabels = [['artist', 'Say the artist'], ['key', 'Say the key'], ['bpm', 'Say the tempo']];

function CueToggle({ label, example, checked, onChange }) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 border-b border-line py-2">
      <span className="flex flex-col">
        <span>{label}</span>
        <span className="text-label text-muted">“{example}”</span>
      </span>
      <input type="checkbox" className="h-5 w-5 shrink-0" style={{ accentColor: 'var(--color-cyan)' }} checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function PresetRow({ kinds, onPick }) {
  const current = matchingPreset(kinds);
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Cue presets">
      {cuePresetNames.map(([name, label]) => (
        <button key={name} type="button" aria-pressed={current === name} className={`pill pill-small ${current === name ? 'pill-selected' : 'pill-secondary'}`} onClick={() => onPick(presetKinds(name))}>
          {label}
        </button>
      ))}
    </div>
  );
}

function VoicePicker({ value, onChange }) {
  const voices = useEnglishVoices();
  if (voices.length === 0) return <p className="text-label text-muted">This browser has not listed its voices yet. The default voice is used.</p>;
  const selected = voices.some((voice) => voice.voiceURI === value) ? value : bestEnglishVoice(voices)?.voiceURI;
  return (
    <LabeledField label="Voice">
      <select className="field" value={selected} onChange={(event) => onChange(event.target.value)}>
        {voices.map((voice) => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} ({voice.lang})</option>)}
      </select>
    </LabeledField>
  );
}

export function VoiceCueSettings({ sound, viewPrefs, onViewPrefsChange, joinedInstrument }) {
  const { prefs, updatePrefs: update } = sound;
  if (!sound.voiceAvailable) return <p className="text-muted">Spoken cues are not available in this browser.</p>;
  const setKind = (kind, on) => update({ cueKinds: { ...prefs.cueKinds, [kind]: on } });
  const instrumentLabel = sound.instrument && sound.instrument !== 'all' ? sound.instrument[0].toUpperCase() + sound.instrument.slice(1) : 'Everyone';
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-pretitle font-extrabold">Spoken cues</h3>
      <Toggle label="Spoken cues on" checked={prefs.voiceOn} onChange={(voiceOn) => update({ voiceOn })} />
      <PresetRow kinds={prefs.cueKinds} onPick={(cueKinds) => update({ cueKinds })} />
      {cueKindInfo.map(({ kind, label, example }) => (
        <div key={kind}>
          <CueToggle label={label} example={example} checked={prefs.cueKinds[kind]} onChange={(on) => setKind(kind, on)} />
          {kind === 'next-up' && prefs.cueKinds['next-up'] && (
            <div className="pl-4">
              {detailLabels.map(([detail, detailLabel]) => (
                <Toggle key={detail} label={detailLabel} checked={prefs.nextUpDetails[detail]} onChange={(on) => update({ nextUpDetails: { ...prefs.nextUpDetails, [detail]: on } })} />
              ))}
            </div>
          )}
        </div>
      ))}
      <InstrumentSelect label="Spoken stage notes are for" value={viewPrefs.instrument} joinedInstrument={joinedInstrument} onChange={(instrument) => onViewPrefsChange({ instrument })} />
      <VoicePicker value={prefs.voiceURI} onChange={(voiceURI) => update({ voiceURI })} />
      <Slider label="Speech rate" value={prefs.voiceRate} min={0.8} max={1.3} step={0.05} format={(value) => `${value.toFixed(2)}×`} onChange={(voiceRate) => update({ voiceRate })} />
      <Slider label="Voice volume" value={prefs.voiceVolume} min={0.1} max={1} step={0.1} format={(value) => `${Math.round(value * 100)}%`} onChange={(voiceVolume) => update({ voiceVolume })} />
      <div><button type="button" className="pill pill-secondary" onClick={() => sound.previewCues(previewSamples(prefs.cueKinds, instrumentLabel))}>Preview cues</button></div>
      <p className="text-label text-muted">Cues are timed to finish before the moment they announce. Clicks, not speech, set the count-in.</p>
    </section>
  );
}
