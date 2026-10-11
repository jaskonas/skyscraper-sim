import { PARAM_GROUPS, visibleParams } from '../../sim/catalog/parameters';
import { useCurrent } from '../../state/hooks';
import { useGame } from '../../state/store';
import { AmenitiesControl } from './AmenitiesControl';
import { OrnamentsControl } from './OrnamentsControl';
import { ParamControl } from './ParamControl';
import { UseMixControl } from './UseMixControl';

export function ControlGroups() {
  const { design } = useCurrent();
  const level = useGame((s) => s.detailLevel);
  const params = visibleParams(level, design);
  return (
    <section aria-label="Design controls">
      {PARAM_GROUPS.map((g) => (
        <details key={g.id} className="card group" open={g.id === 'form'}>
          <summary>{g.label}</summary>
          {params
            .filter((p) => p.group === g.id)
            .map((p) => (
              <ParamControl key={p.id} def={p} />
            ))}
          {g.id === 'details' && <OrnamentsControl />}
        </details>
      ))}
      <details className="card group">
        <summary>Uses</summary>
        <UseMixControl />
      </details>
      <details className="card group">
        <summary>Amenities</summary>
        <AmenitiesControl />
      </details>
    </section>
  );
}
