import ReactThreeTestRenderer from '@react-three/test-renderer';
import type * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { analyze } from '../../sim/analysis';
import { quakeMotion } from '../../sim/forces/motion';
import { designFor } from '../../sim/testUtils';
import type { Design, SiteId } from '../../sim/types';
import { ForcesView, GroundShake, forceMarks } from './ForcesView';
import { createSway } from './sway';

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;
const count = (r: Renderer, name: string) =>
  r.scene.findAll((n) => n.props.name === name).reduce((s, n) => s + ((n.instance as THREE.InstancedMesh).count ?? 0), 0);

const view = async (force: 'wind' | 'quake', siteId: SiteId, patch: Partial<Design> = {}) => {
  const { site, design } = designFor(siteId, patch);
  const analysis = analyze(site, design);
  const sway = createSway();
  const r = await ReactThreeTestRenderer.create(<ForcesView site={site} design={design} analysis={analysis} force={force} sway={sway} />);
  return { r, sway, site, design, analysis };
};

describe('<ForcesView />', () => {
  it('wind bends the tower over without moving the ground', async () => {
    const { r, sway, design } = await view('wind', 'chicago');
    await r.advanceFrames(60, 0.05);
    expect(sway.active).toBe(true);
    expect(sway.topX).toBeGreaterThan(0);
    expect(sway.groundX).toBe(0);
    expect(sway.height).toBe(design.floors * 4);
    expect(sway.time).toBeCloseTo(3, 5);
  });

  it('a quake shakes the ground, and base isolation lets only a fifth of it reach the tower', async () => {
    for (const baseIsolation of [false, true]) {
      const { r, sway } = await view('quake', 'tokyo', { baseIsolation });
      let moved = false;
      for (let i = 0; i < 80; i++) {
        await r.advanceFrames(1, 0.05);
        if (Math.abs(sway.groundX) > 0.5) {
          moved = true;
          expect(sway.baseX).toBeCloseTo(sway.groundX * (baseIsolation ? 0.2 : 1), 9);
        }
      }
      expect(moved).toBe(true);
    }
  });

  it('never draws the sway bigger than 15% of the height, even for a tower that would fail badly', async () => {
    const { r, sway, design } = await view('wind', 'shanghai', { floors: 140, plateWidth: 18, system: 'rigid-frame', material: 'steel', taper: 0, twist: 0, setbacks: 'none', exposedStructure: false, damping: 'none' });
    for (let i = 0; i < 40; i++) {
      await r.advanceFrames(1, 0.1);
      expect(Math.abs(sway.topX)).toBeLessThanOrEqual(0.15 * design.floors * 4 + 1e-9);
    }
    expect(Math.abs(sway.topX)).toBeGreaterThan(0.1 * design.floors * 4);
  });

  it('shrinks the whole motion to fit instead of clipping it, so a failing tower still leans downwind and visibly sways', async () => {
    const { r, sway, design } = await view('wind', 'chicago', { floors: 120 });
    const height = design.floors * 4;
    await r.advanceFrames(40, 0.05); // past the 2 s ease-in
    const tops: number[] = [];
    for (let i = 0; i < 160; i++) {
      await r.advanceFrames(1, 0.05);
      tops.push(sway.topX);
    }
    expect(Math.min(...tops)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...tops)).toBeLessThanOrEqual(0.15 * height + 1e-9);
    // Not pinned flat against the cap: it keeps a clear swing.
    expect(Math.max(...tops) - Math.min(...tops)).toBeGreaterThan(0.05 * height);
    // And not stuck at the cap for long stretches.
    expect(tops.filter((x) => x > 0.149 * height).length).toBeLessThan(tops.length / 4);
  });

  it('stops the sway when the force is switched off', async () => {
    const { r, sway } = await view('wind', 'chicago');
    await r.advanceFrames(10, 0.05);
    await r.unmount();
    expect(sway.active).toBe(false);
  });

  it('draws more eddies behind a blunt square box than behind a round, twisted tower', async () => {
    const square = await view('wind', 'chicago', { shape: 'square', twist: 0, taper: 0, setbacks: 'none' });
    const round = await view('wind', 'chicago', { shape: 'circle', twist: 90, taper: 0.3, setbacks: 'none' });
    expect(count(square.r, 'wind-streaks')).toBeGreaterThan(count(round.r, 'wind-streaks'));
    expect(count(round.r, 'wind-streaks')).toBeGreaterThanOrEqual(40);
  });

  it('shows the tuned mass damper inside see-through top floors, only with a damper in the wind', async () => {
    expect((await view('wind', 'chicago', { damping: 'tmd' })).r.scene.findAll((n) => n.props.name === 'damper-ghost')).toHaveLength(1);
    expect((await view('wind', 'chicago', { damping: 'none' })).r.scene.findAll((n) => n.props.name === 'damper-ghost')).toHaveLength(0);
    expect((await view('quake', 'chicago', { damping: 'tmd' })).r.scene.findAll((n) => n.props.name === 'damper-ghost')).toHaveLength(0);
  });
});

describe('forceMarks', () => {
  it('marks the lower third when the tower would fail, the top when people would be seasick, and cracks when damaged', () => {
    const weak = designFor('shanghai', { floors: 140, plateWidth: 18, system: 'rigid-frame', material: 'steel', taper: 0, twist: 0, setbacks: 'none', exposedStructure: false, damping: 'none' });
    const a = analyze(weak.site, weak.design);
    const marks = forceMarks('wind', weak.site, weak.design, a);
    expect(marks.bands).toEqual(expect.arrayContaining([0, Math.floor(140 / 3) - 1]));
    expect(marks.bands).toEqual(expect.arrayContaining([137, 138, 139]));
    const fine = designFor('chicago');
    expect(forceMarks('wind', fine.site, fine.design, analyze(fine.site, fine.design))).toEqual({ bands: [], cracks: [] });
    const quake = designFor('tokyo', { floors: 60 });
    const qa = analyze(quake.site, quake.design);
    const qm = forceMarks('quake', quake.site, quake.design, { ...qa, seismic: { ...qa.seismic, outcome: 'damaged' } });
    expect(qm.cracks.length).toBe(6);
    expect(qm.bands).toEqual([]);
    expect(quakeMotion(quake.site, quake.design, qa).groundM).toBeGreaterThan(0);
  });
});

describe('<GroundShake />', () => {
  it('moves the whole city block with the ground', async () => {
    const sway = { ...createSway(), active: true, groundX: 2.5 };
    const r = await ReactThreeTestRenderer.create(
      <GroundShake sway={sway}>
        <mesh />
      </GroundShake>,
    );
    await r.advanceFrames(1, 0.016);
    const group = r.scene.findAll((n) => n.props.name === 'ground')[0].instance as THREE.Group;
    expect(group.position.x).toBe(2.5);
    sway.active = false;
    await r.advanceFrames(1, 0.016);
    expect(group.position.x).toBe(0);
  });
});
