import type { Design } from '../sim/types';
import type { Project } from '../state/store';

export const EXPORT_VERSION = 1;

export function designExportPayload(project: Project, design: Design): string {
  return JSON.stringify({ version: EXPORT_VERSION, project, design }, null, 2);
}

export function downloadDesign(project: Project, design: Design): void {
  const blob = new Blob([designExportPayload(project, design)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `skyscraper-${project.siteId}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
