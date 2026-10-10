import { useCurrent } from '../../state/hooks';
import { useGame } from '../../state/store';

export function BuildBar() {
  const { analysis } = useCurrent();
  const build = useGame((s) => s.build);
  const structuralFail = analysis.checks.some(
    (c) => (c.id === 'windStrength' || c.id === 'seismic' || c.id === 'foundation') && c.status === 'fail',
  );
  return (
    <footer className="build-bar">
      {structuralFail && <p className="warning">⚠ This design would fail its structural engineering assessment.</p>}
      <button className="build-button" onClick={build}>
        Build it!
      </button>
      <p className="muted">Building locks the design.</p>
    </footer>
  );
}
