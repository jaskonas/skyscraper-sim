import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Part, Vec3 } from '../../sim/parts';
import type { Design, Site } from '../../sim/types';
import type { SwaySignal } from '../forces/sway';
import { lotCenter } from '../layout';
import { PartsMesh } from '../parts/PartsMesh';
import { chunkLook, chunkParts } from './chunkParts';
import { nearChunks, type Chunk } from './chunks';

/** The chunks now in 3D, shared with the facade so it can leave holes for them. `version` bumps on change. */
export interface ChunkSignal {
  chunks: Chunk[];
  version: number;
}

export const createChunkSignal = (): ChunkSignal => ({ chunks: [], version: 0 });

/** How often (in frames) the walls near the camera are looked for again. */
const EVERY = 10;

/**
 * The tower's walls near the camera, in true 3D. Every few frames it picks the chunks close to the camera,
 * builds any it hasn't built yet (kept until the design changes) and tells the facade where they are.
 */
export function CloseWalls({
  site,
  design,
  signal,
  sway,
  night,
  floors,
}: {
  site: Site;
  design: Design;
  signal: ChunkSignal;
  sway?: SwaySignal;
  night: boolean;
  /** Floors drawn; chunks on hidden ones are left out. */
  floors: number;
}) {
  const camera = useThree((s) => s.camera);
  const [lx, lz] = lotCenter(site);
  const built = useMemo(() => new Map<string, Part[]>(), [design]);
  // What is shown, and for which design: after a design change the old chunks are never built against the new one.
  const [shown, setShown] = useState<{ design: Design; chunks: Chunk[] }>({ design, chunks: [] });
  const tick = useRef(0);
  const partsOf = (c: Chunk) => {
    let p = built.get(c.key);
    if (!p) built.set(c.key, (p = chunkParts(design, c)));
    return p;
  };
  const publish = (chunks: Chunk[]) => {
    signal.chunks = chunks;
    signal.version++;
    setShown({ design, chunks });
  };
  // A new design starts with nothing in 3D; leaving takes everything away.
  useEffect(() => {
    publish([]);
    tick.current = 0;
    return () => {
      signal.chunks = [];
      signal.version++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design, signal]);
  useFrame(() => {
    if (tick.current++ % EVERY !== 0) return;
    const at: Vec3 = [camera.position.x - lx, camera.position.y, camera.position.z - lz];
    const previous = new Set(signal.chunks.map((c) => c.key));
    const next = nearChunks(design, at, previous, (c) => (c.floor1 <= floors ? partsOf(c).length : Infinity)).filter((c) => c.floor1 <= floors);
    if (next.length === signal.chunks.length && next.every((c, i) => c.key === signal.chunks[i].key)) return;
    publish(next);
  });
  const parts = useMemo(() => (shown.design === design ? shown.chunks.flatMap(partsOf) : []), [shown, built, design]); // eslint-disable-line react-hooks/exhaustive-deps
  const look = chunkLook(design);
  return <PartsMesh name="close-walls" parts={parts} palette={look.palette} surfaces={look.surfaces} plan={design.shape} night={night} sway={sway} />;
}
