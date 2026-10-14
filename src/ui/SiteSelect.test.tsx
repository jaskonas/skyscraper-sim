import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useGame } from '../state/store';
import { SiteSelect } from './SiteSelect';

describe('SiteSelect', () => {
  beforeEach(() => useGame.getState().newProject());

  it('draws the continents on the map', () => {
    const { container } = render(<SiteSelect />);
    const land = container.querySelector('.world-land');
    expect(land).not.toBeNull();
    // A real coastline, not a placeholder: thousands of points.
    expect(land!.getAttribute('d')!.length).toBeGreaterThan(5000);
  });

  it("puts Chicago's map label on the left so it does not run into New York's", () => {
    const { container } = render(<SiteSelect />);
    const label = [...container.querySelectorAll('.world-label')].find((l) => l.textContent === 'Chicago')!;
    expect(label.getAttribute('text-anchor')).toBe('end');
  });

  it('shows all four cities', () => {
    render(<SiteSelect />);
    for (const city of ['New York', 'Tokyo', 'Chicago', 'Shanghai']) expect(screen.getByRole('region', { name: city })).toBeInTheDocument();
  });

  it('starts a sandbox project', () => {
    render(<SiteSelect />);
    fireEvent.click(screen.getByRole('button', { name: 'Sandbox in Chicago' }));
    expect(useGame.getState().project).toEqual({ siteId: 'chicago', mode: 'sandbox', briefId: null });
  });

  it('starts a challenge project with its brief', () => {
    render(<SiteSelect />);
    fireEvent.click(screen.getByRole('button', { name: /Open for Business/ }));
    expect(useGame.getState().project).toEqual({ siteId: 'tokyo', mode: 'challenge', briefId: 'tokyo-quake' });
  });
});
