import { describe, expect, it } from 'vitest';
import { designFor } from '../testUtils';
import type { Design, SiteId, UseBand } from '../types';
import { stackFits } from './fit';

const fits = (siteId: SiteId, patch: Partial<Design>) => stackFits(designFor(siteId, patch).design);
const band = (siteId: SiteId, stack: UseBand[], patch: Partial<Design> = {}) => fits(siteId, { ...patch, stack });

describe('zone fit', () => {
  it('default tower: offices good, homes ok, hotel bad', () => {
    expect(fits('chicago', {}).map((f) => f.fit)).toEqual(['good', 'good']);
    const [, homes] = band('chicago', [{ use: 'office', share: 25 }, { use: 'residential', share: 75 }]);
    expect(homes.fit).toBe('ok');
    expect(homes.reason).toContain('14 m');
    const [, hotel] = band('chicago', [{ use: 'office', share: 25 }, { use: 'hotel', share: 75 }]);
    expect(hotel.fit).toBe('bad');
    expect(hotel.reason).toBe('Hotel rooms 14 m from the windows would be dark. Hotels like slim floors (under 10 m deep).');
    expect(hotel.depthM).toBeCloseTo(14);
  });

  it('pencil tower homes are good', () => {
    const [, homes] = band('new-york', [{ use: 'retail', share: 15 }, { use: 'residential', share: 85 }], { plateWidth: 30 });
    expect(homes.fit).toBe('good');
  });

  it('tapered tower: offices low, homes and hotel up the slim top', () => {
    const r = band('shanghai', [{ use: 'office', share: 60 }, { use: 'residential', share: 20 }, { use: 'hotel', share: 20 }], { plateWidth: 50, taper: 0.5, floors: 100 });
    expect(r.map((f) => f.fit)).toEqual(['good', 'good', 'good']);
  });

  it('offices at a slim top are bad', () => {
    const r = band('shanghai', [{ use: 'residential', share: 70 }, { use: 'office', share: 30 }], { plateWidth: 36, taper: 0.6, floors: 100 });
    expect(r[1].fit).toBe('bad');
    expect(r[1].reason).toContain('too narrow for desks');
  });

  it('shops up high need an observation deck', () => {
    const stack: UseBand[] = [{ use: 'office', share: 80 }, { use: 'retail', share: 20 }];
    const [, shops] = band('chicago', stack);
    expect(shops.fit).toBe('ok');
    expect(shops.reason).toBe("Shoppers won't ride up to floor 33 without a reason.");
    const [, deck] = band('chicago', stack, { amenities: ['observation-deck'] });
    expect(deck.fit).toBe('good');
    expect(deck.reason).toBe('Visitors to the observation deck shop on the way down.');
  });

  it('shops at the street are good', () => {
    expect(fits('chicago', {})[0].reason).toBe('Right on the street, where shoppers walk past.');
  });

  it('homes at the street are ok', () => {
    const [homes] = band('new-york', [{ use: 'residential', share: 50 }, { use: 'office', share: 50 }], { plateWidth: 30 });
    expect(homes.fit).toBe('ok');
    expect(homes.reason).toBe('Street noise and no view down here.');
  });

  it('tiny hotel is ok', () => {
    const r = band('new-york', [{ use: 'office', share: 30 }, { use: 'hotel', share: 10 }, { use: 'residential', share: 60 }], { plateWidth: 26, floors: 30 });
    expect(r[1].to - r[1].from + 1).toBe(3);
    expect(r[1].fit).toBe('ok');
    expect(r[1].reason).toBe('Too small for a hotel: it needs at least 5 floors for its own lobby and staff.');
  });

  it('worst factor wins, depth first on ties', () => {
    // Hotel at the street on the default 40 m plate: depth is bad, height ok → depth reason.
    const [hotel] = band('chicago', [{ use: 'hotel', share: 50 }, { use: 'office', share: 50 }]);
    expect(hotel.fit).toBe('bad');
    expect(hotel.reason).toContain('from the windows');
    // Homes at the street on a 40 m plate: depth ok and height ok → depth reason (listed first).
    const [homes] = band('chicago', [{ use: 'residential', share: 50 }, { use: 'office', share: 50 }]);
    expect(homes.fit).toBe('ok');
    expect(homes.reason).toContain('from the windows');
  });
});
