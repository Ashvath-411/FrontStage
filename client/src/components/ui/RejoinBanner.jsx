import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgetJoinedSession, recentJoinedSessions } from '../../recentSessions.js';

export function RejoinBanner() {
  const [latest, setLatest] = useState(() => recentJoinedSessions()[0] ?? null);
  if (!latest) return null;

  function forget() {
    forgetJoinedSession(latest.sessionId);
    setLatest(recentJoinedSessions()[0] ?? null);
  }

  return (
    <section aria-label="Rejoin" className="my-4 flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-cyan bg-cyan/10 p-3">
      <p>You are in <span className="font-semibold">{latest.name}</span> <span className="font-chord tracking-widest text-muted">{latest.code}</span></p>
      <div className="flex flex-wrap gap-2">
        <Link to={`/session/${latest.sessionId}`} className="pill pill-primary no-underline">Rejoin {latest.name}</Link>
        <button type="button" className="pill pill-secondary" onClick={forget}>Forget</button>
      </div>
    </section>
  );
}
