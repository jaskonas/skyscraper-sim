import { ORNAMENT_GROUPS, ORNAMENTS } from '../../sim/catalog/facades';
import { ORNAMENT_IDS } from '../../sim/catalog/ids';
import { STYLE_PRESETS } from '../../sim/catalog/styles';
import { useCurrent } from '../../state/hooks';
import { useGame } from '../../state/store';
import { OrnamentIcon } from './icons';

/** Pick any number of ornaments, grouped by where they go on the tower. */
export function OrnamentsControl() {
  const { design } = useCurrent();
  const dispatch = useGame((s) => s.dispatch);
  const styleDefaults = STYLE_PRESETS[design.style].settings.ornaments;
  return (
    <div className="gallery" role="group" aria-label="Ornaments">
      <div className="control-row">
        <span>Ornaments</span>
      </div>
      {ORNAMENT_GROUPS.map((g) => {
        const ids = ORNAMENT_IDS.filter((id) => ORNAMENTS[id].group === g.id);
        return (
          <div key={g.id} className="gallery-section">
            <div className="label">{g.label}</div>
            <div className="gallery-grid">
              {ids.map((id) => {
                const o = ORNAMENTS[id];
                const on = design.ornaments.includes(id);
                const isDefault = styleDefaults.includes(id);
                const off = on && design.ornament === 'none' && o.decorative;
                return (
                  <button
                    key={id}
                    className={`gallery-item${off ? ' dimmed' : ''}`}
                    aria-pressed={on}
                    aria-label={`${o.label}${isDefault ? ' (style default)' : ''}`}
                    title={`${o.label}${isDefault ? ' ★ style default' : ''}\nSeen on ${o.seenOn}. ${o.blurb}${off ? '\nHidden while Ornament amount is None.' : ''}`}
                    onClick={() => dispatch([on ? { type: 'remove_ornament', id } : { type: 'add_ornament', id }])}
                  >
                    <OrnamentIcon id={id} palette={design.palette} />
                    <span className="gallery-caption">
                      {isDefault && <span className="star">★ </span>}
                      {o.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
