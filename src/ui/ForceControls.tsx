import { useMemo } from 'react';
import { quakeReadout, windReadout, type Readout } from '../sim/forces/readout';
import type { CheckStatus } from '../sim/types';
import { useCurrent } from '../state/hooks';
import { useGame } from '../state/store';

const ICON: Record<CheckStatus, string> = { pass: '✅', marginal: '⚠️', fail: '❌' };

/** The force showing right now, or none while the tower is being built. */
function useShownForce() {
  const force = useGame((s) => s.force);
  const building = useGame((s) => s.phase === 'building');
  return building ? 'none' : force;
}

function useReadout(): Readout | null {
  const force = useShownForce();
  const { site, design, analysis } = useCurrent();
  return useMemo(() => {
    if (force === 'wind') return windReadout(site, design, analysis);
    if (force === 'quake') return quakeReadout(site, design, analysis);
    return null;
  }, [force, site, design, analysis]);
}

/** 💨 Wind and 〰️ Earthquake: show one force acting on the tower, or neither. Hidden while building. */
export function ForceButtons() {
  const force = useGame((s) => s.force);
  const building = useGame((s) => s.phase === 'building');
  const toggleForce = useGame((s) => s.toggleForce);
  if (building) return null;
  return (
    <div className="force-buttons">
      <button aria-pressed={force === 'wind'} onClick={() => toggleForce('wind')}>
        💨 Wind
      </button>
      <button aria-pressed={force === 'quake'} onClick={() => toggleForce('quake')}>
        〰️ Earthquake
      </button>
    </div>
  );
}

/** The card explaining the force on screen, with this tower's numbers. */
export function ForceReadout() {
  const r = useReadout();
  if (!r) return null;
  return (
    <section className="force-readout" aria-label={r.title}>
      <p className="label">{r.title}</p>
      <ul>
        {r.lines.map((l) => (
          <li key={l.text} className={l.status}>
            {l.text}
            {l.status && ` ${ICON[l.status]}`}
          </li>
        ))}
      </ul>
      <p className="muted">{r.note}</p>
    </section>
  );
}

/** A warning across the top of the 3D view when the tower would fail under this force. */
export function ForceBanner() {
  const r = useReadout();
  if (!r?.banner) return null;
  return (
    <div className="force-banner" role="alert">
      {r.banner}
    </div>
  );
}
