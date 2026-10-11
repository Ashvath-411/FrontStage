import { copyText, shareLink } from './SessionInfo.jsx';
import { keyLabel } from '../../liveDisplay.js';
import { useToast } from '../../toastContext.jsx';

function JoinedList({ participants }) {
  return (
    <section aria-label="Who has joined" className="flex flex-col gap-2">
      <h2 className="text-pretitle font-extrabold">Who has joined <span className="tabular text-muted">{participants.length}</span></h2>
      {participants.length === 1 && <p className="text-muted">Nobody else yet. Members appear here as soon as they join with the code.</p>}
      <ul className="flex flex-wrap gap-2">
        {participants.map((participant) => (
          <li key={participant.pid} className="flex min-h-12 items-center gap-2 rounded-pill border border-line px-4">
            <span aria-label={participant.online ? 'online' : 'offline'} className={`inline-block h-2.5 w-2.5 rounded-full ${participant.online ? 'bg-cyan' : 'border border-muted'}`} />
            <span className="font-semibold">{participant.displayName}</span>
            <span className="text-label text-muted">{participant.isHost ? 'host' : participant.instrument}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SessionLobby({ session, canControl, busy, message, onStart }) {
  const showToast = useToast();
  const firstSong = session.snapshot[0];
  const host = session.participants.find((participant) => participant.isHost);

  async function copyLink() {
    if (await copyText(shareLink(session.code))) showToast('Link copied');
    else showToast('Copy did not work here. Read the code out instead.', 'error');
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pb-4">
      <section aria-label="Join code" className="flex flex-col items-start gap-3">
        <p className="text-label text-muted uppercase">Join at {window.location.host}/join with code</p>
        <p className="font-chord text-6xl leading-none font-semibold tracking-[0.25em] sm:text-8xl">{session.code}</p>
        <button type="button" className="pill pill-secondary" onClick={copyLink}>Copy link</button>
      </section>
      <JoinedList participants={session.participants} />
      <section className="flex flex-col gap-3 border-t border-line pt-4">
        <p className="text-muted">
          First song: <span className="text-text">{firstSong.title}</span> · key {keyLabel(firstSong)} · {firstSong.bpm} BPM · {session.snapshot.length} song{session.snapshot.length === 1 ? '' : 's'} in the set
        </p>
        {canControl
          ? <div><button type="button" className="pill pill-primary" disabled={busy} onClick={onStart}>Start</button></div>
          : <p className="text-muted" role="status">Waiting for {host?.displayName ?? 'the host'} to start.</p>}
        {message && <p className="text-label text-muted" role="status">{message}</p>}
      </section>
    </div>
  );
}
