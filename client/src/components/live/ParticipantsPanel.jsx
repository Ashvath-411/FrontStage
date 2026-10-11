import { api } from '../../api.js';
import { useConfirm } from '../../hooks/useConfirm.jsx';

function OnlineDot({ online }) {
  const look = online ? 'bg-cyan' : 'border border-muted';
  return <span aria-label={online ? 'online' : 'offline'} className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${look}`} />;
}

function ParticipantRow({ session, participant, confirm }) {
  const showHostTools = session.me.isHost && !participant.isHost;
  const update = (fields) => api.updateParticipant(session.id, participant.pid, fields);
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3">
      <span className="flex items-center gap-3">
        <OnlineDot online={participant.online} />
        <span className="font-semibold">{participant.displayName}</span>
        <span className="text-label text-muted">{participant.isHost ? 'host' : participant.instrument}</span>
        {participant.isController && !participant.isHost && <span className="text-label text-purple-text">controller</span>}
      </span>
      {showHostTools && (
        <span className="flex gap-2">
          {session.controllerPolicy === 'selected' && (
            <button type="button" className="pill pill-small" onClick={() => update({ isController: !participant.isController })}>
              {participant.isController ? 'Remove control' : 'Make controller'}
            </button>
          )}
          <button type="button" className="pill pill-small pill-danger" onClick={async () => {
            const confirmed = await confirm.ask({
              title: `Remove ${participant.displayName}?`,
              text: 'Their screen shows "You were removed" and they lose their seat. They can join again with the code unless you lock the session.',
              confirmLabel: 'Remove'
            });
            if (confirmed) update({ kicked: true });
          }}>Remove</button>
        </span>
      )}
    </li>
  );
}

export function ParticipantsPanel({ session }) {
  const confirm = useConfirm();
  return (
    <section aria-label="Participants">
      {confirm.dialog}
      <h2 className="text-pretitle mb-2 font-extrabold">
        Band <span className="tabular text-muted">{session.participants.length} / {session.maxParticipants}</span>
      </h2>
      <ul>
        {session.participants.map((participant) => (
          <ParticipantRow key={participant.pid} session={session} participant={participant} confirm={confirm} />
        ))}
      </ul>
    </section>
  );
}
