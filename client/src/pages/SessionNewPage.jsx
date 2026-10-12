import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { AppShell } from '../components/ui/AppShell.jsx';
import { ErrorText } from '../components/ui/ErrorText.jsx';
import { LabeledField } from '../components/ui/LabeledField.jsx';
import { Toggle } from '../components/ui/Toggle.jsx';
import { useLoad } from '../hooks/useLoad.js';
import { ErrorState, LoadingRows } from '../components/ui/LoadState.jsx';

const defaultForm = {
  setlistId: '',
  name: '',
  maxParticipants: 8,
  password: '',
  controllerPolicy: 'host_only',
  allowLateJoin: true,
  settings: { nextUpSeconds: 8, autoAdvance: true, startLeadMs: 1500, showLyrics: true, showAnnotations: true, audioClick: false }
};

export function SessionNewPage() {
  const navigate = useNavigate();
  const { data: setlists, error: loadError, loading, retry } = useLoad(api.listSetlists);
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState('');


  function update(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  function updateSetting(key, value) {
    setForm({ ...form, settings: { ...form.settings, [key]: value } });
  }

  async function create(event) {
    event.preventDefault();
    setError('');
    try {
      const settings = { ...form.settings, nextUpSeconds: Number(form.settings.nextUpSeconds), startLeadMs: Number(form.settings.startLeadMs) };
      const session = await api.createSession({ ...form, maxParticipants: Number(form.maxParticipants), settings });
      navigate(`/session/${session.id}`);
    } catch (problem) {
      setError(problem.message);
    }
  }

  if (loading) return <AppShell title="New session"><LoadingRows label="Loading your setlists" /></AppShell>;
  if (loadError) return <AppShell title="New session"><ErrorState message={loadError} onRetry={retry} /></AppShell>;
  if (setlists?.length === 0) {
    return (
      <AppShell title="New session">
        <div className="flex max-w-xl flex-col gap-4">
          <p className="text-muted">A session plays one of your setlists, so you need a setlist first. Your setlists will be offered here once you have one.</p>
          <div><Link to="/setlists" className="pill pill-primary no-underline">Create a setlist</Link></div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="New session">
      <form onSubmit={create} className="flex max-w-2xl flex-col gap-5">
        <LabeledField label="Setlist">
          <select className="field" name="setlistId" value={form.setlistId} onChange={update} required>
            <option value="">Choose a setlist</option>
            {setlists?.map((setlist) => <option key={setlist._id} value={setlist._id}>{setlist.name} ({setlist.items.length} songs)</option>)}
          </select>
        </LabeledField>
        <div className="grid gap-4 sm:grid-cols-2">
          <LabeledField label="Session name" hint="Leave empty to use the setlist name.">
            <input className="field" name="name" value={form.name} onChange={update} maxLength={80} />
          </LabeledField>
          <LabeledField label="Password" hint="Optional. Members type it once to join.">
            <input className="field" name="password" value={form.password} onChange={update} maxLength={100} autoComplete="off" />
          </LabeledField>
          <LabeledField label="Max participants, host included">
            <input className="field tabular" type="number" name="maxParticipants" min={1} max={50} value={form.maxParticipants} onChange={update} />
          </LabeledField>
          <LabeledField label="Who controls playback">
            <select className="field" name="controllerPolicy" value={form.controllerPolicy} onChange={update}>
              <option value="host_only">Host only</option>
              <option value="selected">Host and selected members</option>
              <option value="everyone">Everyone</option>
            </select>
          </LabeledField>
          <LabeledField label="Next-up card, seconds before the end">
            <input className="field tabular" type="number" min={3} max={20} value={form.settings.nextUpSeconds} onChange={(event) => updateSetting('nextUpSeconds', event.target.value)} />
          </LabeledField>
          <LabeledField label="Start lead, ms">
            <input className="field tabular" type="number" min={500} max={5000} step={100} value={form.settings.startLeadMs} onChange={(event) => updateSetting('startLeadMs', event.target.value)} />
          </LabeledField>
        </div>
        <div>
          <Toggle label="Allow late joining" checked={form.allowLateJoin} onChange={(allowLateJoin) => setForm({ ...form, allowLateJoin })} />
          <Toggle label="Auto advance to the next song" checked={form.settings.autoAdvance} onChange={(value) => updateSetting('autoAdvance', value)} />
          <Toggle label="Show lyrics" checked={form.settings.showLyrics} onChange={(value) => updateSetting('showLyrics', value)} />
          <Toggle label="Show stage notes" checked={form.settings.showAnnotations} onChange={(value) => updateSetting('showAnnotations', value)} />
          <Toggle label="Click on by default for members" checked={form.settings.audioClick} onChange={(value) => updateSetting('audioClick', value)} />
        </div>
        <ErrorText error={error} />
        <div><button type="submit" className="pill pill-primary">Create session</button></div>
      </form>
    </AppShell>
  );
}
