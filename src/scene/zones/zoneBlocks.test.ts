import { describe, expect, it } from 'vitest';
import { USE_LABEL } from '../../sim/catalog/zones';
import { FLOOR_HEIGHT } from '../../sim/geometry';
import { designFor } from '../../sim/testUtils';
import { zoneBlocks } from './zoneBlocks';

describe('zoneBlocks', () => {
  it('one block per zone, coloured by use, covering its floors', () => {
    const { design } = designFor('chicago', { floors: 40, stack: [{ use: 'retail', share: 10 }, { use: 'office', share: 60 }, { use: 'residential', share: 30 }] });
    const blocks = zoneBlocks(design);
    expect(blocks.map((b) => b.use)).toEqual(['retail', 'office', 'residential']);
    expect(blocks.map((b) => b.color)).toEqual([USE_LABEL.retail.color, USE_LABEL.office.color, USE_LABEL.residential.color]);
    expect(blocks.map((b) => b.slices.map((s) => s.index))).toEqual([
      [0, 1, 2, 3],
      Array.from({ length: 24 }, (_, k) => k + 4),
      Array.from({ length: 12 }, (_, k) => k + 28),
    ]);
    expect(blocks[1].labelY).toBeCloseTo(((4 + 28) / 2) * FLOOR_HEIGHT);
    expect(blocks[0].fit).toBe('good');
  });
});
