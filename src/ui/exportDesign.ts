import { towerFileSlug } from '../sim/towerName';
import type { Design } from '../sim/types';
import type { Project } from '../state/store';

export const EXPORT_VERSION = 2;

export function designExportPayload(project: Project, design: Design): string {
  return JSON.stringify({ version: EXPORT_VERSION, project, design }, null, 2);
}

/** The saved file's name: the tower's name as a slug (or the site), then the time. */
export function exportFileName(project: Project, now: number): string {
  return `skyscraper-${towerFileSlug(project.towerName, project.siteId)}-${now}.json`;
}

export function downloadDesign(project: Project, design: Design): void {
  const blob = new Blob([designExportPayload(project, design)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = exportFileName(project, Date.now());
  a.click();
  URL.revokeObjectURL(url);
}
