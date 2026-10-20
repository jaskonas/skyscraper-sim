import { useGame } from '../state/store';

/** Switches the facade between full detail (rooms, recess, reflections) and the plain look, for slower computers. */
export function FacadeDetailToggle() {
  const detail = useGame((s) => s.facadeDetail);
  const setFacadeDetail = useGame((s) => s.setFacadeDetail);
  return (
    <button
      title="Rooms behind the windows, recessed glass and reflections. Simple is faster on slow computers."
      onClick={() => setFacadeDetail(detail === 'high' ? 'simple' : 'high')}
    >
      ✨ Detail: {detail === 'high' ? 'High' : 'Simple'}
    </button>
  );
}
