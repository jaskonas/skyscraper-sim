import { useShares } from '../../sim/analysis/massing';
import { USE_ORDER, type UseType } from '../../sim/types';
import { useCurrent } from '../../state/hooks';
import { useGame } from '../../state/store';

const USE_LABEL: Record<UseType, string> = { retail: 'Shops', office: 'Offices', hotel: 'Hotel', residential: 'Homes' };

export function UseMixControl() {
  const { design } = useCurrent();
  const dispatch = useGame((s) => s.dispatch);
  const shares = useShares(design);
  return (
    <div>
      <p className="help">Uses stack bottom to top: shops, offices, hotel, homes.</p>
      {USE_ORDER.map((u) => (
        <div key={u} className="control-row">
          <span>{USE_LABEL[u]}</span>
          <input
            type="range"
            aria-label={`${USE_LABEL[u]} share`}
            min={0}
            max={100}
            step={5}
            value={design.useMix[u]}
            onChange={(e) => dispatch([{ type: 'set_use_mix', mix: { [u]: Number(e.target.value) } }], { coalesceKey: `use-${u}` })}
          />
          <span className="value">{Math.round(shares[u] * 100)}%</span>
        </div>
      ))}
    </div>
  );
}
