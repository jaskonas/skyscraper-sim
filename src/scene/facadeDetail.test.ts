import { describe, expect, it } from 'vitest';
import { designFor } from '../sim/testUtils';
import { NIGHT_LIGHTS, nightWindowAttributes, windowLit } from './nightWindows';
import {
  BLINDS_SHARE,
  DARK_SHARE,
  FACADE_DETAIL_GLSL,
  ROOM_TINT,
  isMechanicalFloor,
  mechanicalFloors,
  paneTint,
  roomBlinds,
  roomDark,
} from './facadeDetail';

const many = (f: (bay: number, floor: number) => number | boolean) => {
  const out: (number | boolean)[] = [];
  for (let floor = 0; floor < 120; floor++) for (let bay = -20; bay < 20; bay++) out.push(f(bay, floor));
  return out;
};

describe('window variety', () => {
  it('gives each use its own room colour', () => {
    expect(new Set(Object.values(ROOM_TINT)).size).toBe(4);
  });

  it('pulls blinds on about 30% of windows, covering 20–90% of the pane, the same every time', () => {
    const blinds = many(roomBlinds) as number[];
    const covered = blinds.filter((b) => b > 0);
    expect(covered.length / blinds.length).toBeGreaterThan(BLINDS_SHARE - 0.05);
    expect(covered.length / blinds.length).toBeLessThan(BLINDS_SHARE + 0.05);
    for (const b of covered) {
      expect(b).toBeGreaterThanOrEqual(0.2);
      expect(b).toBeLessThanOrEqual(0.9);
    }
    expect(roomBlinds(7, 31)).toBe(roomBlinds(7, 31));
  });

  it('leaves about 3% of rooms dark by day, and varies the glass tint by at most 6%', () => {
    const dark = many(roomDark) as boolean[];
    const share = dark.filter(Boolean).length / dark.length;
    expect(share).toBeGreaterThan(DARK_SHARE - 0.015);
    expect(share).toBeLessThan(DARK_SHARE + 0.015);
    const tints = many(paneTint) as number[];
    expect(Math.min(...tints)).toBeGreaterThanOrEqual(-0.06);
    expect(Math.max(...tints)).toBeLessThanOrEqual(0.06);
    expect(Math.max(...tints) - Math.min(...tints)).toBeGreaterThan(0.1);
  });

  it('chooses blinds, darkness and tint independently of the night lights', () => {
    // If they shared the night-light hash, every lit window would also have blinds.
    const lit = many((b, f) => windowLit(b, f, 0.5)) as boolean[];
    const blinds = many((b, f) => roomBlinds(b, f) > 0) as boolean[];
    const both = lit.filter((l, i) => l && blinds[i]).length;
    expect(both / lit.length).toBeGreaterThan(0.1);
    expect(both / lit.length).toBeLessThan(0.2);
  });

  it('has a GLSL twin of every choice for the facade shader', () => {
    for (const name of ['roomBlinds', 'roomDark', 'paneTint', 'detailHash']) expect(FACADE_DETAIL_GLSL).toContain(name);
  });
});

describe('mechanical floors', () => {
  it('puts plant floors every 30 floors on towers of 40 floors or more, never on the roof', () => {
    expect(mechanicalFloors(39)).toEqual([]);
    expect(mechanicalFloors(40)).toEqual([29]);
    expect(mechanicalFloors(90)).toEqual([29, 59]);
    expect(mechanicalFloors(91)).toEqual([29, 59, 89]);
    expect(isMechanicalFloor(59, 120)).toBe(true);
    expect(isMechanicalFloor(58, 120)).toBe(false);
  });

  it('never lights a mechanical floor at night', () => {
    const { design } = designFor('chicago', { floors: 70, useMix: { retail: 0, office: 100, hotel: 0, residential: 0 } });
    const a = nightWindowAttributes(design);
    expect(a.mech[29]).toBe(1);
    expect(a.lit[29]).toBe(0);
    expect(a.mech[30]).toBe(0);
    expect(a.lit[30]).toBeCloseTo(NIGHT_LIGHTS.office.lit, 6);
  });

  it('gives every floor its room colour', () => {
    const { design } = designFor('chicago', { floors: 20, useMix: { retail: 0, office: 0, hotel: 0, residential: 100 } });
    const a = nightWindowAttributes(design);
    expect(a.room.length).toBe(20 * 3);
    expect(Array.from(a.room.slice(0, 3)).every((v) => v > 0 && v <= 1)).toBe(true);
  });
});
