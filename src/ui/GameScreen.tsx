import { Scene } from '../scene/Scene';
import { Sidebar } from './sidebar/Sidebar';

export function GameScreen() {
  return (
    <div className="game">
      <Sidebar />
      <main className="viewport">
        <Scene />
      </main>
    </div>
  );
}
