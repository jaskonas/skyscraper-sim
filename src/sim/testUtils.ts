import { defaultDesign, normalizeDesign } from './design';
import { SITES } from './sites';
import type { Design, Site, SiteId } from './types';

/** Default design for a site with a patch applied — the standard way tests build designs. */
export function designFor(siteId: SiteId, patch: Partial<Design> = {}): { site: Site; design: Design } {
  const site = SITES[siteId];
  return { site, design: normalizeDesign({ ...defaultDesign(site), ...patch }, site) };
}
