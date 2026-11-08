import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useGame } from '../../state/store';
import { Gauges } from './Gauges';

describe('Gauges', () => {
  beforeEach(() => {
    useGame.getState().newProject();
    useGame.getState().startProject('chicago', 'sandbox');
  });

  it('shows the payback next to the build cost', () => {
    render(<Gauges />);
    expect(screen.getByRole('region', { name: 'Live estimates' }).textContent).toMatch(/Pays for itself in [\d.]+ years/);
  });
});
