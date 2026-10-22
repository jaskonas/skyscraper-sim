import { act, render } from '@testing-library/react';
import * as THREE from 'three';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  NEUTRAL_DETAIL,
  NEUTRAL_NORMAL,
  libraryTextures,
  resetLibraryForTests,
  startLibraryLoad,
  useLibraryVersion,
} from './libraryTextures';

const settle = () => new Promise((r) => setTimeout(r, 0));

describe('library textures', () => {
  beforeEach(() => resetLibraryForTests());

  it('starts with neutral stand-ins that change nothing', () => {
    expect(libraryTextures('brick-red').detail).toBe(NEUTRAL_DETAIL);
    expect(libraryTextures('brick-red').normal).toBe(NEUTRAL_NORMAL);
    expect(Array.from(NEUTRAL_DETAIL.image.data as Uint8Array)).toEqual([128, 128, 128, 255]);
    expect(Array.from(NEUTRAL_NORMAL.image.data as Uint8Array)).toEqual([128, 128, 255, 255]);
  });

  it('swaps in the real textures when they arrive, and tells the scene', async () => {
    const urls: string[] = [];
    let renders = 0;
    function Probe() {
      useLibraryVersion();
      renders++;
      return null;
    }
    render(<Probe />);
    const before = renders;
    await act(async () => {
      startLibraryLoad(async (url) => {
        urls.push(url);
        return new THREE.Texture();
      });
      await settle();
    });
    expect(urls).toHaveLength(24);
    for (const u of urls) expect(u).toMatch(/textures\/[a-z-]+\/(detail|normal)\.jpg$/);
    const brick = libraryTextures('brick-red');
    expect(brick.detail).not.toBe(NEUTRAL_DETAIL);
    expect(brick.detail.wrapS).toBe(THREE.RepeatWrapping);
    expect(brick.detail.colorSpace).toBe(THREE.NoColorSpace);
    expect(renders).toBeGreaterThan(before);
  });

  it('keeps the stand-in when a texture fails to load, without throwing', async () => {
    startLibraryLoad(async (url) => {
      if (url.includes('granite')) throw new Error('404');
      return new THREE.Texture();
    });
    await settle();
    expect(libraryTextures('granite').detail).toBe(NEUTRAL_DETAIL);
    expect(libraryTextures('limestone').detail).not.toBe(NEUTRAL_DETAIL);
  });

  it('loads only once', async () => {
    const urls: string[] = [];
    const load = async (url: string) => {
      urls.push(url);
      return new THREE.Texture();
    };
    startLibraryLoad(load);
    startLibraryLoad(load);
    await settle();
    expect(urls).toHaveLength(24);
  });
});
