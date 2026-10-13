import ReactThreeTestRenderer from '@react-three/test-renderer';
import type * as THREE from 'three';
import { beforeEach, describe, expect, it } from 'vitest';
import { analyze } from '../../sim/analysis';
import { constructionState } from '../../sim/construction/stages';
import { designFor } from '../../sim/testUtils';
import { useBuildProgress } from '../../state/buildProgress';
import { selectDesign, useGame } from '../../state/store';
import { getSite } from '../../sim/sites';
import { structureParts } from '../structure/structureParts';
import { ConstructionScene, ConstructionView } from './ConstructionView';
import { constructionProps } from './props';
import { visibleStructure } from './reveal';

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;
const instanceTotal = (r: Renderer, name: string) =>
  r.scene
    .findAll((n) => n.props.name === name)[0]
    .findAll((n) => (n.instance as THREE.InstancedMesh).isInstancedMesh === true)
    .reduce((s, n) => s + (n.instance as THREE.InstancedMesh).count, 0);

describe('<ConstructionScene />', () => {
  it('draws every stage, start to finish, with the bare structure and the props on site', async () => {
    const { site, design } = designFor('chicago', { floors: 40, material: 'steel', system: 'core-outrigger', foundation: 'caissons', damping: 'tmd', baseIsolation: true, exposedStructure: true, amenities: ['helipad'] });
    const analysis = analyze(site, design);
    const parts = structureParts(design);
    for (let stage = 0; stage < 6; stage++)
      for (const t of [0, 0.5, 1]) {
        const state = constructionState(design, analysis, stage, t);
        const r = await ReactThreeTestRenderer.create(<ConstructionScene site={site} design={design} parts={parts} state={state} clock={1} night={false} />);
        expect(instanceTotal(r, 'skeleton'), `${stage} ${t}`).toBe(visibleStructure(parts, state).length);
        expect(instanceTotal(r, 'site-props'), `${stage} ${t}`).toBe(constructionProps(design, state, 1).length);
        expect(r.scene.findAll((n) => n.props.name === 'building')).toHaveLength(1);
        await r.unmount();
      }
  });
});

describe('<ConstructionView /> playback', () => {
  beforeEach(() => {
    useGame.getState().newProject();
    useGame.getState().startProject('chicago', 'sandbox');
    useGame.getState().build();
  });

  it('plays the stage, reports its progress, and finishes it so Next can be pressed', async () => {
    const site = getSite('chicago');
    const design = selectDesign(useGame.getState())!;
    const r = await ReactThreeTestRenderer.create(<ConstructionView site={site} design={design} analysis={analyze(site, design)} night={false} />);
    await r.advanceFrames(30, 0.1);
    expect(useGame.getState().stageDone).toBe(false);
    expect(useBuildProgress.getState().t).toBeGreaterThan(0.3);
    await r.advanceFrames(40, 0.1);
    expect(useGame.getState().stageDone).toBe(true);
    expect(useBuildProgress.getState().t).toBe(1);
    // The next stage starts again from the beginning instead of finishing straight away.
    useGame.getState().nextStage();
    await r.advanceFrames(2, 0.1);
    expect(useGame.getState().stageDone).toBe(false);
    expect(useBuildProgress.getState().t).toBeLessThan(0.1);
  });

  it('caps a long pause between frames, so a hidden tab does not skip the stage', async () => {
    const site = getSite('chicago');
    const design = selectDesign(useGame.getState())!;
    const r = await ReactThreeTestRenderer.create(<ConstructionView site={site} design={design} analysis={analyze(site, design)} night={false} />);
    await r.advanceFrames(1, 30);
    expect(useGame.getState().stageDone).toBe(false);
  });
});
