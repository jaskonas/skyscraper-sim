import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import * as crowns from '../../scene/crownParts';
import { CrownIcon } from './icons';

describe('crown gallery icons', () => {
  it('draws the simple crowns, so the gallery stays quick', () => {
    const spy = vi.spyOn(crowns, 'crownParts');
    const { container } = render(<CrownIcon crown="spire" palette={{ body: '#888888', accent: '#444444', glass: '#335577' }} />);
    expect(container.querySelectorAll('path').length).toBeGreaterThan(0);
    expect(spy).toHaveBeenCalled();
    for (const call of spy.mock.calls) expect(call[1] ?? 'simple').toBe('simple');
    spy.mockRestore();
  });
});
