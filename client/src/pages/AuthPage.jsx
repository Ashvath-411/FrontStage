import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../authContext.jsx';
import { AppShell } from '../components/ui/AppShell.jsx';
import { LabeledField } from '../components/ui/LabeledField.jsx';
import { ErrorText } from '../components/ui/ErrorText.jsx';

const copy = {
  login: { title: 'Host login', button: 'Log in', switchText: 'No account yet?', switchLink: '/register', switchLabel: 'Register' },
  register: { title: 'Create a host account', button: 'Register', switchText: 'Already registered?', switchLink: '/login', switchLabel: 'Log in' }
};

export function AuthPage({ mode }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [fields, setFields] = useState({ email: '', password: '', displayName: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const text = copy[mode];

  function update(event) {
    setFields({ ...fields, [event.target.name]: event.target.value });
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await auth.signIn(mode, fields);
      navigate(location.state?.from ?? '/library', { replace: true });
    } catch (problem) {
      setError(problem.message);
      setBusy(false);
    }
  }

  return (
    <AppShell pageTitle={text.title}>
      <form onSubmit={submit} className="mt-12 flex max-w-md flex-col gap-5">
        <h1 className="font-accent text-3xl font-extrabold">{text.title}</h1>
        {mode === 'register' && (
          <LabeledField label="Display name">
            <input className="field" name="displayName" value={fields.displayName} onChange={update} required maxLength={60} autoComplete="name" />
          </LabeledField>
        )}
        <LabeledField label="Email">
          <input className="field" type="email" name="email" value={fields.email} onChange={update} required autoComplete="email" />
        </LabeledField>
        <LabeledField label="Password" hint={mode === 'register' ? 'At least 8 characters.' : ''}>
          <input className="field" type="password" name="password" value={fields.password} onChange={update} required minLength={8} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} />
        </LabeledField>
        <ErrorText error={error} />
        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" className="pill pill-primary" disabled={busy}>{text.button}</button>
          <span className="text-muted">
            {text.switchText} <Link to={text.switchLink} className="inline-flex min-h-12 items-center text-cyan">{text.switchLabel}</Link>
          </span>
        </div>
      </form>
    </AppShell>
  );
}
