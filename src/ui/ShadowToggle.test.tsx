import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { selectShadowsOn, useGame } from '../state/store';
import { ShadowToggle } from './ShadowToggle';

const state = () => useGame.getState();

describe('shadow setting', () => {
  beforeEach(() => {
    state().newProject();
    state().startProject('chicago', 'sandbox');
    state().setShadows(true);
    state().setFacadeDetail('high');
  });

  it('starts on, and turns off and back on', () => {
    render(<ShadowToggle />);
    const on = screen.getByRole('button', { name: /Shadows: On/ });
    expect(on).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(on);
    expect(state().shadows).toBe(false);
    expect(screen.getByRole('button', { name: /Shadows: Off/ })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: /Shadows: Off/ }));
    expect(state().shadows).toBe(true);
  });

  it('is a view setting: kept for a new project, never in the design history', () => {
    const history = state().history;
    state().setShadows(false);
    expect(state().history).toBe(history);
    state().newProject();
    expect(state().shadows).toBe(false);
  });

  it('Detail: Simple turns shadows off and greys the button; High brings the choice back', () => {
    render(<ShadowToggle />);
    act(() => state().setFacadeDetail('simple'));
    expect(screen.getByRole('button', { name: /Shadows/ })).toBeDisabled();
    expect(selectShadowsOn(state())).toBe(false);
    expect(state().shadows).toBe(true);
    act(() => state().setFacadeDetail('high'));
    expect(selectShadowsOn(state())).toBe(true);
    expect(screen.getByRole('button', { name: /Shadows/ })).toBeEnabled();
  });

  it('casts no sun shadows at night', () => {
    state().setTimeOfDay('night');
    expect(selectShadowsOn(state())).toBe(false);
  });
});
