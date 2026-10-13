import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGame } from '../state/store';
import { DetailInset } from './DetailInset';

// WebGL is not available in jsdom; the close-up's 3D contents have their own tests.
vi.mock('../scene/detail/DetailCanvas', () => ({ DetailCanvas: ({ view }: { view: string }) => <div data-testid="detail-canvas">{view}</div> }));

describe('<DetailInset />', () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.innerWidth = 1366;
    useGame.getState().newProject();
    useGame.getState().startProject('chicago', 'sandbox');
  });
  afterEach(() => sessionStorage.clear());

  it('switches between Facade, Corner and Base, with a caption for each', () => {
    render(<DetailInset />);
    const inset = screen.getByRole('region', { name: 'Close-up' });
    expect(within(inset).getByText(/^Floor \d+ · /)).toBeInTheDocument();
    fireEvent.click(within(inset).getByRole('button', { name: 'Corner' }));
    expect(within(inset).getByRole('button', { name: 'Corner' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(inset).getByText(/^Roof corner · /)).toBeInTheDocument();
    fireEvent.click(within(inset).getByRole('button', { name: 'Base' }));
    expect(within(inset).getByText(/^Ground floor · /)).toBeInTheDocument();
    expect(screen.getByTestId('detail-canvas')).toHaveTextContent('base');
  });

  it('minimizes to a small button and remembers it for the session', () => {
    const { unmount } = render(<DetailInset />);
    fireEvent.click(screen.getByRole('button', { name: 'Minimize close-up' }));
    expect(screen.queryByRole('region', { name: 'Close-up' })).not.toBeInTheDocument();
    unmount();
    render(<DetailInset />);
    fireEvent.click(screen.getByRole('button', { name: /Close-up/ }));
    expect(screen.getByRole('region', { name: 'Close-up' })).toBeInTheDocument();
  });

  it('starts minimized on a narrow screen', () => {
    window.innerWidth = 800;
    render(<DetailInset />);
    expect(screen.queryByRole('region', { name: 'Close-up' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Close-up/ })).toBeInTheDocument();
  });

  it('keeps working after the design is built', () => {
    useGame.getState().build();
    render(<DetailInset />);
    expect(screen.getByRole('region', { name: 'Close-up' })).toBeInTheDocument();
  });

  it('still works when session storage is blocked', () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(<DetailInset />);
    expect(screen.getByRole('region', { name: 'Close-up' })).toBeInTheDocument();
    get.mockRestore();
    set.mockRestore();
  });
});
