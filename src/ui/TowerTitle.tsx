import { useEffect, useState } from 'react';
import { useCurrent } from '../state/hooks';

/** How long the full card stays before it shrinks to a name tag, so the top of the tower can be seen. */
const FULL_MS = 5000;
import { useGame } from '../state/store';

/** The ribbon-cutting card over the 3D view: the finished tower's name, height, floors and city. */
export function TowerTitle() {
  const phase = useGame((s) => s.phase);
  const name = useGame((s) => s.project?.towerName ?? null);
  if (phase !== 'complete' || !name) return null;
  return <TowerTitleCard name={name} />;
}

function TowerTitleCard({ name }: { name: string }) {
  const { site, design, analysis } = useCurrent();
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setCompact(true), FULL_MS);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className={compact ? 'tower-title compact' : 'tower-title'} role="status">
      <p className="tower-title-name">🎉 {name}</p>
      {!compact && (
        <p className="tower-title-facts">
          {Math.round(analysis.tipHeightM)} m · {design.floors} floors · {site.city}
        </p>
      )}
    </div>
  );
}
