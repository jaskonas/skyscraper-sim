import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { suggestTowerName } from '../../sim/catalog/towerNames';
import { TOWER_NAME_MAX, cleanTowerName } from '../../sim/towerName';
import { useCurrent } from '../../state/hooks';
import { useGame } from '../../state/store';

const IDEAS = 3;

/**
 * Asked when Build it! is pressed: he types the tower's name, or taps one of three ideas and edits it. The box starts
 * from `draft` (what he typed last time), and every change is reported back so going back to designing keeps it.
 */
export function NameTowerDialog({ draft, onDraft, onClose }: { draft: string; onDraft: (name: string) => void; onClose: () => void }) {
  const { site, design } = useCurrent();
  const [value, setValue] = useState(draft);
  const [offset, setOffset] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const ready = cleanTowerName(value) !== '';
  const used = Array.from(value).length;

  const take = (text: string) => {
    const next = Array.from(text).slice(0, TOWER_NAME_MAX).join('');
    setValue(next);
    onDraft(next);
  };
  const pick = (idea: string) => {
    take(idea);
    const el = input.current;
    if (el) {
      el.focus();
      requestAnimationFrame(() => el.setSelectionRange(el.value.length, el.value.length));
    }
  };

  return createPortal(
    <div className="name-backdrop">
      <form
        className="card name-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="name-dialog-title"
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Escape') onClose();
        }}
        onSubmit={(e) => {
          e.preventDefault();
          if (ready) useGame.getState().build(value);
        }}
      >
        <h2 id="name-dialog-title">Name your tower</h2>
        <p className="muted">Every great skyscraper has a name.</p>
        <div className="name-field">
          <input
            ref={input}
            type="text"
            aria-label="Tower name"
            placeholder="Type a name…"
            value={value}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => take(e.target.value)}
          />
          <span className="muted name-count">{TOWER_NAME_MAX - used} left</span>
        </div>
        <div className="name-ideas">
          <span className="muted">Need an idea?</span>
          {Array.from({ length: IDEAS }, (_, i) => {
            const idea = suggestTowerName(site, design, offset + i);
            return (
              <button type="button" key={idea} className="name-idea" onClick={() => pick(idea)}>
                {idea}
              </button>
            );
          })}
          <button type="button" onClick={() => setOffset(offset + IDEAS)}>
            🎲 More ideas
          </button>
        </div>
        <div className="name-actions">
          <button type="button" onClick={onClose}>
            Back to designing
          </button>
          <button type="submit" className="build-button" disabled={!ready}>
            Start building 🏗️
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
