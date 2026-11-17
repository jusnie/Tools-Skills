// ============================================================
// Arena Blaster - terrain engine
// Real block edits, applied in expanding rings with a per-tick
// budget, so a big crater never freezes the world.
// (Same idea as the reference orbital-strike mod: work the
// land out from the middle as fast as the world will take it.)
// ============================================================

import { system } from "@minecraft/server";

export const AIR = "minecraft:air";

/** Small deterministic RNG so a strike always looks the same shape. */
export class Rng {
  constructor(seed) {
    this.s = (seed >>> 0) || 1;
  }
  next() {
    this.s = (this.s * 1664525 + 1013904223) >>> 0;
    return this.s / 4294967296;
  }
  range(a, b) {
    return a + (b - a) * this.next();
  }
  chance(p) {
    return this.next() < p;
  }
  pick(list) {
    return list[Math.floor(this.next() * list.length)];
  }
}

/** Weighted pick from [[value, weight], ...] */
function weighted(list, rng) {
  let total = 0;
  for (const item of list) total += item[1];
  let roll = rng.next() * total;
  for (const item of list) {
    roll -= item[1];
    if (roll <= 0) return item[0];
  }
  return list[list.length - 1][0];
}

const SOLID_SKIP = new Set([
  "minecraft:bedrock",
  "minecraft:barrier",
  "minecraft:jigsaw",
  "minecraft:structure_block",
  "minecraft:end_portal",
  "minecraft:end_portal_frame",
  "minecraft:command_block",
  "minecraft:chain_command_block",
  "minecraft:repeating_command_block",
  "minecraft:light_block",
]);

export function isProtected(id) {
  if (!id) return true;
  if (SOLID_SKIP.has(id)) return true;
  return id.startsWith("minecraft:command_block");
}

export class Terrain {
  /**
   * @param {import("@minecraft/server").Dimension} dimension
   * @param {number} budget blocks edited per tick
   */
  constructor(dimension, budget = 140) {
    this.dimension = dimension;
    this.budget = Math.max(20, budget);
    this.queue = [];
    this.heights = new Map();
    this.edited = 0;
    this._handle = undefined;
  }

  /** Highest non-air, non-liquid block at (x, z), searching near `guess`. */
  surfaceY(x, z, guess) {
    const key = `${x},${z}`;
    const cached = this.heights.get(key);
    if (cached !== undefined) return cached;

    let result = Math.floor(guess);
    for (let y = Math.floor(guess) + 12; y >= Math.floor(guess) - 20; y--) {
      let block;
      try {
        block = this.dimension.getBlock({ x, y, z });
      } catch (e) {
        block = undefined;
      }
      if (!block) continue;
      if (block.isAir || block.isLiquid) continue;
      result = y;
      break;
    }
    this.heights.set(key, result);
    return result;
  }

  /** Queue a generator of cells: { x, y, z, type, only? } */
  add(gen) {
    this.queue.push(gen);
    this.start();
  }

  start() {
    if (this._handle !== undefined) return;
    this._handle = system.runInterval(() => this.step(), 1);
  }

  step() {
    let budget = this.budget;
    while (budget > 0 && this.queue.length > 0) {
      const gen = this.queue[0];
      const next = gen.next();
      if (next.done) {
        this.queue.shift();
        continue;
      }
      budget--;
      this.place(next.value);
    }
    if (this.queue.length === 0) {
      this.stop();
    }
  }

  place(cell) {
    try {
      const block = this.dimension.getBlock({ x: cell.x, y: cell.y, z: cell.z });
      if (!block) return;
      const id = block.typeId;
      if (isProtected(id)) return;
      if (cell.only && !cell.only.has(id)) return;
      if (cell.skip && cell.skip.has(id)) return;
      if (block.typeId === cell.type) return;
      block.setType(cell.type);
      this.edited++;
    } catch (e) {
      // unloaded chunk / out of range: skip
    }
  }

  stop() {
    if (this._handle === undefined) return;
    try {
      system.clearRun(this._handle);
    } catch (e) {}
    this._handle = undefined;
  }

  /** A quick synchronous pass for small late touches (ring decoration etc). */
  immediate(cells) {
    for (const cell of cells) this.place(cell);
  }
}

// ------------------------------------------------------------
// Generators (ring-major order: the edit spreads outwards)
// ------------------------------------------------------------

/**
 * Crater: a stepped bowl with a mottled lining, a floor block and
 * a heaped rim.
 */
export function* craterGen(terrain, center, opts) {
  const rng = new Rng(opts.seed ?? 1);
  const radius = opts.radius;
  const depth = opts.depth;
  const lining = opts.lining;
  const floor = opts.floor ?? "minecraft:magma_block";
  const roughness = opts.roughness ?? 0.12;
  const cx = Math.floor(center.x);
  const cz = Math.floor(center.z);

  for (let ring = 0; ring <= radius; ring++) {
    const cells = Math.max(8, Math.round(2 * Math.PI * Math.max(1, ring)));
    for (let i = 0; i < cells; i++) {
      const angle = (i / cells) * Math.PI * 2;
      const jitter = ring === 0 ? 0 : rng.range(-0.5, 0.5);
      const dx = Math.round(Math.cos(angle) * (ring + jitter));
      const dz = Math.round(Math.sin(angle) * (ring + jitter));
      const x = cx + dx;
      const z = cz + dz;
      const d = Math.hypot(dx, dz);
      if (d > radius + 0.5) continue;

      const surface = terrain.surfaceY(x, z, center.y);
      const shape = Math.pow(1 - d / (radius + 0.5), 1.5);
      const depthHere = Math.round(depth * shape + rng.range(-roughness, roughness) * depth);
      if (depthHere <= 0) continue;

      // carve the column
      for (let dy = 0; dy <= depthHere; dy++) {
        const y = surface - dy;
        const isWall = dy >= depthHere - 1 || d > radius * 0.68;
        let type = AIR;
        if (isWall) type = weighted(lining, rng);
        yield { x, y, z, type };
      }

      // the floor it stands on
      const floorY = surface - depthHere - 1;
      const floorType = d < radius * 0.34 ? floor : weighted(lining, rng);
      yield { x, y: floorY, z, type: floorType };

      // heaped rim just outside the lip
      if (d > radius * 0.8 && rng.chance(0.35)) {
        yield { x, y: surface + 1, z, type: opts.rim ?? "minecraft:cobblestone" };
      }
    }
  }
}

/** Replace only the top skin of the land out to `radius`. */
export function* scorchGen(terrain, center, opts) {
  const rng = new Rng(opts.seed ?? 7);
  const inner = opts.inner ?? 0;
  const radius = opts.radius;
  const only = new Set(opts.only ?? []);
  const blocks = opts.blocks;
  const cx = Math.floor(center.x);
  const cz = Math.floor(center.z);

  for (let ring = Math.floor(inner); ring <= radius; ring++) {
    const cells = Math.max(8, Math.round(2 * Math.PI * Math.max(1, ring)));
    const fade = 1 - (ring - inner) / Math.max(1, radius - inner);
    for (let i = 0; i < cells; i++) {
      const angle = (i / cells) * Math.PI * 2;
      const dx = Math.round(Math.cos(angle) * ring);
      const dz = Math.round(Math.sin(angle) * ring);
      if (Math.hypot(dx, dz) > radius) continue;
      const x = cx + dx;
      const z = cz + dz;
      if (!rng.chance(0.35 + 0.65 * fade)) continue;

      const surface = terrain.surfaceY(x, z, center.y);
      const type = rng.pick(blocks);
      yield { x, y: surface, z, type, only };
    }
  }
}

/** Clear everything above the ground (trees, plants) out to `radius`. */
export function* flattenGen(terrain, center, opts) {
  const rng = new Rng(opts.seed ?? 11);
  const radius = opts.radius;
  const cx = Math.floor(center.x);
  const cz = Math.floor(center.z);
  const keep = new Set(opts.keep ?? []);
  const stump = opts.stump ?? "minecraft:air";

  for (let ring = 0; ring <= radius; ring++) {
    const cells = Math.max(8, Math.round(2 * Math.PI * Math.max(1, ring)));
    for (let i = 0; i < cells; i++) {
      const angle = (i / cells) * Math.PI * 2;
      const dx = Math.round(Math.cos(angle) * ring);
      const dz = Math.round(Math.sin(angle) * ring);
      if (Math.hypot(dx, dz) > radius) continue;
      const x = cx + dx;
      const z = cz + dz;
      const surface = terrain.surfaceY(x, z, center.y);

      for (let y = surface + 1; y <= surface + 14; y++) {
        let block;
        try {
          block = terrain.dimension.getBlock({ x, y, z });
        } catch (e) {
          block = undefined;
        }
        if (!block) continue;
        if (block.isAir || block.isLiquid) continue;
        const id = block.typeId;
        if (keep.has(id)) continue;
        if (isProtected(id)) continue;
        yield { x, y, z, type: AIR };
      }

      // a stump where a trunk was
      if (rng.chance(0.05)) {
        yield { x, y: surface + 1, z, type: stump, only: new Set(["minecraft:air"]) };
      }
    }
  }
}

/** Scatter rubble on the ground out to `radius`. */
export function* rubbleGen(terrain, center, opts) {
  const rng = new Rng(opts.seed ?? 17);
  const radius = opts.radius;
  const inner = opts.inner ?? 0;
  const blocks = opts.blocks;
  const cx = Math.floor(center.x);
  const cz = Math.floor(center.z);

  for (let ring = Math.floor(inner); ring <= radius; ring++) {
    const cells = Math.round(2 * Math.PI * Math.max(1, ring) * 0.55);
    for (let i = 0; i < cells; i++) {
      const angle = rng.next() * Math.PI * 2;
      const dx = Math.round(Math.cos(angle) * ring);
      const dz = Math.round(Math.sin(angle) * ring);
      if (Math.hypot(dx, dz) > radius) continue;
      const x = cx + dx;
      const z = cz + dz;
      const surface = terrain.surfaceY(x, z, center.y);
      yield { x, y: surface + 1, z, type: rng.pick(blocks), only: new Set(["minecraft:air"]) };
    }
  }
}

/** Glowstone ring on the ground, plus a second inner accent ring. */
export function* ringGen(terrain, center, opts) {
  const radius = opts.radius;
  const block = opts.block ?? "minecraft:glowstone";
  const accent = opts.accent;
  const cx = Math.floor(center.x);
  const cz = Math.floor(center.z);

  for (let i = 0; i < 360; i += 6) {
    const rad = (i * Math.PI) / 180;
    const x = cx + Math.round(Math.cos(rad) * radius);
    const z = cz + Math.round(Math.sin(rad) * radius);
    const surface = terrain.surfaceY(x, z, center.y);
    yield { x, y: surface + 1, z, type: block, only: new Set(["minecraft:air"]) };
    if (accent) {
      const ix = cx + Math.round(Math.cos(rad) * (radius - 2));
      const iz = cz + Math.round(Math.sin(rad) * (radius - 2));
      const iy = terrain.surfaceY(ix, iz, center.y);
      if (i % 18 === 0) yield { x: ix, y: iy + 1, z: iz, type: accent, only: new Set(["minecraft:air"]) };
    }
  }
}

/** Scatter falling-block debris that actually drops into the crater. */
export function scatterDebris(dimension, center, opts) {
  const rng = new Rng(opts.seed ?? 23);
  for (let i = 0; i < (opts.count ?? 12); i++) {
    const angle = rng.next() * Math.PI * 2;
    const dist = rng.range(0, opts.spread ?? 8);
    const x = center.x + Math.cos(angle) * dist;
    const z = center.z + Math.sin(angle) * dist;
    const y = center.y + rng.range(6, 16);
    const type = rng.pick(opts.blocks ?? ["minecraft:cobblestone"]);
    try {
      dimension.runCommand(
        `summon minecraft:falling_block ${x.toFixed(1)} ${y.toFixed(1)} ${z.toFixed(1)} {BlockState:{Name:"${type}"},Time:1}`
      );
    } catch (e) {}
  }
}

/** Particle ring that races outward over the land (the shockwave). */
export function shockwave(dimension, center, opts) {
  const waves = opts.waves ?? 3;
  const speed = opts.speed ?? 1.6;
  const maxRadius = opts.radius ?? 24;
  const particle = opts.particle ?? "minecraft:large_smoke_particle";

  for (let w = 0; w < waves; w++) {
    system.runTimeout(() => {
      const steps = Math.floor(maxRadius / speed);
      for (let s = 0; s <= steps; s++) {
        system.runTimeout(() => {
          const radius = s * speed;
          const points = Math.max(8, Math.round(radius * 1.4));
          for (let i = 0; i < points; i++) {
            const angle = (i / points) * Math.PI * 2;
            try {
              dimension.spawnParticle(particle, {
                x: center.x + Math.cos(angle) * radius,
                y: center.y + 0.5 + w * 0.4,
                z: center.z + Math.sin(angle) * radius,
              });
            } catch (e) {}
          }
        }, s);
      }
    }, w * 6);
  }
}

/** Thick vertical column of smoke/dust rising from the impact. */
export function* smokeColumn(dimension, center, opts) {
  const rng = new Rng(opts.seed ?? 29);
  const height = opts.height ?? 26;
  const ticks = opts.ticks ?? 60;
  const particle = opts.particle ?? "minecraft:large_smoke_particle";
  const spread = opts.spread ?? 2.4;

  for (let t = 0; t < ticks; t++) {
    const y = center.y + (t / ticks) * height;
    const puff = 1 + (t / ticks) * 2;
    for (let i = 0; i < 3; i++) {
      try {
        dimension.spawnParticle(particle, {
          x: center.x + rng.range(-spread, spread) * puff,
          y,
          z: center.z + rng.range(-spread, spread) * puff,
        });
      } catch (e) {}
    }
    if (opts.schedule) opts.schedule(y);
  }
}
