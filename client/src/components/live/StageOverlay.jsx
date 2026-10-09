import { CountIn } from './CountIn.jsx';
import { GapCountdown } from './GapCountdown.jsx';
import { secondsLeft } from '../../liveDisplay.js';

function Message({ title, text }) {
  return (
    <div className="flex max-w-lg flex-col items-center gap-3 text-center" role="status">
      <span className="font-accent text-3xl font-extrabold sm:text-4xl">{title}</span>
      {text && <span className="text-lg text-muted">{text}</span>}
    </div>
  );
}

function overlayContent({ session, position, timelines }) {
  const { playState } = session.state;
  const timeline = timelines[position.itemIdx];
  if (playState === 'ended') return <Message title="Session ended" text="Thanks for playing. The host has closed this session." />;
  if (playState === 'idle') return <Message title="Waiting for the start" text={`Share code ${session.code}. The first song starts when a controller presses Start.`} />;
  if (playState === 'paused') return null;
  if (position.phase === 'starting') return <Message title="Get ready" text={`Starting in ${secondsLeft(position.msToPhaseEnd)} s`} />;
  if (position.phase === 'countin') return <CountIn beat={position.beatInBar} beats={timeline.openingBeats} />;
  if (position.phase === 'gap') {
    return <GapCountdown nextItem={session.snapshot[position.itemIdx + 1]} nextTimeline={timelines[position.itemIdx + 1]} position={position} />;
  }
  if (position.phase === 'waiting') return <Message title="Waiting for the next song" text="A controller starts it with Play next." />;
  if (position.phase === 'finished') return <Message title="Set finished" text="That was the last song." />;
  return null;
}

export function StageOverlay(props) {
  const content = overlayContent(props);
  if (!content) return null;
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-bg p-4">
      {content}
    </div>
  );
}
