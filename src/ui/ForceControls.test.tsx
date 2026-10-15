import { fireEvent, render, screen, within } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { analyze } from '../sim/analysis';
import { getSite } from '../sim/sites';
import { selectDesign, useGame } from '../state/store';
import { ForceBanner, ForceButtons, ForceReadout } from './ForceControls';

describe('force controls', () => {
  beforeEach(() => {
    useGame.getState().newProject();
    useGame.getState().startProject('tokyo', 'sandbox');
  });

  it('switches between Wind, Earthquake and nothing, one at a time', () => {
    render(<ForceButtons />);
    const wind = screen.getByRole('button', { name: /Wind/ });
    const quake = screen.getByRole('button', { name: /Earthquake/ });
    expect(wind).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(wind);
    expect(wind).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(quake);
    expect(wind).toHaveAttribute('aria-pressed', 'false');
    expect(quake).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(quake);
    expect(useGame.getState().force).toBe('none');
  });

  it('hides the buttons while the tower is being built', () => {
    useGame.getState().build();
    render(<ForceButtons />);
    expect(screen.queryByRole('button', { name: /Wind/ })).not.toBeInTheDocument();
  });

  it("shows the wind card with this tower's numbers, and updates it when the design changes", () => {
    useGame.getState().toggleForce('wind');
    render(<ForceReadout />);
    const card = screen.getByRole('region', { name: 'Wind' });
    expect(within(card).getByText(/48 m\/s/)).toBeInTheDocument();
    expect(within(card).getByText('Sway shown 50× bigger')).toBeInTheDocument();
    expect(within(card).queryByText(/tuned mass damper/)).not.toBeInTheDocument();
    act(() => {
      useGame.getState().dispatch([{ type: 'set_parameter', id: 'damping', value: 'tmd' }]);
    });
    expect(within(card).getByText(/The tuned mass damper cuts the sway/)).toBeInTheDocument();
  });

  it('shows the earthquake card, and a banner when the tower would fail', () => {
    useGame.getState().toggleForce('quake');
    act(() => {
      // A squat, heavy, stiff concrete box with a rooftop pool: it fails Tokyo's design earthquake.
      useGame.getState().dispatch([
        { type: 'set_parameter', id: 'floors', value: 10 },
        { type: 'set_parameter', id: 'shape', value: 'square' },
        { type: 'set_parameter', id: 'setbacks', value: 'none' },
        { type: 'set_parameter', id: 'material', value: 'concrete' },
        { type: 'set_parameter', id: 'system', value: 'rigid-frame' },
        { type: 'set_parameter', id: 'facade', value: 'masonry' },
        { type: 'set_parameter', id: 'baseIsolation', value: false },
        { type: 'set_parameter', id: 'damping', value: 'none' },
        { type: 'add_amenity', id: 'pool' },
      ]);
    });
    render(
      <>
        <ForceReadout />
        <ForceBanner />
      </>,
    );
    const card = screen.getByRole('region', { name: 'Earthquake' });
    expect(within(card).getByText(/0.45 g of ground shaking/)).toBeInTheDocument();
    expect(analyze(getSite('tokyo'), selectDesign(useGame.getState())!).seismic.outcome).toBe('fails');
    expect(screen.getByRole('alert')).toHaveTextContent('Would fail in this earthquake');
  });

  it('shows nothing when no force is on, or while building', () => {
    const { container } = render(
      <>
        <ForceReadout />
        <ForceBanner />
      </>,
    );
    expect(container).toBeEmptyDOMElement();
    useGame.getState().toggleForce('wind');
    act(() => useGame.getState().build());
    expect(container).toBeEmptyDOMElement();
  });
});
