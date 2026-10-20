import { describe, expect, it } from 'vitest';
import { fastestMs } from '../../test/fastest';
import { outriggerFloors } from '../../sim/construction/stages';
import { FLOOR_HEIGHT, plateDims } from '../../sim/geometry';
import { partBounds, partIsFinite } from '../../sim/parts';
import { designFor } from '../../sim/testUtils';
import type { Design, Material, PlanShape, StructuralSystem } from '../../sim/types';
import { structureParts, type StructurePart } from './structureParts';

const SYSTEMS: StructuralSystem[] = ['rigid-frame', 'framed-tube', 'core-outrigger', 'bundled-tube', 'diagrid', 'buttressed-core'];
const MATERIALS: Material[] = ['steel', 'concrete', 'composite'];
const SHAPES: PlanShape[] = ['square', 'rectangle', 'circle', 'triangle'];
const EXTREMES: Partial<Design>[] = [
  { floors: 5, twist: 0, taper: 0, setbacks: 'none' },
  { floors: 150, twist: 120, taper: 0.6, setbacks: 'wedding-cake', plateWidth: 15 },
];

const build = (patch: Partial<Design>) => {
  const { design } = designFor('shanghai', { shape: 'square', plateWidth: 40, floors: 40, setbacks: 'none', taper: 0, twist: 0, ...patch });
  return { design, parts: structureParts(design) };
};
const ofRole = (parts: StructurePart[], role: StructurePart['role']) => parts.filter((p) => p.role === role);
/** Columns standing at the outside edge of the ground floor. */
const edgeColumns = (design: Design, parts: StructurePart[]) => {
  const { width } = plateDims(design);
  return ofRole(parts, 'column').filter((p) => p.part.rotation?.[0] === 0 && p.part.position[1] < 3 * FLOOR_HEIGHT && Math.max(Math.abs(p.part.position[0]), Math.abs(p.part.position[2])) > width / 2 - 2);
};
const interiorColumns = (design: Design, parts: StructurePart[]) => {
  const { width } = plateDims(design);
  return ofRole(parts, 'column').filter((p) => p.part.rotation?.[0] === 0 && p.part.position[1] < 3 * FLOOR_HEIGHT && Math.max(Math.abs(p.part.position[0]), Math.abs(p.part.position[2])) < width / 2 - 4);
};

describe('structureParts', () => {
  it.each(SYSTEMS)('%s: every material, shape and extreme is finite and stays inside the tower', (system) => {
    for (const material of MATERIALS)
      for (const shape of SHAPES)
        for (const extreme of EXTREMES) {
          const { design, parts } = build({ system, material, shape, ...extreme, damping: 'viscous', baseIsolation: true, exposedStructure: true });
          const label = `${system} ${material} ${shape} ${extreme.floors}`;
          const { width, depth } = plateDims(design);
          const reach = Math.hypot(width, depth) / 2 + 2;
          expect(parts.length, label).toBeGreaterThan(0);
          for (const { part, top, role } of parts) {
            expect(partIsFinite(part), label).toBe(true);
            expect(top, label).toBeCloseTo(partBounds(part).max[1], 6);
            // Exposed X-braces are the main tower's own parts (bracingParts), tested with the ornaments.
            if (role === 'brace') continue;
            const b = partBounds(part);
            expect(Math.hypot(b.max[0], b.max[2]), label).toBeLessThan(reach);
            expect(Math.hypot(b.min[0], b.min[2]), label).toBeLessThan(reach);
            expect(b.max[1], label).toBeLessThanOrEqual(design.floors * FLOOR_HEIGHT + 1e-6);
            expect(b.min[1], label).toBeGreaterThanOrEqual(-1 - 1e-6);
          }
        }
  });

  it('gives a rigid frame columns across the whole floor', () => {
    const { design, parts } = build({ system: 'rigid-frame' });
    expect(interiorColumns(design, parts).length).toBeGreaterThan(4);
  });

  it('packs a framed tube with columns about 3 m apart round the edge and none inside', () => {
    const { design, parts } = build({ system: 'framed-tube' });
    const edge = edgeColumns(design, parts);
    expect(edge.length).toBeGreaterThanOrEqual(Math.floor((4 * 40) / 3.5));
    expect(interiorColumns(design, parts)).toHaveLength(0);
  });

  it('gives a bundled tube rows of columns inside the floor as well', () => {
    const { design, parts } = build({ system: 'bundled-tube' });
    expect(interiorColumns(design, parts).length).toBeGreaterThan(10);
  });

  it('wraps a diagrid in diagonals with no upright edge columns', () => {
    const { design, parts } = build({ system: 'diagrid' });
    expect(edgeColumns(design, parts)).toHaveLength(0);
    expect(ofRole(parts, 'column').filter((p) => Math.abs(p.part.rotation?.[0] ?? 0) > 0.3).length).toBeGreaterThan(8);
  });

  it('puts outrigger trusses at about a third and two thirds of the height', () => {
    const { design, parts } = build({ system: 'core-outrigger', floors: 60 });
    const levels = new Set(ofRole(parts, 'outrigger').map((p) => Math.round(p.top / FLOOR_HEIGHT)));
    for (const f of outriggerFloors(design.floors)) expect([...levels].some((l) => Math.abs(l - f) <= 1)).toBe(true);
    expect(ofRole(build({ system: 'framed-tube' }).parts, 'outrigger')).toHaveLength(0);
  });

  it('braces a buttressed core with three wing walls on every run', () => {
    const { parts } = build({ system: 'buttressed-core', floors: 40 });
    const ground = ofRole(parts, 'wall').filter((p) => partBounds(p.part).min[1] < 1);
    expect(ground).toHaveLength(3);
  });

  it('makes steel slimmer than concrete, and gives a steel rigid frame a braced steel core', () => {
    const size = (material: Material) => Math.min(...ofRole(build({ system: 'rigid-frame', material }).parts, 'column').map((p) => p.part.scale[0]));
    expect(size('steel')).toBeLessThan(size('concrete'));
    const steelCore = ofRole(build({ system: 'rigid-frame', material: 'steel' }).parts, 'core');
    expect(steelCore.some((p) => p.part.material === 'girder' && Math.abs(p.part.rotation?.[0] ?? 0) > 0.3)).toBe(true);
    const concreteCore = ofRole(build({ system: 'core-outrigger', material: 'steel' }).parts, 'core');
    expect(concreteCore.every((p) => p.part.material === 'concrete')).toBe(true);
  });

  it('adds dampers, isolators and exposed bracing only when chosen', () => {
    const plain = build({ damping: 'none', baseIsolation: false, exposedStructure: false }).parts;
    for (const role of ['damper', 'mass-damper', 'isolator', 'brace'] as const) expect(ofRole(plain, role), role).toHaveLength(0);
    expect(ofRole(build({ damping: 'viscous' }).parts, 'damper').length).toBeGreaterThan(0);
    expect(ofRole(build({ damping: 'tmd' }).parts, 'mass-damper').length).toBeGreaterThan(0);
    expect(ofRole(build({ baseIsolation: true }).parts, 'isolator')).toHaveLength(25);
    expect(ofRole(build({ exposedStructure: true }).parts, 'brace').length).toBeGreaterThan(0);
  });

  it('builds the worst case quickly and with a bounded number of parts', () => {
    for (const system of ['framed-tube', 'bundled-tube'] as const) {
      const { design } = designFor('shanghai', { floors: 150, plateWidth: 80, shape: system === 'framed-tube' ? 'circle' : 'square', system, material: 'concrete', setbacks: 'none', twist: 0, taper: 0, damping: 'viscous', baseIsolation: true, exposedStructure: true });
      structureParts(design);
      let parts: StructurePart[] = [];
      expect(fastestMs(5, (i) => (parts = structureParts({ ...design, floors: 150 - i }))), system).toBeLessThan(30);
      expect(parts.length, system).toBeLessThan(8000);
    }
  });
});
