import { useGame } from '../state/store';

/** Switches between full detail (recessed glass, reflections, shadows) and the plain look, for slower computers. */
export function FacadeDetailToggle() {
  const detail = useGame((s) => s.facadeDetail);
  const setFacadeDetail = useGame((s) => s.setFacadeDetail);
  return (
    <button
      title="Recessed glass, reflections and shadows. Simple is faster on slow computers."
      onClick={() => setFacadeDetail(detail === 'high' ? 'simple' : 'high')}
    >
      ✨ Detail: {detail === 'high' ? 'High' : 'Simple'}
    </button>
  );
}
