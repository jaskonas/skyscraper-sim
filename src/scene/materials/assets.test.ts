import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '../../../public/textures');
const SOURCES: Record<string, string> = {
  'brick-red': 'red_brick_03',
  'brick-buff': 'yellow_brick',
  limestone: 'white_sandstone_blocks_02',
  granite: 'granite_tile',
  terracotta: 'rectangular_facade_tiles_02',
  'concrete-board': 'wood_textured_concrete',
  'concrete-precast': 'precast_concrete_wall',
  'metal-panel': 'metal_plate_02',
  copper: 'green_metal_rust',
  wood: 'weathered_planks',
  roofing: 'tarred_gravel',
  paving: 'concrete_pavers',
};

const sizeOf = (dir: string): number =>
  readdirSync(dir).reduce((s, f) => {
    const p = join(dir, f);
    return s + (statSync(p).isDirectory() ? sizeOf(p) : statSync(p).size);
  }, 0);

describe('texture library files', () => {
  it('has a detail and a normal map for every library material', () => {
    for (const id of Object.keys(SOURCES)) {
      expect(existsSync(join(ROOT, id, 'detail.jpg')), id).toBe(true);
      expect(existsSync(join(ROOT, id, 'normal.jpg')), id).toBe(true);
    }
  });

  it('stays within the 5 MB budget', () => {
    expect(sizeOf(ROOT)).toBeLessThanOrEqual(5 * 1024 * 1024);
  });

  it('credits every source', () => {
    const licenses = readFileSync(join(ROOT, 'LICENSES.md'), 'utf8');
    expect(licenses).toContain('CC0');
    for (const asset of Object.values(SOURCES)) expect(licenses).toContain(asset);
  });
});
