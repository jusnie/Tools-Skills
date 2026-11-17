// ============================================================
// Arena Blaster - timeline
// A direct port of the reference orbital-strike shader's timing
// envelopes (Stink-O/orbital-laser, shaders/strike.wgsl) from
// seconds-of-shader-time to game ticks.
//
// Their constants (seconds) and what this file reproduces:
//   T_FIRE 4.0        the beam fires
//   beam_env         fades IN over 0.1 s, OUT over 9 -> 11 s
//   crater_env       fades in 0 -> 0.8 s, out 10 -> 20 s
//   smoke plume      in 1.2 -> 4.5 s, out 15 -> 26 s, top rises (fire_t-1)*11
//   charge lines     burn in over 0 -> 3.6 s of the charge
//   designator beam  a thin red thread while charging
// ============================================================

export const TPS = 20; // ticks a second

/** seconds -> ticks */
export const T = (s) => Math.round(s * TPS);

export const T_FIRE = T(4.0);

export function saturate(x) {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

export function smoothstep(a, b, x) {
  const t = saturate((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

export function mix(a, b, k) {
  return a + (b - a) * k;
}

export function clamp(x, lo, hi) {
  return x < lo ? lo : x > hi ? hi : x;
}

/** Seconds-since-fire from a tick count. */
export const fired = (tick) => (tick - T_FIRE) / TPS;

// ------------------------------------------------------------
// The envelopes, ported one-for-one
// ------------------------------------------------------------

/** Charging weight while the beam is still coming (0 before fire). */
export function charging(tick) {
  return tick < T_FIRE ? saturate(tick / T_FIRE) : 0;
}

/** The main beam: 1 from just after fire, gone by 9-11 s. */
export function beamEnv(fireTick) {
  const f = fired(fireTick);
  if (f <= 0) return 0;
  return smoothstep(0.0, 0.1, f) * (1 - smoothstep(9.0, 11.0, f));
}

/** The crater glow / embers: in by 0.8 s, out over 10-20 s. */
export function craterEnv(fireTick) {
  const f = fired(fireTick);
  if (f <= 0) return 0;
  return smoothstep(0.0, 0.8, f) * (1 - smoothstep(10.0, 20.0, f));
}

/** The smoke plume: 1.2-4.5 s in, 15-26 s out. */
export function smokeEnv(fireTick) {
  const f = fired(fireTick);
  if (f <= 0) return 0;
  return smoothstep(1.2, 4.5, f) * (1 - smoothstep(15.0, 26.0, f));
}

/** Height of the plume's crown: it climbs 11 blocks a second after 1 s. */
export function plumeTop(fireTick) {
  const f = fired(fireTick);
  return Math.max(0, f - 1.0) * 11.0;
}

/** The charge-in of the sigil lines: they burn in over 0-3.6 s. */
export function sigilDraw(tick) {
  return smoothstep(0.0, 3.6, tick / TPS);
}

/** Impact flash envelope: hard on at fire, gone in ~1.2 s. */
export function flashEnv(fireTick) {
  const f = fired(fireTick);
  if (f < 0) return 0;
  return 1 - smoothstep(0.0, 1.2, f);
}

// ------------------------------------------------------------
// Key times (ticks)
// ------------------------------------------------------------

export const TIMELINE = {
  fire: T_FIRE, // 80
  beamOut: T(9.0), // 180
  beamGone: T(11.0), // 220
  craterGone: T(20.0), // 400
  smokeIn: T(4.5), // 90
  smokeGone: T(26.0), // 520
  chargeLines: T(3.6), // 72
};

/** The full run length of a strike, in ticks. */
export const STRIKE_LENGTH = T(26.0);
