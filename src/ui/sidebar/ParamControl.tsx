import { useState } from 'react';
import { paramMax, type ParamDef } from '../../sim/catalog/parameters';
import { useCurrent } from '../../state/hooks';
import { useGame } from '../../state/store';

export function formatParamValue(def: ParamDef, value: unknown): string {
  if (def.kind === 'number' && typeof value === 'number') {
    return def.percent ? `${Math.round(value * 100)}%` : `${value} ${def.unit}`;
  }
  if (def.kind === 'boolean') return value ? 'On' : 'Off';
  if (def.kind === 'enum') return def.options.find((o) => o.value === value)?.label ?? String(value);
  return String(value);
}

export function ParamControl({ def }: { def: ParamDef }) {
  const { site, design } = useCurrent();
  const dispatch = useGame((s) => s.dispatch);
  const [showHelp, setShowHelp] = useState(false);
  const value = design[def.id];
  const set = (v: number | string | boolean, coalesce = false) =>
    dispatch([{ type: 'set_parameter', id: def.id, value: v }], coalesce ? { coalesceKey: def.id } : undefined);

  let input: React.ReactNode;
  if (def.kind === 'number') {
    input = (
      <input
        type="range"
        aria-label={def.label}
        min={def.min}
        max={paramMax(def, site, design)}
        step={def.step}
        value={value as number}
        onChange={(e) => set(Number(e.target.value), true)}
      />
    );
  } else if (def.kind === 'enum') {
    input = (
      <select aria-label={def.label} value={value as string} onChange={(e) => set(e.target.value)}>
        {def.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  } else {
    input = <input type="checkbox" aria-label={def.label} checked={value as boolean} onChange={(e) => set(e.target.checked)} />;
  }

  const selectedOption = def.kind === 'enum' ? def.options.find((o) => o.value === value) : undefined;
  return (
    <div className="param">
      <div className="control-row">
        <span>
          {def.label}
          <button className="info" aria-label={`About ${def.label}`} aria-expanded={showHelp} onClick={() => setShowHelp(!showHelp)}>
            ⓘ
          </button>
        </span>
        {input}
        {def.kind === 'number' && <span className="value">{formatParamValue(def, value)}</span>}
      </div>
      {showHelp && (
        <p className="help">
          {def.explain}
          {selectedOption ? ` ${selectedOption.label}: ${selectedOption.explain}` : ''}
        </p>
      )}
    </div>
  );
}
