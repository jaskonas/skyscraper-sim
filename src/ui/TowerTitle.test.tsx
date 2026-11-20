import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { analyze } from '../sim/analysis';
import { getSite } from '../sim/sites';
import { selectDesign, useGame } from '../state/store';
import { TowerTitle } from './TowerTitle';

const state = () => useGame.getState();

describe('TowerTitle', () => {
  beforeEach(() => {
    state().newProject();
    state().startProject('new-york', 'sandbox');
  });

  it('shows the name, height, floors and city once the tower is complete', () => {
    act(() => {
      state().build('Hudson Heights');
      state().skipBuild();
    });
    const design = selectDesign(state())!;
    const tip = analyze(getSite('new-york'), design).tipHeightM;
    render(<TowerTitle />);
    expect(screen.getByText('🎉 Hudson Heights')).toBeInTheDocument();
    expect(screen.getByText(`${Math.round(tip)} m · ${design.floors} floors · New York`)).toBeInTheDocument();
  });

  it('is hidden while designing, while building, and when there is no name', () => {
    const { container, rerender } = render(<TowerTitle />);
    expect(container).toBeEmptyDOMElement();
    act(() => state().build('Hudson Heights'));
    rerender(<TowerTitle />);
    expect(container).toBeEmptyDOMElement();
    act(() => {
      state().newProject();
      state().startProject('new-york', 'sandbox');
      state().build();
      state().skipBuild();
    });
    rerender(<TowerTitle />);
    expect(container).toBeEmptyDOMElement();
  });
});
