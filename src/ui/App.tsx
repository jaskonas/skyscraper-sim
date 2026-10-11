import { useLayoutEffect } from 'react';
import { useGame } from '../state/store';
import { GameScreen } from './GameScreen';
import { SiteSelect } from './SiteSelect';

export function App() {
  const hasProject = useGame((s) => s.project !== null);
  // The site list scrolls; without this the next screen would open wherever the list was scrolled to.
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [hasProject]);
  return hasProject ? <GameScreen /> : <SiteSelect />;
}
