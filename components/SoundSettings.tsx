'use client';
import {SoundPrefs, testCategory, unlockAudio} from '../lib/sounds';

const ROWS = [
  ['messages', 'Message sounds'],
  ['typing', 'Typing sounds'],
  ['images', 'Image sounds'],
  ['timeJumps', 'Time-jump sounds'],
  ['dramatic', 'Dramatic effects'],
] as const;

export default function SoundSettings({
  prefs,
  onChange,
}: {
  prefs: SoundPrefs;
  onChange: (prefs: SoundPrefs) => void;
}) {
  return (
    <section className="sounds">
      <div className="chars-head">
        <b>Sound settings</b>
      </div>
      <label className="sound-row">
        <span>Master sound</span>
        <input type="checkbox" checked={prefs.enabled} onChange={e => { unlockAudio(); onChange({ ...prefs, enabled: e.target.checked }); }}/>
      </label>
      <label className="sound-row">
        <span>Volume {(prefs.volume * 100).toFixed(0)}%</span>
        <input type="range" min="0.05" max="1" step="0.05" value={prefs.volume} onChange={e => onChange({ ...prefs, volume: Number(e.target.value) })}/>
      </label>
      {ROWS.map(([key, label]) => (
        <div key={key} className="sound-row test">
          <label>
            <span>{label}</span>
            <input type="checkbox" checked={prefs[key]} onChange={e => onChange({ ...prefs, [key]: e.target.checked })}/>
          </label>
          <button type="button" className="ghost" onClick={() => testCategory(key, prefs)}>Test sound</button>
        </div>
      ))}
      <p className="sound-note">Sounds stay off until you press Play story. Test buttons unlock audio on this device.</p>
    </section>
  );
}
