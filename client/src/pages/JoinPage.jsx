import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useJoinForm } from '../hooks/useJoinForm.js';
import { AppShell } from '../components/ui/AppShell.jsx';
import { RejoinBanner } from '../components/ui/RejoinBanner.jsx';
import { LabeledField } from '../components/ui/LabeledField.jsx';
import { instruments } from '../musicOptions.js';
import { codeFromInput } from '../joinMessages.js';

function JoinProblem({ problem, onChangeCode }) {
  if (!problem) return null;
  return (
    <div role="alert" className="flex flex-col gap-2 rounded-[4px] border border-alert p-3">
      <p className="text-alert">{problem.text}</p>
      <p className="text-muted">{problem.nextStep}</p>
      {problem.changeCode && <div><button type="button" className="pill pill-small pill-secondary" onClick={onChangeCode}>Change code</button></div>}
    </div>
  );
}

export function JoinPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const form = useJoinForm(codeFromInput(searchParams.get('code') ?? ''));
  const [step, setStep] = useState(form.fields.code.length === 6 ? 'details' : 'code');

  function submitCode(event) {
    event.preventDefault();
    if (form.fields.code.length === 6) setStep('details');
  }

  async function submitDetails(event) {
    event.preventDefault();
    const sessionId = await form.join();
    if (sessionId) navigate(`/session/${sessionId}`);
  }

  return (
    <AppShell pageTitle="Join with code">
      <RejoinBanner />
      {step === 'code' ? (
        <form onSubmit={submitCode} className="mt-8 flex max-w-md flex-col gap-6">
          <h1 className="font-accent text-3xl font-extrabold">Join with code</h1>
          <LabeledField label="Session code" hint="Six letters and numbers from the host's screen. You can also paste the whole link.">
            <input
              className="field code-field font-chord min-h-20 text-center text-5xl font-semibold tracking-[0.3em] uppercase"
              value={form.fields.code}
              onChange={(event) => form.update('code', codeFromInput(event.target.value))}
              onPaste={(event) => {
                const pasted = codeFromInput(event.clipboardData.getData('text'));
                if (pasted.length !== 6) return;
                event.preventDefault();
                form.update('code', pasted);
                setStep('details');
              }}
              inputMode="text"
              autoComplete="off"
              autoFocus
              aria-label="Session code"
            />
          </LabeledField>
          <div><button type="submit" className="pill pill-primary" disabled={form.fields.code.length !== 6}>Next</button></div>
        </form>
      ) : (
        <form onSubmit={submitDetails} className="mt-8 flex max-w-md flex-col gap-5">
          <h1 className="font-accent text-3xl font-extrabold">Join <span className="font-chord tracking-widest">{form.fields.code}</span></h1>
          <LabeledField label="Your name">
            <input className="field" value={form.fields.displayName} onChange={(event) => form.update('displayName', event.target.value)} required maxLength={40} autoFocus />
          </LabeledField>
          <LabeledField label="Instrument" hint="Stage notes for your instrument are shown to you.">
            <select className="field" value={form.fields.instrument} onChange={(event) => form.update('instrument', event.target.value)}>
              {instruments.map((instrument) => <option key={instrument}>{instrument}</option>)}
            </select>
          </LabeledField>
          <LabeledField label="Password" hint="Only if the host set one.">
            <input className="field" type="password" value={form.fields.password} onChange={(event) => form.update('password', event.target.value)} autoComplete="off" />
          </LabeledField>
          <JoinProblem problem={form.problem} onChangeCode={() => setStep('code')} />
          <div className="flex flex-wrap gap-3">
            <button type="submit" className="pill pill-primary" disabled={form.busy}>Join session</button>
            <button type="button" className="pill pill-secondary" onClick={() => setStep('code')}>Change code</button>
          </div>
        </form>
      )}
    </AppShell>
  );
}
