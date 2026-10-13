import ReactThreeTestRenderer from '@react-three/test-renderer';
import { describe, expect, it } from 'vitest';
import { designFor } from '../sim/testUtils';
import type { FoundationType } from '../sim/types';
import { FoundationView } from './FoundationView';

const named = async (el: React.ReactElement, name: string) => {
  const r = await ReactThreeTestRenderer.create(el);
  const n = r.scene.findAll((x) => x.props.name === name).length;
  await r.unmount();
  return n;
};

describe('<FoundationView />', () => {
  it('shows the whole foundation and no hole once built', async () => {
    for (const foundation of ['mat', 'raft', 'piles', 'caissons'] as FoundationType[]) {
      const { site, design } = designFor('chicago', { foundation });
      expect(await named(<FoundationView site={site} design={design} />, 'foundation-slab'), foundation).toBe(1);
      expect(await named(<FoundationView site={site} design={design} />, 'pit'), foundation).toBe(0);
    }
  });

  it('shows the hole while digging, before any foundation', async () => {
    const { site, design } = designFor('chicago', { foundation: 'mat' });
    expect(await named(<FoundationView site={site} design={design} dig={0.5} built={0} />, 'pit')).toBe(1);
    expect(await named(<FoundationView site={site} design={design} dig={0.5} built={0} />, 'foundation-slab')).toBe(0);
  });

  it('drives piles a few at a time, then pours the cap on top', async () => {
    const { site, design } = designFor('chicago', { foundation: 'piles', shape: 'square', plateWidth: 36 });
    const all = await named(<FoundationView site={site} design={design} />, 'shaft');
    expect(all).toBe(36);
    const half = await named(<FoundationView site={site} design={design} built={0.35} />, 'shaft');
    expect(half).toBeGreaterThan(10);
    expect(half).toBeLessThan(all);
    expect(await named(<FoundationView site={site} design={design} built={0.35} />, 'foundation-slab')).toBe(0);
    expect(await named(<FoundationView site={site} design={design} built={0.9} />, 'foundation-slab')).toBe(1);
  });
});
