import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useConfirm } from '../../hooks/useConfirm.jsx';

function MenuButton({ children, onClick, danger }) {
  return (
    <button type="button" className={`flex min-h-12 w-full cursor-pointer items-center border-b border-line text-left ${danger ? 'text-alert' : 'hover:text-cyan'}`} onClick={onClick}>
      {children}
    </button>
  );
}

function MenuLink({ to, children }) {
  return <Link to={to} className="flex min-h-12 w-full items-center border-b border-line text-text no-underline hover:text-cyan">{children}</Link>;
}

function ConfirmLine({ text, confirmLabel, onConfirm, onCancel }) {
  return (
    <div role="alertdialog" aria-label={text} className="flex flex-col gap-2 border-b border-line py-3">
      <p>{text}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="pill pill-small pill-alert" onClick={onConfirm}>{confirmLabel}</button>
        <button type="button" className="pill pill-small pill-secondary" autoFocus onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export function LiveMenu({ session, signedIn, debugOn, onOpenPanel, onLeave, onEnd, onToggleDebug }) {
  const [confirming, setConfirming] = useState(null);
  const confirm = useConfirm();
  const isHost = session.me.isHost;
  const onlineCount = session.participants.filter((participant) => participant.online).length;
  const ended = session.state.playState === 'ended';
  const otherDevices = Math.max(0, onlineCount - 1);

  return (
    <nav aria-label="Session menu" className="flex flex-col">
      {confirming === 'leave' ? (
        <ConfirmLine text={`Leave ${session.name}? Your seat is given up.`} confirmLabel="Leave" onConfirm={onLeave} onCancel={() => setConfirming(null)} />
      ) : (
        <MenuButton onClick={() => (isHost ? onLeave() : setConfirming('leave'))}>{isHost ? 'Leave (the session keeps running)' : 'Leave session'}</MenuButton>
      )}
      <MenuLink to="/">Home</MenuLink>
      {signedIn && <MenuLink to="/library">Library</MenuLink>}
      <MenuButton onClick={() => onOpenPanel('sound')}>Sound</MenuButton>
      <MenuButton onClick={() => onOpenPanel('view')}>View settings</MenuButton>
      <MenuButton onClick={() => onOpenPanel('info')}>Session info</MenuButton>
      <MenuButton onClick={() => onOpenPanel('band')}>Band ({onlineCount} online)</MenuButton>
      {isHost && !ended && <MenuButton onClick={() => onOpenPanel('session')}>Session settings</MenuButton>}
      <MenuButton onClick={onToggleDebug}>{debugOn ? 'Hide timing details' : 'Show timing details'}</MenuButton>
      {isHost && !ended && (
        <MenuButton
          danger
          onClick={async () => {
            const confirmed = await confirm.ask({
              title: `End ${session.name} for everyone?`,
              text: `${otherDevices} other connected device${otherDevices === 1 ? '' : 's'} will stop playing and show "Session ended". Members cannot rejoin. This cannot be undone.`,
              confirmLabel: 'End session'
            });
            if (confirmed) onEnd();
          }}
        >
          End session
        </MenuButton>
      )}
      {confirm.dialog}
    </nav>
  );
}
