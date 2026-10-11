import { useState } from 'react';
import { CROWN_FAMILIES, CROWNS } from '../../sim/catalog/crowns';
import { CROWN_IDS } from '../../sim/catalog/ids';
import { paramMax, type EnumParam, type ParamDef } from '../../sim/catalog/parameters';
import { STYLE_PRESETS, type StyleSettings } from '../../sim/catalog/styles';
import type { CrownId, Design, SpandrelId, WindowPatternId } from '../../sim/types';
import { useCurrent } from '../../state/hooks';
import { useGame } from '../../state/store';
import { CrownIcon, TileIcon } from './icons';
import { OptionGallery, type GallerySection } from './OptionGallery';

/** Crowns are shown by family; other galleries are one section. */
function gallerySections(def: EnumParam): GallerySection[] {
  if (def.id === 'crown') {
    return CROWN_FAMILIES.map((f) => ({ label: f.label, values: CROWN_IDS.filter((id) => CROWNS[id].family === f.id) }));
  }
  return [{ label: null, values: def.options.map((o) => o.value) }];
}

function galleryIcon(id: ParamDef['id'], value: string, design: Design) {
  if (id === 'crown') return <CrownIcon crown={value as CrownId} palette={design.palette} />;
  if (id === 'windowPattern') return <TileIcon design={{ ...design, windowPattern: value as WindowPatternId }} />;
  if (id === 'spandrel') return <TileIcon design={{ ...design, spandrel: value as SpandrelId }} />;
  return null;
}

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
  const endCoalesce = useGame((s) => s.endCoalesce);
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
        onPointerUp={endCoalesce}
        onKeyUp={endCoalesce}
        onBlur={endCoalesce}
      />
    );
  } else if (def.kind === 'enum' && def.widget === 'gallery') {
    input = null;
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
      {def.kind === 'enum' && def.widget === 'gallery' && (
        <>
          {selectedOption && <p className="gallery-selected">{selectedOption.label}</p>}
          <OptionGallery
            def={def}
            value={value as string}
            sections={gallerySections(def)}
            icon={(v) => galleryIcon(def.id, v, design)}
            defaultValue={STYLE_PRESETS[design.style].settings[def.id as keyof StyleSettings] as string | undefined}
            onPick={(v) => set(v)}
          />
        </>
      )}
    </div>
  );
}
