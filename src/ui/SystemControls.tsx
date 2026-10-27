import { useMemo } from 'react';
import { SYSTEM_LABEL, SYSTEM_TEXT } from '../sim/catalog/systems';
import { SYSTEM_IDS } from '../sim/systems/facts';
import { systemReadout } from '../sim/systems/readout';
import { useCurrent } from '../state/hooks';
import { useGame } from '../state/store';

/** The system showing right now, or none while the tower is being built. */
export function useShownSystem() {
  const system = useGame((s) => s.system);
  const building = useGame((s) => s.phase === 'building');
  return building ? 'none' : system;
}

/** ⚡ 💧 🚽 🛗 🌬️: show one building system flowing through the tower, or none. Hidden while building. */
export function SystemButtons() {
  const system = useGame((s) => s.system);
  const building = useGame((s) => s.phase === 'building');
  const toggleSystem = useGame((s) => s.toggleSystem);
  if (building) return null;
  return (
    <div className="system-buttons" role="group" aria-label="Inside the tower">
      {SYSTEM_IDS.map((id) => (
        <button key={id} aria-pressed={system === id} onClick={() => toggleSystem(id)}>
          <span aria-hidden="true">{SYSTEM_LABEL[id].icon} </span>
          {SYSTEM_LABEL[id].label}
        </button>
      ))}
    </div>
  );
}

/** The card explaining the system on screen, in this tower's numbers. */
export function SystemReadout() {
  const system = useShownSystem();
  const { site, design, analysis } = useCurrent();
  const powerCut = useGame((s) => s.powerCut);
  const setPowerCut = useGame((s) => s.setPowerCut);
  const r = useMemo(() => (system === 'none' ? null : systemReadout(site, design, analysis, system, { powerCut })), [system, site, design, analysis, powerCut]);
  if (!r) return null;
  return (
    <section className="force-readout system-readout" aria-label={r.title}>
      <p className="label">{r.title}</p>
      <ul>
        {r.lines.map((l) => (
          <li key={l.text}>{l.text}</li>
        ))}
      </ul>
      {system === 'power' && (
        <button aria-pressed={powerCut} onClick={() => setPowerCut(!powerCut)}>
          <span aria-hidden="true">🔌 </span>
          {powerCut ? SYSTEM_TEXT.power.endCutButton : SYSTEM_TEXT.power.cutButton}
        </button>
      )}
      <p className="muted">{r.note}</p>
    </section>
  );
}
