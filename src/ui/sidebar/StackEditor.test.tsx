import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COEFFICIENTS } from '../../sim/catalog/coefficients';
import { bandFloors } from '../../sim/stack';
import type { UseBand } from '../../sim/types';
import { selectDesign, useGame } from '../../state/store';
import { StackEditor } from './StackEditor';

const design = () => selectDesign(useGame.getState())!;
const spans = () => bandFloors(design().stack, design().floors).map((b) => [b.use, b.from + 1, b.to + 1]);
const setStack = (stack: UseBand[]) => {
  useGame.getState().dispatch([{ type: 'set_stack', stack }]);
  useGame.getState().endCoalesce();
};

describe('StackEditor', () => {
  beforeEach(() => {
    useGame.getState().newProject();
    useGame.getState().startProject('chicago', 'sandbox');
  });
  afterEach(() => vi.restoreAllMocks());

  it('draws one band per zone, top band first', () => {
    render(<StackEditor />);
    const bands = within(screen.getByRole('list', { name: 'Zones, top first' })).getAllByRole('button');
    expect(bands.map((b) => b.textContent)).toEqual(['🏢 Offices, floors 5–40 👍', '🛍️ Shops, floors 1–4 👍']);
    expect(bands[0]).toHaveAccessibleName('Offices, floors 5–40, good fit');
  });

  it('the boundary slider moves one floor per arrow key', () => {
    render(<StackEditor />);
    const line = screen.getByRole('slider', { name: 'Line between Shops and Offices' });
    expect(line).toHaveAttribute('aria-valuenow', '5');
    fireEvent.keyDown(line, { key: 'ArrowUp' });
    expect(spans()).toEqual([['retail', 1, 5], ['office', 6, 40]]);
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Line between Shops and Offices' }), { key: 'ArrowDown' });
    expect(spans()).toEqual([['retail', 1, 4], ['office', 5, 40]]);
  });

  it('a whole drag is one undo step', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top: 0, bottom: 400, height: 400, left: 0, right: 40, width: 40, x: 0, y: 0, toJSON: () => ({}) } as DOMRect);
    render(<StackEditor />);
    const before = design().stack;
    const line = screen.getByRole('slider', { name: 'Line between Shops and Offices' });
    fireEvent.pointerDown(line, { pointerId: 1, clientY: 360, buttons: 1 });
    fireEvent.pointerMove(line, { pointerId: 1, clientY: 300, buttons: 1 });
    fireEvent.pointerMove(line, { pointerId: 1, clientY: 250, buttons: 1 });
    fireEvent.pointerMove(line, { pointerId: 1, clientY: 200, buttons: 1 });
    fireEvent.pointerUp(line, { pointerId: 1, clientY: 200 });
    expect(spans()).toEqual([['retail', 1, 20], ['office', 21, 40]]);
    useGame.getState().undo();
    expect(design().stack).toEqual(before);
  });

  it('select, change use, move, remove', () => {
    render(<StackEditor />);
    fireEvent.click(screen.getByRole('button', { name: /^Offices, floors 5–40/ }));
    const panel = screen.getByRole('region', { name: 'Offices zone' });
    fireEvent.click(within(panel).getByRole('button', { name: 'Homes' }));
    expect(spans()).toEqual([['retail', 1, 4], ['residential', 5, 40]]);
    fireEvent.click(screen.getByRole('button', { name: 'Move down' }));
    expect(spans()).toEqual([['residential', 1, 36], ['retail', 37, 40]]);
    expect(screen.getByRole('button', { name: 'Move down' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Remove zone' }));
    expect(spans()).toEqual([['retail', 1, 40]]);
    expect(screen.getByRole('button', { name: 'Remove zone' })).toBeDisabled();
  });

  it('add zone splits the selected band', () => {
    setStack([{ use: 'office', share: 100 }]);
    render(<StackEditor />);
    fireEvent.click(screen.getByRole('button', { name: /^Offices, floors 1–40/ }));
    fireEvent.click(screen.getByRole('button', { name: '+ Add zone' }));
    expect(spans()).toEqual([['office', 1, 20], ['retail', 21, 40]]);
    act(() => useGame.getState().selectBand(null));
    fireEvent.click(screen.getByRole('button', { name: '+ Add zone' }));
    // Top band (shops) splits; the new half skips shops (itself) → offices.
    expect(spans()).toEqual([['office', 1, 20], ['retail', 21, 30], ['office', 31, 40]]);
    act(() => setStack(['retail', 'office', 'hotel', 'residential', 'office', 'retail'].map((use) => ({ use, share: 10 }) as UseBand)));
    expect(screen.getByRole('button', { name: '+ Add zone' })).toBeDisabled();
  });

  it('selection clamps after remove', () => {
    setStack([{ use: 'retail', share: 10 }, { use: 'office', share: 60 }, { use: 'residential', share: 30 }]);
    render(<StackEditor />);
    fireEvent.click(screen.getByRole('button', { name: /^Homes/ }));
    expect(useGame.getState().selectedBand).toBe(2);
    fireEvent.click(screen.getByRole('button', { name: 'Remove zone' }));
    expect(useGame.getState().selectedBand).toBe(1);
  });

  it('money card', () => {
    const { unmount } = render(<StackEditor />);
    const money = screen.getByRole('region', { name: 'Money' });
    expect(money.textContent).toMatch(/Earns about \$\d+M a year\./);
    expect(money.textContent).toMatch(/Pays for itself in \d+(\.\d)? years\./);
    unmount();
    const rent = COEFFICIENTS.zones.rent;
    const saved = { ...rent };
    Object.assign(rent, { office: 0, residential: 0, hotel: 0, retail: 0 });
    try {
      setStack([{ use: 'office', share: 100 }]);
      render(<StackEditor />);
      expect(screen.getByRole('region', { name: 'Money' }).textContent).toContain('It never pays for itself.');
    } finally {
      Object.assign(rent, saved);
    }
  });

  it('a new project clears the selection', () => {
    useGame.getState().selectBand(1);
    useGame.getState().newProject();
    expect(useGame.getState().selectedBand).toBeNull();
  });

  it('a drag ends when the pointer capture is lost, and a hover never moves the line', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top: 0, bottom: 400, height: 400, left: 0, right: 40, width: 40, x: 0, y: 0, toJSON: () => ({}) } as DOMRect);
    render(<StackEditor />);
    const before = design().stack;
    const line = screen.getByRole('slider', { name: 'Line between Shops and Offices' });
    fireEvent.pointerDown(line, { pointerId: 1, clientY: 360, buttons: 1 });
    fireEvent.pointerMove(line, { pointerId: 1, clientY: 360, buttons: 0 });
    expect(design().stack).toEqual(before);
    fireEvent.lostPointerCapture(line, { pointerId: 1 });
    fireEvent.pointerMove(line, { pointerId: 1, clientY: 200, buttons: 1 });
    expect(design().stack).toEqual(before);
  });

  it('changing a zone so it merges keeps it selected', () => {
    setStack([{ use: 'retail', share: 10 }, { use: 'office', share: 60 }, { use: 'residential', share: 30 }]);
    render(<StackEditor />);
    fireEvent.click(screen.getByRole('button', { name: /^Homes/ }));
    fireEvent.click(within(screen.getByRole('region', { name: 'Homes zone' })).getByRole('button', { name: 'Offices' }));
    expect(useGame.getState().selectedBand).toBe(1);
    expect(screen.getByRole('region', { name: 'Offices zone' })).toBeInTheDocument();
  });

  it('moving a zone past a same-use pair keeps it selected', () => {
    setStack([{ use: 'office', share: 25 }, { use: 'retail', share: 25 }, { use: 'office', share: 25 }, { use: 'hotel', share: 25 }]);
    render(<StackEditor />);
    fireEvent.click(screen.getByRole('button', { name: /^Shops/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Move up' }));
    expect(design().stack.map((b) => b.use)).toEqual(['office', 'retail', 'hotel']);
    expect(useGame.getState().selectedBand).toBe(1);
    expect(screen.getByRole('region', { name: 'Shops zone' })).toBeInTheDocument();
  });

  it('undo and redo clear the selection', () => {
    render(<StackEditor />);
    fireEvent.click(screen.getByRole('button', { name: '+ Add zone' }));
    expect(useGame.getState().selectedBand).not.toBeNull();
    act(() => useGame.getState().undo());
    expect(useGame.getState().selectedBand).toBeNull();
    act(() => useGame.getState().selectBand(0));
    act(() => useGame.getState().redo());
    expect(useGame.getState().selectedBand).toBeNull();
  });
});
