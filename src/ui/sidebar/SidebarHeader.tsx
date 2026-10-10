import { useState } from 'react';
import { useCurrent } from '../../state/hooks';
import { selectCanRedo, selectCanUndo, useGame } from '../../state/store';

const PHASE_LABEL = { design: 'Designing', building: 'Building', complete: 'Complete' } as const;

export function SidebarHeader() {
  const { site, project } = useCurrent();
  const phase = useGame((s) => s.phase);
  const canUndo = useGame(selectCanUndo);
  const canRedo = useGame(selectCanRedo);
  const { undo, redo, newProject } = useGame.getState();
  const [confirming, setConfirming] = useState(false);
  return (
    <header className="sidebar-header">
      <div>
        <h1>{site.city}</h1>
        <p className="muted">
          {site.name} · {project.mode === 'challenge' ? 'Challenge' : 'Sandbox'} · {PHASE_LABEL[phase]}
        </p>
      </div>
      <div className="header-buttons">
        <button onClick={undo} disabled={!canUndo} aria-label="Undo" title="Undo">↩</button>
        <button onClick={redo} disabled={!canRedo} aria-label="Redo" title="Redo">↪</button>
        <button onClick={() => (phase === 'design' ? setConfirming(true) : newProject())} title="Back to site select">
          New project
        </button>
      </div>
      {confirming && (
        <div className="confirm" role="alertdialog" aria-label="Start a new project?">
          <span>Throw away this design and pick a new site?</span>
          <button onClick={newProject}>Yes, start over</button>
          <button onClick={() => setConfirming(false)}>Keep designing</button>
        </div>
      )}
    </header>
  );
}
