import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useGame } from '../state/store';
import { SiteSelect } from './SiteSelect';

describe('SiteSelect', () => {
  beforeEach(() => useGame.getState().newProject());

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
