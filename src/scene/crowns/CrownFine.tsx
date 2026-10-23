import type { ComponentProps } from 'react';
import { NEAR_M, NearParts } from '../NearParts';

/** The crown's small pieces are drawn while the camera is within this many metres. */
export const CROWN_FINE_M = NEAR_M;

/** The crown's fine work, drawn only while the camera is close to it. */
export function CrownFine(props: Omit<ComponentProps<typeof NearParts>, 'name'>) {
  return <NearParts name="crown-fine" {...props} />;
}
