import { Link } from 'react-router-dom';
import { AppShell } from '../ui/AppShell.jsx';

export function SessionMessage({ title, text, joinCode }) {
  return (
    <AppShell pageTitle={title}>
      <div className="mt-12 flex max-w-lg flex-col gap-4">
        <h1 className="font-accent text-3xl font-extrabold">{title}</h1>
        <p className="text-muted">{text}</p>
        <div className="flex flex-wrap gap-3">
          <Link to={joinCode ? `/join?code=${joinCode}` : '/join'} className="pill pill-primary no-underline">{joinCode ? 'Join again' : 'Join with code'}</Link>
          <Link to="/" className="pill pill-secondary no-underline">Home</Link>
        </div>
      </div>
    </AppShell>
  );
}
