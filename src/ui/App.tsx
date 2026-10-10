import { useGame } from '../state/store';
import { GameScreen } from './GameScreen';
import { SiteSelect } from './SiteSelect';

export function App() {
  const hasProject = useGame((s) => s.project !== null);
  return hasProject ? <GameScreen /> : <SiteSelect />;
}
