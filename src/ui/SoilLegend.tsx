import { soilBands, soilDepthShown } from '../scene/layout';
import type { Design, Site } from '../sim/types';

const FOUNDATION_NAME = { mat: 'mat', raft: 'raft', piles: 'piles', caissons: 'caissons' } as const;

/** What the ground under the lot is made of — shown over the 3D view. */
export function SoilLegend({ site, design }: { site: Site; design: Design }) {
  const bands = soilBands(site);
  const reach = site.foundation[design.foundation].depth;
  return (
    <section className="soil-legend" aria-label="Ground under the lot">
      <p className="label">Ground under the lot</p>
      <ul>
        {bands.map((b) => (
          <li key={b.name + b.top}>
            <span className="swatch" style={{ background: b.color }} />
            <span>{b.name}</span>
            <span className="muted">
              {Math.round(b.top)}–{Math.round(b.top + b.thickness)} m
            </span>
          </li>
        ))}
      </ul>
      {site.bedrockDepth > soilDepthShown(site) && <p className="muted">Bedrock is {site.bedrockDepth} m down.</p>}
      <p className="muted">
        Your {FOUNDATION_NAME[design.foundation]} {design.foundation === 'piles' || design.foundation === 'caissons' ? 'reach' : 'reaches'} {reach} m down.
      </p>
    </section>
  );
}
