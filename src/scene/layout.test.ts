import { describe, expect, it } from 'vitest';
import { SITES, SITE_IDS } from '../sim/sites';
import { DIORAMA, LANDMARK_POSITION, cameraFrame, generateNeighbors, lotCenter, soilBands, soilDepthShown } from './layout';

describe('scene layout', () => {
  it('keeps every lot inside the diorama', () => {
    for (const id of SITE_IDS) {
      const site = SITES[id];
      const [x, z] = lotCenter(site);
      expect(Math.abs(x) + site.lot.width / 2).toBeLessThanOrEqual(DIORAMA.width / 2);
      expect(Math.abs(z) + site.lot.depth / 2).toBeLessThanOrEqual(DIORAMA.depth / 2);
    }
  });

  it('never puts a neighbor on the lot', () => {
    for (const id of SITE_IDS) {
      const site = SITES[id];
      const [lx, lz] = lotCenter(site);
      for (const b of generateNeighbors(site)) {
        const overlapX = Math.abs(b.x - lx) < site.lot.width / 2 + b.width / 2;
        const overlapZ = Math.abs(b.z - lz) < site.lot.depth / 2 + b.depth / 2;
        expect(overlapX && overlapZ).toBe(false);
      }
    }
  });

  it('is the same city every time', () => {
    expect(generateNeighbors(SITES.tokyo)).toEqual(generateNeighbors(SITES.tokyo));
    expect(generateNeighbors(SITES.tokyo).length).toBeGreaterThan(10);
  });

  it('soil bands fill exactly the shown depth', () => {
    for (const id of SITE_IDS) {
      const site = SITES[id];
      const total = soilBands(site).reduce((s, b) => s + b.thickness, 0);
      expect(total).toBeCloseTo(soilDepthShown(site));
    }
  });

  it('shows bedrock where it is shallow and not where it is deep', () => {
    expect(soilBands(SITES['new-york']).some((b) => b.name === 'Bedrock')).toBe(true);
    expect(soilBands(SITES.shanghai).some((b) => b.name === 'Bedrock')).toBe(false);
  });
});

describe('camera framing and skyline', () => {
  it('frames taller towers from farther away, aiming below the top', () => {
    const site = SITES.chicago;
    const short = cameraFrame(site, 160);
    const tall = cameraFrame(site, 520);
    const dist = (f: ReturnType<typeof cameraFrame>) => Math.hypot(...f.position.map((p, i) => p - f.target[i]));
    expect(dist(tall)).toBeGreaterThan(dist(short));
    expect(tall.target[1]).toBeLessThan(520);
    expect(dist(tall)).toBeLessThan(6000);
  });

  it('puts the landmark on the skyline, outside the diorama', () => {
    expect(Math.abs(LANDMARK_POSITION[0])).toBeGreaterThan(DIORAMA.width / 2);
    expect(Math.abs(LANDMARK_POSITION[2])).toBeGreaterThan(DIORAMA.depth / 2);
  });
});
