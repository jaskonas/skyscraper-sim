import { describe, expect, it } from 'vitest';
import { applyStylePreset, defaultDesign, isStyleModified } from '../design';
import { SITES, SITE_IDS } from '../sites';
import type { FoundationType } from '../types';
import { AMENITIES, AMENITY_IDS } from './amenities';
import { STYLE_IDS, STYLE_PRESETS } from './styles';

describe('sites', () => {
  it('defines every foundation type with positive capacity', () => {
    const types: FoundationType[] = ['mat', 'raft', 'piles', 'caissons'];
    for (const id of SITE_IDS) {
      for (const t of types) expect(SITES[id].foundation[t].capacity).toBeGreaterThan(0);
      expect(SITES[id].soil.length).toBeGreaterThan(0);
    }
  });

  it('makes deep foundations stronger than a shallow mat everywhere', () => {
    for (const id of SITE_IDS) {
      const f = SITES[id].foundation;
      expect(Math.max(f.piles.capacity, f.caissons.capacity)).toBeGreaterThanOrEqual(f.mat.capacity);
    }
  });
});

describe('style presets', () => {
  it('every preset has a history card with examples', () => {
    for (const style of STYLE_IDS) {
      const p = STYLE_PRESETS[style];
      expect(p.summary.length).toBeGreaterThan(10);
      expect(p.why.length).toBeGreaterThan(10);
      expect(p.examples.length).toBeGreaterThan(0);
    }
  });

  it('marks a design modified once a style field changes', () => {
    const d = applyStylePreset(defaultDesign(SITES.chicago), 'art-deco');
    expect(isStyleModified(d)).toBe(false);
    expect(isStyleModified({ ...d, twist: 30 })).toBe(true);
    expect(isStyleModified({ ...d, floors: 99 })).toBe(false);
  });
});

describe('amenities', () => {
  it('every amenity has a label and explanation', () => {
    for (const id of AMENITY_IDS) {
      expect(AMENITIES[id].label.length).toBeGreaterThan(2);
      expect(AMENITIES[id].explain.length).toBeGreaterThan(10);
    }
  });
});
