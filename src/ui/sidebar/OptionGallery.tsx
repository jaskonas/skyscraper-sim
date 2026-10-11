import type { ReactNode } from 'react';
import type { EnumParam } from '../../sim/catalog/parameters';

export interface GallerySection {
  label: string | null;
  values: string[];
}

/** A grid of picture buttons for an enum control, optionally in labelled sections. */
export function OptionGallery({
  def,
  value,
  sections,
  icon,
  defaultValue,
  onPick,
}: {
  def: EnumParam;
  value: string;
  sections: GallerySection[];
  icon: (value: string) => ReactNode;
  /** The current style's own choice — marked with a star. */
  defaultValue?: string;
  onPick: (value: string) => void;
}) {
  const byValue = new Map(def.options.map((o) => [o.value, o]));
  return (
    <div className="gallery" role="group" aria-label={def.label}>
      {sections.map((section) => (
        <div key={section.label ?? 'all'} className="gallery-section">
          {section.label && <div className="label">{section.label}</div>}
          <div className="gallery-grid">
            {section.values.map((v) => {
              const o = byValue.get(v)!;
              const isDefault = v === defaultValue;
              return (
                <button
                  key={v}
                  className="gallery-item"
                  aria-pressed={v === value}
                  aria-label={`${o.label}${isDefault ? ' (style default)' : ''}`}
                  title={`${o.label}${isDefault ? ' ★ style default' : ''}\n${o.explain}`}
                  onClick={() => onPick(v)}
                >
                  {icon(v)}
                  <span className="gallery-caption">
                    {isDefault && <span className="star">★ </span>}
                    {o.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
