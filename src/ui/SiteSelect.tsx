import { briefsForSite } from '../sim/briefs';
import { SITES, SITE_IDS } from '../sim/sites';
import { useGame } from '../state/store';
import { LAND_PATH } from './worldLand';

const MAP_W = 720;
const MAP_H = 300;
/** Equirectangular projection, cropped to latitudes 70°N–50°S. */
function project(lat: number, lon: number): { x: number; y: number } {
  return { x: ((lon + 180) / 360) * MAP_W, y: ((70 - lat) / 120) * MAP_H };
}

/** Sites whose map label goes on the left of the pin, so neighbouring cities' labels don't overlap. */
const LABEL_LEFT: ReadonlySet<string> = new Set(['chicago']);

export function SiteSelect() {
  const startProject = useGame((s) => s.startProject);
  return (
    <div className="site-select">
      <header className="site-select-header">
        <h1>Skyscraper Studio</h1>
        <p>Pick a city. Every site has its own ground, weather, and history — and its own way to fail.</p>
      </header>

      <svg className="world-map" viewBox={`0 0 ${MAP_W} ${MAP_H}`} role="img" aria-label="World map of building sites">
        <defs>
          <clipPath id="world-clip">
            <rect width={MAP_W} height={MAP_H} rx="12" />
          </clipPath>
        </defs>
        <rect width={MAP_W} height={MAP_H} rx="12" className="world-ocean" />
        {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((lon) => (
          <line key={`lon${lon}`} x1={project(0, lon).x} x2={project(0, lon).x} y1={0} y2={MAP_H} className="world-grid" />
        ))}
        {[60, 30, 0, -30].map((lat) => (
          <line key={`lat${lat}`} y1={project(lat, 0).y} y2={project(lat, 0).y} x1={0} x2={MAP_W} className="world-grid" />
        ))}
        <path d={LAND_PATH} className="world-land" clipPath="url(#world-clip)" />
        {SITE_IDS.map((id) => {
          const { x, y } = project(SITES[id].mapPos.lat, SITES[id].mapPos.lon);
          const left = LABEL_LEFT.has(id);
          return (
            <g key={id}>
              <circle cx={x} cy={y} r="7" className="world-pin" />
              <text x={left ? x - 11 : x + 11} y={y + 4} textAnchor={left ? 'end' : 'start'} className="world-label">
                {SITES[id].city}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="site-cards">
        {SITE_IDS.map((id) => {
          const site = SITES[id];
          return (
            <section key={id} className="site-card" aria-label={site.city}>
              <h2>{site.city}</h2>
              <p className="site-name">{site.name}</p>
              <p>{site.challenge}</p>
              <p className="site-fact">💡 {site.fact}</p>
              <div className="site-actions">
                {briefsForSite(id).map((b) => (
                  <button key={b.id} className="brief-button" onClick={() => startProject(id, 'challenge', b.id)}>
                    <strong>Challenge: {b.title}</strong>
                    <span>{b.lesson}</span>
                  </button>
                ))}
                <button className="sandbox-button" onClick={() => startProject(id, 'sandbox')}>
                  Sandbox in {site.city}
                </button>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
