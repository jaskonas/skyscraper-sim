import { useGame } from '../../state/store';
import { AssessmentPanel } from './AssessmentPanel';
import { BriefCard } from './BriefCard';
import { BuildBar } from './BuildBar';
import { ControlGroups } from './ControlGroups';
import { Gauges } from './Gauges';
import { SidebarHeader } from './SidebarHeader';
import { StylePicker } from './StylePicker';

export function Sidebar() {
  const phase = useGame((s) => s.phase);
  return (
    <aside className="sidebar">
      <SidebarHeader />
      <div className="sidebar-scroll">
        {phase === 'complete' ? (
          <AssessmentPanel />
        ) : (
          <>
            <BriefCard />
            <Gauges />
            <StylePicker />
            <ControlGroups />
          </>
        )}
      </div>
      {phase === 'design' && <BuildBar />}
    </aside>
  );
}
