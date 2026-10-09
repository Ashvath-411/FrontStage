import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useSession } from '../hooks/useSession.js';
import { useClockSync } from '../hooks/useClockSync.js';
import { usePlayhead } from '../hooks/usePlayhead.js';
import { useViewPrefs } from '../hooks/useViewPrefs.js';
import { useControls } from '../hooks/useControls.js';
import { useSound } from '../hooks/useSound.js';
import { useJoinedSessionMemory } from '../hooks/useJoinedSessionMemory.js';
import { useLiveNavigation } from '../hooks/useLiveNavigation.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { useAuth } from '../authContext.jsx';
import { callerCanControl, findMe } from '../sessionRoles.js';
import { SessionMessage } from '../components/live/SessionMessage.jsx';
import { LiveTopBar } from '../components/live/LiveTopBar.jsx';
import { LiveView } from '../components/live/LiveView.jsx';
import { ControlBar } from '../components/live/ControlBar.jsx';
import { DebugStrip } from '../components/live/DebugStrip.jsx';
import { LivePanels } from '../components/live/LivePanels.jsx';
import { PanelBackdrop } from '../components/live/Panel.jsx';
import { SoundStrip } from '../components/live/SoundStrip.jsx';
import { BackgroundNotice } from '../components/live/BackgroundNotice.jsx';
import { SessionLobby } from '../components/live/SessionLobby.jsx';
import { ErrorState, LoadingRows } from '../components/ui/LoadState.jsx';
import { DockedToasts } from '../toastContext.jsx';
import { recentJoinedSessions } from '../recentSessions.js';

function problemMessage(error, kicked) {
  if (kicked) return { title: 'You were removed', text: 'The host removed you from this session. If that was a mistake, ask the host and join again with the code.' };
  if (error?.status === 404) return { title: 'Session not found', text: 'This session does not exist. Check the code with the host.' };
  if (error?.status === 401 || error?.status === 403) return { title: 'Not in this session', text: 'Join with the code from the host to see this session.' };
  return null;
}

export function LivePage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const auth = useAuth();
  const live = useSession(id);
  const clock = useClockSync();
  const [prefs, updatePrefs] = useViewPrefs();
  const { position, timelines } = usePlayhead(live.session, clock.offsetMs);
  const controls = useControls(live);
  const instrument = prefs.instrument || (live.session && findMe(live.session)?.instrument) || '';
  const sound = useSound({ session: live.session, timelines, clockOffsetMs: clock.offsetMs, instrument });
  const [panel, setPanel] = useState(null);
  const [knownCode] = useState(() => recentJoinedSessions().find((entry) => entry.sessionId === id)?.code ?? '');
  const [debugOn, setDebugOn] = useState(searchParams.get('debug') === '1');
  const problem = problemMessage(live.error, live.kicked);
  useJoinedSessionMemory(id, live.session, Boolean(problem));
  const liveNavigation = useLiveNavigation(id, live.session);
  usePageTitle(live.session ? `${live.session.name} (live)` : 'Session');

  if (problem) return <SessionMessage {...problem} joinCode={knownCode} />;
  if (live.error && !live.session) return <div className="page-pad py-10"><ErrorState message={live.error.message} onRetry={live.refetch} /></div>;
  if (!live.session || !position) return <div className="page-pad py-10"><LoadingRows label="Loading session" rows={5} /></div>;
  const { session } = live;
  if (session.snapshot.length === 0) {
    return <SessionMessage title="No songs in this session" text="The setlist was empty when the session was made. Add songs to the setlist and create a new session." />;
  }
  const canControl = callerCanControl(session) && session.state.playState !== 'ended';
  const closePanel = () => setPanel(null);
  const inLobby = session.state.playState === 'idle';

  return (
    <div className="page-pad flex h-dvh flex-col overflow-hidden">
      <LiveTopBar session={session} connected={live.connected} onBack={liveNavigation.back} onOpenPanel={setPanel} />
      <SoundStrip sound={sound} />
      <div className="flex min-h-0 flex-1 flex-col min-[900px]:flex-row min-[900px]:gap-4">
        <main className="relative flex min-h-[10rem] flex-1 flex-col pt-3">
          {sound.backgroundNotice && <BackgroundNotice onDismiss={sound.dismissBackgroundNotice} />}
          {inLobby
            ? <SessionLobby session={session} canControl={canControl} busy={controls.busy} message={controls.message} onStart={() => controls.send('start')} />
            : <LiveView session={session} position={position} timelines={timelines} prefs={prefs} instrument={instrument} compact={Boolean(panel)} />}
          {panel && <PanelBackdrop onClose={closePanel} />}
        </main>
        <LivePanels
          panel={panel}
          session={session}
          prefs={prefs}
          updatePrefs={updatePrefs}
          sound={sound}
          signedIn={Boolean(auth.user)}
          debugOn={debugOn}
          onToggleDebug={() => setDebugOn(!debugOn)}
          onOpenPanel={setPanel}
          onClose={closePanel}
          onLeave={liveNavigation.leave}
          onEnd={() => {
            controls.send('end');
            closePanel();
          }}
        />
      </div>
      <DockedToasts />
      {debugOn && <DebugStrip clock={clock} session={session} position={position} connected={live.connected} audio={sound.audioDebug()} onHide={() => setDebugOn(false)} />}
      {canControl && !inLobby && (
        <footer className="relative z-30 shrink-0 border-t border-line bg-bg py-3">
          <ControlBar session={session} position={position} timelines={timelines} controls={controls} />
          {controls.message && <p className="text-label mt-2 text-center text-muted" role="status">{controls.message}</p>}
        </footer>
      )}
    </div>
  );
}
