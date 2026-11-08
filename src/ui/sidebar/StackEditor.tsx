import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { FIT_EMOJI, USE_LABEL, type Fit } from '../../sim/catalog/zones';
import { formatMoney } from '../../sim/format';
import { MAX_BANDS, bandAt, bandMiddle, moveBand, moveBoundary, removeBand, setBandUse, splitBand } from '../../sim/stack';
import { USE_ORDER, type UseBand } from '../../sim/types';
import { useCurrent } from '../../state/hooks';
import { useGame } from '../../state/store';

const FIT_WORDS: Record<Fit, string> = { good: 'good fit', ok: 'so-so fit', bad: 'poor fit' };
const DRAG_KEY = 'stack-drag';

/** Paint the stack: a tower strip with draggable lines between zones, the zones listed top first, and the money they make. */
export function StackEditor() {
  const { design, analysis } = useCurrent();
  const dispatch = useGame((s) => s.dispatch);
  const endCoalesce = useGame((s) => s.endCoalesce);
  const selectBand = useGame((s) => s.selectBand);
  const selectedBand = useGame((s) => s.selectedBand);
  const stripRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<number | null>(null);

  const { stack, floors } = design;
  const bands = analysis.value.bands;
  const selected = bands.find((b) => b.index === selectedBand) ?? null;
  const setStack = (next: UseBand[], coalesceKey?: string) => dispatch([{ type: 'set_stack', stack: next }], { coalesceKey });

  const moveLine = (boundary: number, toFloor: number, coalesceKey?: string) => setStack(moveBoundary(stack, floors, boundary, toFloor), coalesceKey);
  const floorAt = (clientY: number) => {
    const r = stripRef.current?.getBoundingClientRect();
    if (!r || r.height <= 0) return null;
    return Math.round(((r.bottom - clientY) / r.height) * floors);
  };
  const onKey = (boundary: number, start: number) => (e: KeyboardEvent) => {
    const step = e.key === 'ArrowUp' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowDown' || e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    moveLine(boundary, start + step);
  };
  const onPointerDown = (boundary: number) => (e: PointerEvent<HTMLDivElement>) => {
    endCoalesce();
    dragging.current = boundary;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging.current === null || e.buttons === 0) return;
    const floor = floorAt(e.clientY);
    if (floor !== null) moveLine(dragging.current, floor, DRAG_KEY);
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging.current === null) return;
    dragging.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    endCoalesce();
  };

  /** Apply an edit and keep the edited zone selected, wherever merging moved it: `middle` is where it now sits (percent up). */
  const editAndFollow = (next: UseBand[], middle: number) => {
    setStack(next);
    selectBand(bandAt(next, middle));
  };

  const addZone = () => {
    const target = selected?.index ?? stack.length - 1;
    const above = stack[target + 1]?.use;
    const use = USE_ORDER.find((u) => u !== stack[target].use && u !== above)!;
    editAndFollow(splitBand(stack, target, use), bandMiddle(stack, target) + stack[target].share / 4);
  };
  const moveSelected = (dir: -1 | 1) => {
    const i = selected!.index;
    const passed = stack[i + dir].share;
    editAndFollow(moveBand(stack, i, dir), bandMiddle(stack, i) + dir * passed);
  };

  const years = analysis.value.paybackYears;
  return (
    <div className="stack-editor">
      <p className="help">Paint your tower: drag the lines to move zones, tap a zone to change it.</p>
      <div className="stack-body">
        <div className="stack-strip" ref={stripRef}>
          {bands.map((b) => (
            <div
              key={`band-${b.index}`}
              className={`stack-band${b.index === selected?.index ? ' selected' : ''}`}
              style={{ bottom: `${(b.from / floors) * 100}%`, height: `${((b.to - b.from + 1) / floors) * 100}%`, background: USE_LABEL[b.use].color }}
              onClick={() => selectBand(b.index)}
            />
          ))}
          {bands.slice(0, -1).map((lower, k) => {
            const upper = bands[k + 1];
            return (
              <div
                key={`line-${k}`}
                className="stack-line"
                role="slider"
                tabIndex={0}
                aria-label={`Line between ${USE_LABEL[lower.use].label} and ${USE_LABEL[upper.use].label}`}
                aria-valuemin={lower.from + 2}
                aria-valuemax={upper.to + 1}
                aria-valuenow={upper.from + 1}
                aria-valuetext={`${USE_LABEL[upper.use].label} start on floor ${upper.from + 1}`}
                style={{ bottom: `${(upper.from / floors) * 100}%` }}
                onKeyDown={onKey(k, upper.from)}
                onKeyUp={endCoalesce}
                onPointerDown={onPointerDown(k)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onLostPointerCapture={onPointerUp}
              />
            );
          })}
        </div>
        <ul className="stack-list" aria-label="Zones, top first">
          {[...bands].reverse().map((b) => (
            <li key={b.index}>
              <button
                className={b.index === selected?.index ? 'selected' : undefined}
                aria-pressed={b.index === selected?.index}
                aria-label={`${USE_LABEL[b.use].label}, floors ${b.from + 1}–${b.to + 1}, ${FIT_WORDS[b.fit]}`}
                style={{ borderLeftColor: USE_LABEL[b.use].color }}
                onClick={() => selectBand(b.index === selected?.index ? null : b.index)}
              >
                {USE_LABEL[b.use].icon} {USE_LABEL[b.use].label}, floors {b.from + 1}–{b.to + 1} {FIT_EMOJI[b.fit]}
              </button>
            </li>
          ))}
        </ul>
      </div>
      {selected && (
        <section className="stack-panel" aria-label={`${USE_LABEL[selected.use].label} zone`}>
          <div className="stack-uses" role="group" aria-label="Use">
            {USE_ORDER.map((u) => (
              <button key={u} aria-pressed={selected.use === u} onClick={() => editAndFollow(setBandUse(stack, selected.index, u), bandMiddle(stack, selected.index))}>
                <span aria-hidden="true">{USE_LABEL[u].icon} </span>
                {USE_LABEL[u].label}
              </button>
            ))}
          </div>
          <div className="stack-actions">
            <button
              disabled={selected.index >= stack.length - 1}
              onClick={() => moveSelected(1)}
            >
              <span aria-hidden="true">▲ </span>Move up
            </button>
            <button
              disabled={selected.index <= 0}
              onClick={() => moveSelected(-1)}
            >
              <span aria-hidden="true">▼ </span>Move down
            </button>
            <button
              disabled={stack.length <= 1}
              onClick={() => {
                setStack(removeBand(stack, selected.index));
                selectBand(Math.max(0, selected.index - 1));
              }}
            >
              Remove zone
            </button>
          </div>
          <p>
            <span aria-hidden="true">{FIT_EMOJI[selected.fit]} </span>
            {selected.reason}
          </p>
          <p className="muted">Earns about {formatMoney(selected.incomePerYear)} a year.</p>
        </section>
      )}
      <button className="stack-add" disabled={stack.length >= MAX_BANDS} onClick={addZone}>
        + Add zone
      </button>
      <section className="stack-money" aria-label="Money">
        <p>Earns about {formatMoney(analysis.value.incomePerYear)} a year.</p>
        <p>{Number.isFinite(years) ? `Pays for itself in ${years} years.` : 'It never pays for itself.'}</p>
      </section>
    </div>
  );
}
