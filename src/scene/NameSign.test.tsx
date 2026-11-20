import ReactThreeTestRenderer from '@react-three/test-renderer';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { designFor } from '../sim/testUtils';
import { Building } from './Building';
import { entranceAnchor, entranceParts } from './dressing/dressing';
import { lotCenter } from './layout';
import { fitSignText } from './NameSign';

describe('entrance', () => {
  it('entranceParts is unchanged by the refactor', () => {
    expect(entranceParts(designFor('chicago').design)).toMatchSnapshot();
    expect(entranceParts(designFor('tokyo', { shape: 'circle', twist: 45, ornament: 'high' }).design)).toMatchSnapshot();
  });
});

describe('fitSignText', () => {
  const measure = (t: string, px: number) => Array.from(t).length * px * 0.6;

  it('uses the big font when the name fits', () => {
    expect(fitSignText(measure, 'HUDSON', 1000)).toEqual({ text: 'HUDSON', px: 96 });
  });

  it('shrinks the font, then cuts with …', () => {
    const mid = fitSignText(measure, 'X'.repeat(24), 1000);
    expect(mid.text).toBe('X'.repeat(24));
    expect(mid.px).toBeLessThan(96);
    expect(mid.px).toBeGreaterThanOrEqual(40);
    const long = fitSignText(measure, 'X'.repeat(60), 1000);
    expect(long.px).toBe(40);
    expect(measure(long.text, long.px)).toBeLessThanOrEqual(1000);
    expect(long.text.endsWith('…')).toBe(true);
  });

  it('cuts on whole characters, never half an emoji', () => {
    const t = fitSignText(measure, '🚀'.repeat(60), 1000).text;
    expect(t).not.toMatch(/[\uD800-\uDBFF]…/);
    expect(t.endsWith('🚀…')).toBe(true);
  });
});

const signs = (r: Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>) => r.scene.findAll((n) => n.props.name === 'name-sign');

describe('<NameSign /> on the Building', () => {
  it('shows a sign only when named and not ghosted', async () => {
    const { site, design } = designFor('chicago');
    const named = await ReactThreeTestRenderer.create(<Building site={site} design={design} towerName="Prairie Point" />);
    expect(signs(named)).toHaveLength(1);
    await named.unmount();
    const unnamed = await ReactThreeTestRenderer.create(<Building site={site} design={design} towerName={null} />);
    expect(signs(unnamed)).toHaveLength(0);
    await unnamed.unmount();
    const ghost = await ReactThreeTestRenderer.create(<Building site={site} design={design} towerName="Prairie Point" ghost />);
    expect(signs(ghost)).toHaveLength(0);
  });

  it('sits over the door, facing out', async () => {
    const { site, design } = designFor('chicago', { twist: 30 });
    const r = await ReactThreeTestRenderer.create(<Building site={site} design={design} towerName="Prairie Point" />);
    const mesh = signs(r)[0].instance as THREE.Mesh;
    const { anchor, width } = entranceAnchor(design);
    expect(mesh.position.y).toBeCloseTo(4.6);
    expect(mesh.position.x).toBeCloseTo(anchor.position[0] + Math.sin(anchor.yaw) * 3.05);
    expect(mesh.position.z).toBeCloseTo(anchor.position[2] + Math.cos(anchor.yaw) * 3.05);
    expect(mesh.rotation.y).toBeCloseTo(anchor.yaw);
    expect(mesh.scale.x).toBeCloseTo(width);
    expect(mesh.scale.y).toBeCloseTo(1.4);
    expect(lotCenter(site)).toHaveLength(2);
  });
});
