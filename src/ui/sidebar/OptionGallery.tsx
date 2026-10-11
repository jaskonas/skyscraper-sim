import { useId, useState, type ReactNode } from 'react';

/**
 * Shows an option's full description while it is hovered or keyboard-focused, and gives each button
 * an accessible description so screen readers hear it too.
 */
export function useGalleryDetail() {
  const prefix = useId();
  const [detail, setDetail] = useState<string | null>(null);
  const describe = (key: string, text: string) => ({
    'aria-describedby': `${prefix}-${key}`,
    onFocus: () => setDetail(text),
    onMouseEnter: () => setDetail(text),
    onBlur: () => setDetail(null),
    onMouseLeave: () => setDetail(null),
    description: (
      <span id={`${prefix}-${key}`} className="sr-only">
        {text}
      </span>
    ),
  });
  const panel = (
    <p className="gallery-detail" role="status">
      {detail ?? '\u00a0'}
    </p>
  );
  return { describe, panel };
}
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
  const { describe, panel } = useGalleryDetail();
  return (
    <div className="gallery" role="group" aria-label={def.label}>
      {sections.map((section) => (
        <div key={section.label ?? 'all'} className="gallery-section">
          {section.label && <div className="label">{section.label}</div>}
          <div className="gallery-grid">
            {section.values.map((v) => {
              const o = byValue.get(v)!;
              const isDefault = v === defaultValue;
              const { description, ...detailProps } = describe(v, `${o.label}${isDefault ? ' (★ style default)' : ''}: ${o.explain}`);
              return (
                <button
                  key={v}
                  className="gallery-item"
                  aria-pressed={v === value}
                  aria-label={`${o.label}${isDefault ? ' (style default)' : ''}`}
                  {...detailProps}
                  onClick={() => onPick(v)}
                >
                  {description}
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
      {panel}
    </div>
  );
}
