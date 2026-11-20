import { useState } from 'react';
import { useCurrent } from '../../state/hooks';
import { NameTowerDialog } from './NameTowerDialog';

export function BuildBar() {
  const { analysis } = useCurrent();
  const [naming, setNaming] = useState(false);
  const structuralFail = analysis.checks.some(
    (c) => (c.id === 'windStrength' || c.id === 'seismic' || c.id === 'foundation') && c.status === 'fail',
  );
  return (
    <footer className="build-bar">
      {structuralFail && <p className="warning">⚠ This design would fail its structural engineering assessment.</p>}
      <button className="build-button" onClick={() => setNaming(true)}>
        Build it!
      </button>
      <p className="muted">Building locks the design.</p>
      {naming && <NameTowerDialog onClose={() => setNaming(false)} />}
    </footer>
  );
}
