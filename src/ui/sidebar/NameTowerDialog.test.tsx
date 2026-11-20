import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { suggestTowerName } from '../../sim/catalog/towerNames';
import { SITES } from '../../sim/sites';
import { selectDesign, useGame } from '../../state/store';
import { Sidebar } from './Sidebar';

const state = () => useGame.getState();
const design = () => selectDesign(state())!;
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const box = () => screen.getByRole('textbox', { name: 'Tower name' }) as HTMLInputElement;
const start = () => screen.getByRole('button', { name: 'Start building 🏗️' }) as HTMLButtonElement;

describe('Name your tower', () => {
  beforeEach(() => {
    state().newProject();
    state().startProject('chicago', 'sandbox');
    render(<Sidebar />);
  });

  it('Build it! asks for a name first', () => {
    click('Build it!');
    expect(screen.getByRole('dialog', { name: 'Name your tower' })).toBeInTheDocument();
    expect(screen.getByText('Every great skyscraper has a name.')).toBeInTheDocument();
    expect(box().value).toBe('');
    expect(box().placeholder).toBe('Type a name…');
    expect(document.activeElement).toBe(box());
    expect(state().phase).toBe('design');
  });

  it('Enter starts building with the typed name', () => {
    click('Build it!');
    fireEvent.change(box(), { target: { value: 'Prairie Point' } });
    fireEvent.submit(box().form!);
    expect(state().phase).toBe('building');
    expect(state().project?.towerName).toBe('Prairie Point');
    expect(screen.getByText('Building Prairie Point')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Prairie Point');
    expect(screen.getByText(/^Chicago · /)).toBeInTheDocument();
  });

  it('Start building waits for a name', () => {
    click('Build it!');
    expect(start().disabled).toBe(true);
    fireEvent.change(box(), { target: { value: '   ' } });
    expect(start().disabled).toBe(true);
    fireEvent.submit(box().form!);
    expect(state().phase).toBe('design');
  });

  it('tapping an idea fills the box, and it can still be edited', () => {
    click('Build it!');
    const idea = suggestTowerName(SITES.chicago, design(), 0);
    click(idea);
    expect(box().value).toBe(idea);
    expect(document.activeElement).toBe(box());
    fireEvent.change(box(), { target: { value: idea + ' Two' } });
    click('Start building 🏗️');
    expect(state().project?.towerName).toBe(idea + ' Two');
  });

  it('🎲 More ideas shows three new ideas and leaves the box alone', () => {
    click('Build it!');
    fireEvent.change(box(), { target: { value: 'Mine' } });
    const at = (n: number) => suggestTowerName(SITES.chicago, design(), n);
    for (const n of [0, 1, 2]) expect(screen.getByRole('button', { name: at(n) })).toBeInTheDocument();
    click('🎲 More ideas');
    for (const n of [3, 4, 5]) expect(screen.getByRole('button', { name: at(n) })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: at(0) })).not.toBeInTheDocument();
    expect(box().value).toBe('Mine');
  });

  it('Escape and Back return to designing', () => {
    click('Build it!');
    fireEvent.keyDown(box(), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(state().phase).toBe('design');
    click('Build it!');
    click('Back to designing');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(state().phase).toBe('design');
  });

  it('typing in the box does not undo the design', () => {
    act(() => {
      state().dispatch([{ type: 'set_parameter', id: 'floors', value: 50 }]);
    });
    const index = state().historyIndex;
    click('Build it!');
    let reached = 0;
    const spy = () => reached++;
    window.addEventListener('keydown', spy);
    fireEvent.keyDown(box(), { key: 'z', ctrlKey: true });
    fireEvent.keyDown(box(), { key: 'z', metaKey: true });
    window.removeEventListener('keydown', spy);
    expect(reached).toBe(0);
    expect(state().historyIndex).toBe(index);
  });

  it('going back keeps the typed name for next time', () => {
    click('Build it!');
    fireEvent.change(box(), { target: { value: 'My Long Tower Name' } });
    click('Back to designing');
    click('Build it!');
    expect(box().value).toBe('My Long Tower Name');
  });

  it('the box stops at 40 characters', () => {
    click('Build it!');
    fireEvent.change(box(), { target: { value: 'x'.repeat(60) } });
    expect(box().value).toHaveLength(40);
    expect(screen.getByText('0 left')).toBeInTheDocument();
  });

  it('pressing Build it! again while asking does not build', () => {
    click('Build it!');
    click('Build it!');
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(state().phase).toBe('design');
  });
});
