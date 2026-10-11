import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../authContext.jsx';
import { AppShell } from '../components/ui/AppShell.jsx';
import { useLoad } from '../hooks/useLoad.js';
import { ErrorState, LoadingRows } from '../components/ui/LoadState.jsx';
import { forgetJoinedSession, recentJoinedSessions } from '../recentSessions.js';

const playStateLabels = { idle: 'Not started', playing: 'Playing', paused: 'Paused', ended: 'Ended' };

function SessionRow({ title, detail, children }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3">
      <span className="flex flex-col">
        <span className="font-semibold">{title}</span>
        <span className="text-label text-muted">{detail}</span>
      </span>
      <span className="flex flex-wrap gap-2">{children}</span>
    </li>
  );
}

function HostedSessions() {
  const { data: sessions, error, loading, retry } = useLoad(api.listMySessions);
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-pretitle font-extrabold">Sessions you host</h2>
      {loading && <LoadingRows label="Loading your sessions" rows={2} />}
      {error && <ErrorState message={error} onRetry={retry} />}
      {sessions?.length === 0 && <p className="text-muted">Sessions you start will be listed here until you end them. Press New session to start one from a setlist.</p>}
      <ul>
        {sessions?.map((session) => (
          <SessionRow key={session.id} title={session.name} detail={`${session.code} · ${playStateLabels[session.playState] ?? session.playState} · ${session.memberCount} joined`}>
            <Link to={`/session/${session.id}`} className="pill pill-small pill-secondary no-underline">Open</Link>
          </SessionRow>
        ))}
      </ul>
    </section>
  );
}

function JoinedSessions() {
  const [joined, setJoined] = useState(() => recentJoinedSessions());
  function forget(sessionId) {
    forgetJoinedSession(sessionId);
    setJoined(recentJoinedSessions());
  }
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-pretitle font-extrabold">Sessions you joined</h2>
      {joined.length === 0 && <p className="text-muted">Sessions you join with a code stay here for 24 hours on this device, so you can rejoin after a reload.</p>}
      <ul>
        {joined.map((entry) => (
          <SessionRow key={entry.sessionId} title={entry.name} detail={`${entry.code} · joined ${new Date(entry.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}>
            <Link to={`/session/${entry.sessionId}`} className="pill pill-small pill-secondary no-underline">Rejoin</Link>
            <button type="button" className="pill pill-small pill-secondary" onClick={() => forget(entry.sessionId)}>Forget</button>
          </SessionRow>
        ))}
      </ul>
    </section>
  );
}

export function SessionsPage() {
  const auth = useAuth();
  const actions = (
    <>
      <Link to="/join" className="pill pill-secondary no-underline">Join with code</Link>
      {auth.user && <Link to="/session/new" className="pill pill-primary no-underline">New session</Link>}
    </>
  );
  return (
    <AppShell title="Your sessions" actions={actions}>
      <div className="grid max-w-5xl gap-10 lg:grid-cols-2">
        {auth.user && <HostedSessions />}
        <JoinedSessions />
      </div>
    </AppShell>
  );
}
