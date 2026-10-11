import { Panel } from './Panel.jsx';
import { LiveMenu } from './LiveMenu.jsx';
import { SoundPanel } from './SoundPanel.jsx';
import { ViewPrefsForm } from './ViewPrefsForm.jsx';
import { SessionSettingsForm } from './SessionSettingsForm.jsx';
import { SessionInfo } from './SessionInfo.jsx';
import { ParticipantsPanel } from './ParticipantsPanel.jsx';
import { findMe } from '../../sessionRoles.js';

const panelTitles = { menu: 'Menu', view: 'View settings', session: 'Session settings', info: 'Session info', band: 'Band' };

export function LivePanels({ panel, session, prefs, updatePrefs, sound, signedIn, debugOn, onToggleDebug, onOpenPanel, onClose, onLeave, onEnd }) {
  if (!panel) return null;
  const joinedInstrument = findMe(session)?.instrument ?? '';
  if (panel === 'sound') {
    return <SoundPanel sound={sound} viewPrefs={prefs} onViewPrefsChange={updatePrefs} joinedInstrument={joinedInstrument} onClose={onClose} />;
  }
  return (
    <Panel title={panelTitles[panel]} onClose={onClose}>
      {panel === 'menu' && (
        <LiveMenu
          session={session}
          signedIn={signedIn}
          debugOn={debugOn}
          onOpenPanel={onOpenPanel}
          onLeave={onLeave}
          onEnd={onEnd}
          onToggleDebug={() => {
            onToggleDebug();
            onClose();
          }}
        />
      )}
      {panel === 'view' && <ViewPrefsForm prefs={prefs} onChange={updatePrefs} joinedInstrument={joinedInstrument} />}
      {panel === 'session' && <SessionSettingsForm session={session} />}
      {panel === 'info' && <SessionInfo session={session} />}
      {panel === 'band' && <ParticipantsPanel session={session} />}
    </Panel>
  );
}
