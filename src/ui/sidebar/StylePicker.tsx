import { STYLE_IDS, STYLE_PRESETS } from '../../sim/catalog/styles';
import { isStyleModified } from '../../sim/design';
import type { StyleId } from '../../sim/types';
import { useCurrent } from '../../state/hooks';
import { useGame } from '../../state/store';

export function StylePicker() {
  const { design, site } = useCurrent();
  const dispatch = useGame((s) => s.dispatch);
  const preset = STYLE_PRESETS[design.style];
  const modified = isStyleModified(design);
  return (
    <section className="card" aria-label="Architectural style">
      <label className="control-row">
        <span>Style</span>
        <select
          aria-label="Style"
          value={design.style}
          onChange={(e) => dispatch([{ type: 'apply_style_preset', style: e.target.value as StyleId }])}
        >
          {STYLE_IDS.map((id) => (
            <option key={id} value={id}>
              {STYLE_PRESETS[id].name}
            </option>
          ))}
        </select>
      </label>
      <p className="style-badge">
        {preset.name}
        {modified ? ' (modified)' : ''} · {preset.era}
      </p>
      <details>
        <summary>About this style</summary>
        <p>{preset.summary}</p>
        <p>
          <em>Why it looks this way:</em> {preset.why}
        </p>
        <ul>
          {preset.examples.map((ex) => (
            <li key={ex.name} className={ex.city === site.city ? 'local-example' : undefined}>
              {ex.name}, {ex.city}
              {ex.city === site.city ? ' — look it up, it is in this city!' : ''}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
