import { AMENITIES, AMENITY_IDS } from '../../sim/catalog/amenities';
import { useCurrent } from '../../state/hooks';
import { useGame } from '../../state/store';

export function AmenitiesControl() {
  const { design } = useCurrent();
  const dispatch = useGame((s) => s.dispatch);
  return (
    <div>
      {AMENITY_IDS.map((id) => {
        const on = design.amenities.includes(id);
        return (
          <label key={id} className="amenity" title={AMENITIES[id].explain}>
            <input
              type="checkbox"
              checked={on}
              onChange={() => dispatch([{ type: on ? 'remove_amenity' : 'add_amenity', id }])}
            />
            <span>
              <strong>{AMENITIES[id].label}</strong> — {AMENITIES[id].explain}
            </span>
          </label>
        );
      })}
    </div>
  );
}
