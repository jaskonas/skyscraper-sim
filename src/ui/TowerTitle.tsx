import { useCurrent } from '../state/hooks';
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
  return (
    <div className="tower-title" role="status">
      <p className="tower-title-name">🎉 {name}</p>
      <p className="tower-title-facts">
        {Math.round(analysis.tipHeightM)} m · {design.floors} floors · {site.city}
      </p>
    </div>
  );
}
