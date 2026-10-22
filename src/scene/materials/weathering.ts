/**
 * Weathering for walls: a patchy tone so no two stretches of wall match, dirty streaks running down from
 * window sills, grime near the street, and a slightly sun-faded top. All subtle; all drawn in the shader.
 */
export const WEATHER = {
  /** Tone varies by up to this much either way… */
  tintRange: 0.06,
  /** …in patches about this big, metres. */
  tintScaleM: 23,
  /** Darkening in a streak under a window. */
  streakDrop: 0.15,
  /** How far below a window its streaks reach, metres. */
  streakReachM: 1.2,
  /** Darkening right at the street… */
  grimeDrop: 0.12,
  /** …fading over about this height, metres. */
  grimeHeightM: 12,
  /** Brightening of the top floors. */
  topFade: 0.05,
} as const;

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Brightness multiplier for a point of wall. JS twin of the shader's `weatherShade`. */
export function weatherShade({ worldY, floorShare, streak, noise }: { worldY: number; floorShare: number; streak: number; noise: number }): number {
  return (
    (1 + WEATHER.tintRange * (2 * noise - 1)) *
    (1 - WEATHER.streakDrop * streak) *
    (1 - WEATHER.grimeDrop * Math.exp(-Math.max(worldY, 0) / WEATHER.grimeHeightM)) *
    (1 + WEATHER.topFade * smoothstep(0.7, 1, floorShare))
  );
}

const f = (v: number) => v.toFixed(4);

export const WEATHER_GLSL = /* glsl */ `
const float WEATHER_TINT_SCALE = ${f(WEATHER.tintScaleM)};
const float WEATHER_STREAK_REACH = ${f(WEATHER.streakReachM)};
float weatherHash(vec2 p) {
  p = mod(p, 289.0);
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
/** Smooth value noise, 0..1. */
float weatherNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 u = fract(p);
  u = u * u * (3.0 - 2.0 * u);
  return mix(mix(weatherHash(i), weatherHash(i + vec2(1.0, 0.0)), u.x), mix(weatherHash(i + vec2(0.0, 1.0)), weatherHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float weatherShade(float worldY, float floorShare, float streak, float noise) {
  return (1.0 + ${f(WEATHER.tintRange)} * (2.0 * noise - 1.0))
    * (1.0 - ${f(WEATHER.streakDrop)} * streak)
    * (1.0 - ${f(WEATHER.grimeDrop)} * exp(-max(worldY, 0.0) / ${f(WEATHER.grimeHeightM)}))
    * (1.0 + ${f(WEATHER.topFade)} * smoothstep(0.7, 1.0, floorShare));
}`;
