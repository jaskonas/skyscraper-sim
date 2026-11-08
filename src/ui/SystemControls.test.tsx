import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useGame } from '../state/store';
import { SystemButtons, SystemReadout, ZonesButton, ZonesReadout } from './SystemControls';

const state = () => useGame.getState();

describe('system buttons and card', () => {
  beforeEach(() => {
    state().newProject();
    state().startProject('chicago', 'sandbox');
  });

  it('five buttons, one pressed at a time', () => {
    render(<SystemButtons />);
    const water = screen.getByRole('button', { name: /Water/ });
    fireEvent.click(water);
    expect(water).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: /Power/ }));
    expect(water).toHaveAttribute('aria-pressed', 'false');
    for (const name of [/Power/, /Water/, /Waste/, /Elevators/, /Air/]) expect(screen.getByRole('button', { name })).toBeInTheDocument();
  });

  it('hidden while building', () => {
    state().build();
    const { container } = render(<SystemButtons />);
    expect(container).toBeEmptyDOMElement();
  });

  it('the card follows the design', () => {
    render(<SystemReadout />);
    act(() => state().toggleSystem('water'));
    const card = screen.getByRole('region', { name: /Water/ });
    act(() => state().dispatch([{ type: 'set_parameter', id: 'floors', value: 92 }]));
    expect(within(card).getByText(/4 water zones/)).toBeInTheDocument();
  });

  it('the power card has a power-cut button that starts the generators', () => {
    render(<SystemReadout />);
    act(() => state().toggleSystem('power'));
    const cut = screen.getByRole('button', { name: /power cut/i });
    expect(cut).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(cut);
    expect(state().powerCut).toBe(true);
    expect(screen.getByText(/generators keep/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /end the power cut/i })).toHaveAttribute('aria-pressed', 'true');
    act(() => state().toggleSystem('water'));
    expect(state().powerCut).toBe(false);
  });

  it("screen readers hear the buttons' names, not their emoji", () => {
    render(<SystemButtons />);
    for (const name of ['Power', 'Water', 'Waste', 'Elevators', 'Air']) expect(screen.getByRole('button', { name })).toBeInTheDocument();
  });
});

describe('zones button and card', () => {
  beforeEach(() => {
    state().newProject();
    state().startProject('chicago', 'sandbox');
  });

  it('the Zones button toggles the view', () => {
    render(<ZonesButton />);
    const zones = screen.getByRole('button', { name: 'Zones' });
    expect(zones).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(zones);
    expect(zones).toHaveAttribute('aria-pressed', 'true');
    expect(state().zonesView).toBe(true);
  });

  it('hidden while building, and the card with it', () => {
    state().toggleZones();
    state().build();
    const { container } = render(
      <>
        <ZonesButton />
        <ZonesReadout />
      </>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('the card lists the zones top first with their fit', () => {
    act(() => state().dispatch([{ type: 'set_stack', stack: [{ use: 'office', share: 100 }] }]));
    act(() => state().toggleZones());
    render(<ZonesReadout />);
    const card = screen.getByRole('region', { name: 'Zones' });
    expect(within(card).getByText('🏢 Offices · floors 1–40 · 👍')).toBeInTheDocument();
    expect(card.textContent).toMatch(/Pays for itself in [\d.]+ years/);
  });
});
