import { describe, expect, it } from 'vitest';
import { TOWER_NAME_MAX, cleanTowerName, towerFileSlug } from './towerName';

describe('cleanTowerName', () => {
  it('trims and collapses whitespace', () => {
    expect(cleanTowerName('  The   Big\tOne \n')).toBe('The Big One');
  });
  it('removes control characters', () => {
    expect(cleanTowerName('A\u0007B')).toBe('AB');
  });
  it('turns blank input into an empty string', () => {
    expect(cleanTowerName('   ')).toBe('');
  });
  it('keeps at most 40 code points without splitting an emoji', () => {
    const rockets = '🚀'.repeat(45);
    expect(TOWER_NAME_MAX).toBe(40);
    expect(Array.from(cleanTowerName(rockets))).toHaveLength(40);
    expect(cleanTowerName(rockets).endsWith('🚀')).toBe(true);
  });
});

describe('towerFileSlug', () => {
  it('lower-cases, strips accents and joins words with dashes', () => {
    expect(towerFileSlug('Café Tower #1!', 'tokyo')).toBe('cafe-tower-1');
  });
  it('falls back when nothing is left', () => {
    expect(towerFileSlug('🚀🚀', 'tokyo')).toBe('tokyo');
    expect(towerFileSlug(null, 'chicago')).toBe('chicago');
  });
  it('keeps at most 30 characters', () => {
    expect(towerFileSlug('x'.repeat(50), 'tokyo')).toHaveLength(30);
  });
});
