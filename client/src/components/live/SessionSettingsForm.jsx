import { useState } from 'react';
import { useToast } from '../../toastContext.jsx';
import { api } from '../../api.js';
import { Toggle } from '../ui/Toggle.jsx';
import { LabeledField } from '../ui/LabeledField.jsx';
import { ErrorText } from '../ui/ErrorText.jsx';

function draftFromSession(session) {
  return {
    maxParticipants: session.maxParticipants,
    locked: session.locked,
    allowLateJoin: session.allowLateJoin,
    controllerPolicy: session.controllerPolicy,
    password: '',
    settings: { ...session.settings }
  };
}

function SettingNumber({ label, value, min, max, step, onChange }) {
  return (
    <LabeledField label={label}>
      <input className="field tabular" type="number" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </LabeledField>
  );
}

export function SessionSettingsForm({ session }) {
  const showToast = useToast();
  const [draft, setDraft] = useState(() => draftFromSession(session));
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const setSetting = (key, value) => setDraft({ ...draft, settings: { ...draft.settings, [key]: value } });

  async function run(action, doneText) {
    setError('');
    setMessage('');
    try {
      await action();
      setMessage(doneText);
      showToast(doneText);
    } catch (problem) {
      setError(problem.message);
      showToast(problem.message, 'error');
    }
  }

  function save() {
    const { password, ...fields } = draft;
    return run(() => api.updateSession(session.id, password ? { ...fields, password } : fields), 'Session settings saved.');
  }

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-pretitle font-extrabold">Session</h3>
      <div className="grid grid-cols-2 gap-3">
        <SettingNumber label="Max participants" value={draft.maxParticipants} min={1} max={50} onChange={(maxParticipants) => setDraft({ ...draft, maxParticipants })} />
        <SettingNumber label="Next-up seconds" value={draft.settings.nextUpSeconds} min={3} max={20} onChange={(value) => setSetting('nextUpSeconds', value)} />
        <SettingNumber label="Start lead ms" value={draft.settings.startLeadMs} min={500} max={5000} step={100} onChange={(value) => setSetting('startLeadMs', value)} />
        <LabeledField label="Controls">
          <select className="field" value={draft.controllerPolicy} onChange={(event) => setDraft({ ...draft, controllerPolicy: event.target.value })}>
            <option value="host_only">Host only</option>
            <option value="selected">Selected</option>
            <option value="everyone">Everyone</option>
          </select>
        </LabeledField>
      </div>
      <LabeledField label={session.hasPassword ? 'New password (a password is set)' : 'Password (none set)'}>
        <input className="field" value={draft.password} onChange={(event) => setDraft({ ...draft, password: event.target.value })} autoComplete="off" maxLength={100} />
      </LabeledField>
      <Toggle label="Lock (no new joins)" checked={draft.locked} onChange={(locked) => setDraft({ ...draft, locked })} />
      <Toggle label="Allow late joining" checked={draft.allowLateJoin} onChange={(allowLateJoin) => setDraft({ ...draft, allowLateJoin })} />
      <Toggle label="Auto advance" checked={draft.settings.autoAdvance} onChange={(value) => setSetting('autoAdvance', value)} />
      <Toggle label="Show lyrics" checked={draft.settings.showLyrics} onChange={(value) => setSetting('showLyrics', value)} />
      <Toggle label="Show stage notes" checked={draft.settings.showAnnotations} onChange={(value) => setSetting('showAnnotations', value)} />
      <Toggle label="Click on by default for members" checked={draft.settings.audioClick} onChange={(value) => setSetting('audioClick', value)} />
      <ErrorText error={error} />
      {message && <p className="text-muted" role="status">{message}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="pill pill-primary" onClick={save}>Save settings</button>
        <button type="button" className="pill pill-secondary" onClick={() => run(() => api.refreshSnapshot(session.id), 'Songs reloaded from the setlist.')}>Reload songs</button>
        {session.hasPassword && (
          <button type="button" className="pill pill-secondary" onClick={() => run(() => api.updateSession(session.id, { password: '' }), 'Password removed.')}>Remove password</button>
        )}
      </div>
    </section>
  );
}
