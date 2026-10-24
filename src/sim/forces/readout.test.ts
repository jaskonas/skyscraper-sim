import { describe, expect, it } from 'vitest';
import { analyze } from '../analysis';
import { designFor } from '../testUtils';
import type { Design, SiteId } from '../types';
import { quakeReadout, windReadout } from './readout';

const read = (kind: 'wind' | 'quake', siteId: SiteId, patch: Partial<Design> = {}) => {
  const { site, design } = designFor(siteId, patch);
  const analysis = analyze(site, design);
  const r = kind === 'wind' ? windReadout(site, design, analysis) : quakeReadout(site, design, analysis);
  return { site, design, analysis, r, text: r.lines.map((l) => l.text).join('\n') };
};

describe('windReadout', () => {
  it("quotes the site's storm, the lean and sway, and the felt sway against the limit for the top floor's use", () => {
    const { site, analysis, r, text } = read('wind', 'chicago', { useMix: { retail: 0, office: 0, hotel: 0, residential: 100 } });
    expect(r.title).toBe('Wind');
    expect(text).toContain(`${site.windSpeed} m/s`);
    expect(text).toMatch(/Top of tower leans \d+\.\d\d m and sways ±\d+\.\d\d m/);
    expect(text).toContain(`the limit for homes is ${analysis.wind.comfortLimitMg} mg`);
    expect(r.note).toBe('Sway shown 5× bigger');
  });

  it('mentions dampers only when chosen, with how much they cut the felt sway', () => {
    expect(read('wind', 'chicago', { damping: 'none' }).text).not.toMatch(/damper/i);
    expect(read('wind', 'chicago', { damping: 'tmd' }).text).toContain('The tuned mass damper cuts the sway people feel by about 50%.');
    expect(read('wind', 'chicago', { damping: 'viscous' }).text).toContain('The viscous dampers cut the sway people feel by about 38%.');
  });

  it('marks the comfort line by the assessment, and bans a tower that would fail', () => {
    const ok = read('wind', 'chicago');
    expect(ok.r.lines.find((l) => /feel/.test(l.text))!.status).toBe(ok.analysis.checks.find((c) => c.id === 'windComfort')!.status);
    expect(ok.r.banner).toBeUndefined();
    const weak = read('wind', 'shanghai', { floors: 140, plateWidth: 18, system: 'rigid-frame', material: 'steel', taper: 0, twist: 0, setbacks: 'none', exposedStructure: false, damping: 'none' });
    expect(weak.analysis.checks.find((c) => c.id === 'windStrength')!.status).toBe('fail');
    expect(weak.r.banner).toBe('Would fail in this wind');
    expect(weak.text).toMatch(/seasick/);
  });

  it('puts impossible numbers into words instead of quoting them', () => {
    const weak = read('wind', 'shanghai', { floors: 140, plateWidth: 18, system: 'rigid-frame', material: 'steel', taper: 0, twist: 0, setbacks: 'none', exposedStructure: false, damping: 'none' });
    expect(weak.text).toContain('The wind would push the top further than the structure can take');
    expect(weak.text).not.toMatch(/leans \d/);
    expect(weak.text).toContain(`more than 10 times the limit for offices (${weak.analysis.wind.comfortLimitMg} mg)`);
    expect(weak.text).not.toMatch(/feel \d{3,}/);
  });
});

describe('quakeReadout', () => {
  it("quotes the site's shaking, the tower's swing and how hard the quake works it", () => {
    const { site, analysis, r, text } = read('quake', 'tokyo');
    expect(r.title).toBe('Earthquake');
    expect(text).toContain(`${site.seismicHazard} g of ground shaking`);
    expect(text).toContain(`once every ${analysis.seismic.periodS.toFixed(1)} s`);
    expect(text).toContain(`The quake pushes it to ${Math.round(analysis.seismic.ratio * 100)}% of its breaking point; it stays fully working below 35%`);
    expect(r.note).toBe('Motion shown much bigger');
  });

  it('explains whether the tower rides out the jolts or gets shaken hard', () => {
    expect(read('quake', 'tokyo', { floors: 40 }).text).toMatch(/rides them out/);
    expect(read('quake', 'tokyo', { floors: 8 }).text).toMatch(/shaken hard/);
  });

  it('says what happens to the tower, with a banner only when it would fail', () => {
    const fine = read('quake', 'chicago');
    expect(fine.analysis.seismic.outcome).toBe('operational');
    expect(fine.text).toContain('Would stay open for business');
    expect(fine.r.banner).toBeUndefined();
    const damaged = read('quake', 'tokyo', { floors: 100, material: 'concrete', system: 'rigid-frame', baseIsolation: false, damping: 'none' });
    expect(damaged.analysis.seismic.outcome).toBe('damaged');
    expect(damaged.text).toContain('Damaged');
    expect(damaged.r.banner).toBeUndefined();
    // A squat, heavy, stiff concrete box with a rooftop pool, in Tokyo.
    const failing = read('quake', 'tokyo', { floors: 10, shape: 'square', setbacks: 'none', material: 'concrete', system: 'rigid-frame', baseIsolation: false, damping: 'none', amenities: ['pool'], facade: 'masonry' });
    expect(failing.analysis.seismic.outcome).toBe('fails');
    expect(failing.r.banner).toBe('Would fail in this earthquake');
  });

  it('mentions base isolation and dampers only when chosen', () => {
    expect(read('quake', 'tokyo', { baseIsolation: false, damping: 'none' }).text).not.toMatch(/isolation|damper/i);
    expect(read('quake', 'tokyo', { baseIsolation: true }).text).toContain('the ground moves, the tower barely does');
    expect(read('quake', 'tokyo', { damping: 'viscous' }).text).toMatch(/Viscous dampers/);
    expect(read('quake', 'tokyo', { damping: 'tmd' }).text).toMatch(/tuned mass damper/);
  });

  it('notes that strong earthquakes are rare where they are', () => {
    expect(read('quake', 'chicago').text).toMatch(/rare/);
    expect(read('quake', 'tokyo').text).not.toMatch(/rare/);
  });
});
