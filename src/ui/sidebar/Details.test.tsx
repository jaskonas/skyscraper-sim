import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { CROWN_IDS } from '../../sim/catalog/ids';
import { selectDesign, useGame } from '../../state/store';
import { Sidebar } from './Sidebar';

const design = () => selectDesign(useGame.getState())!;

describe('crown gallery and details', () => {
  beforeEach(() => {
    useGame.getState().newProject();
    useGame.getState().startProject('chicago', 'sandbox');
  });

  it('shows all 28 crowns in five families, with the style default starred', () => {
    render(<Sidebar />);
    const gallery = screen.getByRole('group', { name: 'Crown' });
    expect(within(gallery).getAllByRole('button')).toHaveLength(CROWN_IDS.length);
    expect(within(gallery).getByText('Around the World')).toBeInTheDocument();
    expect(within(gallery).getByRole('button', { name: 'Flat roof (style default)' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('picking a crown changes the design, marks the style modified, and undoes in one step', () => {
    render(<Sidebar />);
    fireEvent.click(screen.getByRole('button', { name: 'Pagoda tiers' }));
    expect(design().crown).toBe('pagoda');
    expect(screen.getByText(/International Style \(modified\)/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(design().crown).toBe('flat');
  });

  it('a style preset moves the star and the selection to its own crown', () => {
    render(<Sidebar />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Style' }), { target: { value: 'art-deco' } });
    const gallery = screen.getByRole('group', { name: 'Crown' });
    expect(within(gallery).getByRole('button', { name: 'Deco arches and needle (style default)' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('window and spandrel galleries set the painted facade', () => {
    render(<Sidebar />);
    fireEvent.click(within(screen.getByRole('group', { name: 'Windows' })).getByRole('button', { name: 'Chicago windows' }));
    fireEvent.click(within(screen.getByRole('group', { name: 'Spandrels' })).getByRole('button', { name: 'Deco chevrons' }));
    expect(design().windowPattern).toBe('chicago');
    expect(design().spandrel).toBe('chevron');
  });

  it('toggles ornaments on and off', () => {
    render(<Sidebar />);
    const ornaments = screen.getByRole('group', { name: 'Ornaments' });
    fireEvent.click(within(ornaments).getByRole('button', { name: 'Gargoyles' }));
    expect(design().ornaments).toContain('gargoyles');
    fireEvent.click(within(ornaments).getByRole('button', { name: 'Gargoyles' }));
    expect(design().ornaments).not.toContain('gargoyles');
    expect(within(ornaments).getByRole('button', { name: 'I-beam mullions (style default)' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('dims decorative ornaments while the amount is None', () => {
    render(<Sidebar />);
    const ornaments = screen.getByRole('group', { name: 'Ornaments' });
    fireEvent.click(within(ornaments).getByRole('button', { name: 'Gargoyles' }));
    expect(within(ornaments).getByRole('button', { name: 'Gargoyles' })).toHaveClass('dimmed');
    fireEvent.change(screen.getByRole('combobox', { name: 'Ornament amount' }), { target: { value: 'high' } });
    expect(within(ornaments).getByRole('button', { name: 'Gargoyles' })).not.toHaveClass('dimmed');
  });

  it('describes a crown or ornament on keyboard focus, and to screen readers', () => {
    render(<Sidebar />);
    const pagoda = screen.getByRole('button', { name: 'Pagoda tiers' });
    expect(pagoda).toHaveAccessibleDescription(/Seen on Jin Mao Tower/);
    fireEvent.focus(pagoda);
    expect(within(screen.getByRole('group', { name: 'Crown' })).getByRole('status')).toHaveTextContent(/Seen on Jin Mao Tower/);
    const gargoyles = screen.getByRole('button', { name: 'Gargoyles' });
    expect(gargoyles).toHaveAccessibleDescription(/Seen on Chrysler Building/);
    fireEvent.focus(gargoyles);
    expect(within(screen.getByRole('group', { name: 'Ornaments' })).getByRole('status')).toHaveTextContent(/Steel eagle heads/);
  });

  it('notes antennas that do not count toward official height', () => {
    render(<Sidebar />);
    fireEvent.click(screen.getByRole('button', { name: 'Twin antennas' }));
    expect(screen.getByText(/\+24 m antennas/)).toBeInTheDocument();
  });
});
