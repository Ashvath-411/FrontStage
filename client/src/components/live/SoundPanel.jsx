import { Panel } from './Panel.jsx';
import { Toggle } from '../ui/Toggle.jsx';
import { Slider } from '../ui/Slider.jsx';
import { VoiceCueSettings } from './VoiceCueSettings.jsx';

const percent = (value) => `${Math.round(value * 100)}%`;

function ClickSettings({ prefs, update, onTest }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-pretitle font-extrabold">Click</h3>
      <Toggle label="Click on" checked={prefs.clickOn} onChange={(clickOn) => update({ clickOn })} />
      <Toggle label="Click only in the count-in" checked={prefs.clickOnlyCountIn} onChange={(clickOnlyCountIn) => update({ clickOnlyCountIn })} />
      <Toggle label="Click in the gap between songs" checked={prefs.clickInGap} onChange={(clickInGap) => update({ clickInGap })} />
      <Slider label="Click volume" value={prefs.clickVolume} min={0.05} max={1} step={0.05} format={percent} onChange={(clickVolume) => update({ clickVolume })} />
      <Slider label="Click offset" value={prefs.clickOffsetMs} min={-200} max={200} step={5} format={(value) => `${value > 0 ? '+' : ''}${value} ms`} onChange={(clickOffsetMs) => update({ clickOffsetMs })} />
      <p className="text-label text-muted">Negative plays the click earlier, for slow outputs such as Bluetooth headphones.</p>
      <div><button type="button" className="pill pill-secondary" onClick={onTest}>Test click</button></div>
    </section>
  );
}

export function SoundPanel({ sound, viewPrefs, onViewPrefsChange, joinedInstrument, onClose }) {
  return (
    <Panel title="Sound" onClose={onClose}>
      {!sound.enabled && (
        <div className="flex flex-col gap-2">
          <p className="text-muted">Browsers only play sound after a tap.</p>
          <div><button type="button" className="pill pill-primary" onClick={sound.enable}>Enable sound</button></div>
          {sound.contextState === 'unsupported' && <p className="text-alert">This browser has no Web Audio support.</p>}
        </div>
      )}
      <ClickSettings prefs={sound.prefs} update={sound.updatePrefs} onTest={sound.testClick} />
      <VoiceCueSettings sound={sound} viewPrefs={viewPrefs} onViewPrefsChange={onViewPrefsChange} joinedInstrument={joinedInstrument} />
    </Panel>
  );
}
