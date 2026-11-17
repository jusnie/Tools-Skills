// ============================================================
// Arena Blaster - strike engine
// A strike is a *timeline*: lock-on, charge, beam, impact, then
// the land is rebuilt in real blocks outwards from the middle
// while the sound and the shock arrive late by distance.
// Design mirrors the reference orbital-strike mod: one plan per
// laser, everything worked out up front, then played as stages.
// ============================================================

import { system, world } from "@minecraft/server";
import { CONFIG } from "./config.js";
import {
  Terrain,
  Rng,
  craterGen,
  scorchGen,
  flattenGen,
  rubbleGen,
  ringGen,
  shockwave,
  scatterDebris,
  AIR,
} from "./terrain.js";

// ------------------------------------------------------------
// The lasers
// ------------------------------------------------------------

export const STRIKES = {
  plasma: {
    key: "plasma",
    title: "PLASMA",
    colour: "§b",
    blurb: "A raging plasma beam and forked lightning. Fuses the crater into glass and obsidian, ringed with fire and rubble.",
    chargeTicks: 30,
    beamParticle: "minecraft:basic_crit_particle",
    impactParticle: "minecraft:huge_explosion_emitter",
    crater: { radius: 11, depth: 9, roughness: 0.16 },
    lining: [
      ["minecraft:obsidian", 0.34],
      ["minecraft:black_stained_glass", 0.24],
      ["minecraft:tinted_glass", 0.14],
      ["minecraft:magma_block", 0.16],
      ["minecraft:smooth_basalt", 0.12],
    ],
    floor: "minecraft:magma_block",
    rim: "minecraft:blackstone",
    scorch: { radius: 20, blocks: ["minecraft:blackstone", "minecraft:smooth_basalt", "minecraft:coarse_dirt"] },
    flatten: { radius: 22 },
    rubble: { radius: 24, blocks: ["minecraft:blackstone", "minecraft:cobblestone", "minecraft:basalt"] },
    ring: { radius: 22, block: "minecraft:glowstone", accent: "minecraft:sea_lantern" },
    smoke: { height: 30, ticks: 70, particle: "minecraft:large_smoke_particle" },
    sounds: { charge: "random.fizz", fire: "mob.warden.sonic_boom", impact: "random.explode" },
  },

  godly: {
    key: "godly",
    title: "GODLY",
    colour: "§e",
    blurb: "The clouds part and a pillar of pure light comes down. Leaves a consecrated crater of quartz and gold, with flowers blooming outward.",
    chargeTicks: 34,
    beamParticle: "minecraft:endrod",
    impactParticle: "minecraft:huge_explosion_emitter",
    crater: { radius: 9, depth: 7, roughness: 0.02 },
    lining: [
      ["minecraft:smooth_quartz", 0.45],
      ["minecraft:calcite", 0.3],
      ["minecraft:gold_block", 0.12],
      ["minecraft:quartz_bricks", 0.13],
    ],
    floor: "minecraft:gold_block",
    rim: "minecraft:smooth_quartz",
    scorch: { radius: 18, blocks: ["minecraft:smooth_quartz", "minecraft:calcite", "minecraft:smooth_quartz"] },
    flatten: { radius: 20 },
    rubble: { radius: 20, blocks: ["minecraft:calcite", "minecraft:smooth_quartz"] },
    ring: { radius: 18, block: "minecraft:glowstone", accent: "minecraft:sea_lantern" },
    smoke: { height: 24, ticks: 50, particle: "minecraft:endrod" },
    flowerRadius: 24,
    sounds: { charge: "beacon.power", fire: "beacon.activate", impact: "random.explode" },
  },

  nuke: {
    key: "nuke",
    title: "NUKE",
    colour: "§c",
    blurb: "A bomb from orbit bursts into a mushroom cloud, flattens the land for hundreds of blocks and leaves a crater with a glassed floor.",
    chargeTicks: 55,
    incoming: true,
    beamParticle: "minecraft:basic_flame_particle",
    impactParticle: "minecraft:huge_explosion_emitter",
    crater: { radius: 19, depth: 14, roughness: 0.22 },
    lining: [
      ["minecraft:basalt", 0.3],
      ["minecraft:blackstone", 0.26],
      ["minecraft:magma_block", 0.14],
      ["minecraft:tuff", 0.2],
      ["minecraft:obsidian", 0.1],
    ],
    floor: "minecraft:magma_block",
    rim: "minecraft:coarse_dirt",
    scorch: { radius: 34, blocks: ["minecraft:coarse_dirt", "minecraft:gravel", "minecraft:blackstone"] },
    flatten: { radius: 36 },
    rubble: { radius: 38, blocks: ["minecraft:cobblestone", "minecraft:gravel", "minecraft:andesite"] },
    ring: { radius: 30, block: "minecraft:magma_block", accent: "minecraft:glowstone" },
    smoke: { height: 60, ticks: 160, particle: "minecraft:large_smoke_particle", spread: 3.4 },
    extraPuffs: 18,
    sounds: { charge: "beacon.deactivate", fire: "mob.warden.sonic_boom", impact: "random.explode" },
  },

  rod: {
    key: "rod",
    title: "ROD",
    colour: "§f",
    blurb: "A colossal tungsten rod dropped from orbit. It drives a shaft to the deepstone and leaves a crater lined in white and gold.",
    chargeTicks: 40,
    incoming: true,
    beamParticle: "minecraft:basic_crit_particle",
    impactParticle: "minecraft:huge_explosion_emitter",
    crater: { radius: 8, depth: 16, roughness: 0.08 },
    lining: [
      ["minecraft:quartz_block", 0.4],
      ["minecraft:calcite", 0.28],
      ["minecraft:gold_block", 0.14],
      ["minecraft:polished_diorite", 0.18],
    ],
    floor: "minecraft:glowstone",
    rim: "minecraft:quartz_block",
    scorch: { radius: 16, blocks: ["minecraft:calcite", "minecraft:quartz_block", "minecraft:stone"] },
    flatten: { radius: 18 },
    rubble: { radius: 20, blocks: ["minecraft:calcite", "minecraft:quartz_block", "minecraft:stone"] },
    ring: { radius: 15, block: "minecraft:sea_lantern", accent: "minecraft:glowstone" },
    smoke: { height: 20, ticks: 40, particle: "minecraft:basic_smoke_particle" },
    shaft: { radius: 3, depth: 40 },
    sounds: { charge: "random.fizz", fire: "mob.warden.sonic_boom", impact: "random.explode" },
  },
};

export const STRIKE_ORDER = ["plasma", "godly", "nuke", "rod"];

// ------------------------------------------------------------
// Runtime state
// ------------------------------------------------------------

const active = new Map(); // playerId -> { key, cancelled }
const lastUsed = new Map(); // playerId -> strike key

export function currentStrike(player) {
  return lastUsed.get(player.id) ?? CONFIG.DEFAULT_STRIKE;
}

export function setStrike(player, key) {
  if (!STRIKES[key]) return false;
  lastUsed.set(player.id, key);
  return true;
}

export function cycleStrike(player) {
  const now = currentStrike(player);
  const i = STRIKE_ORDER.indexOf(now);
  const next = STRIKE_ORDER[(i + 1) % STRIKE_ORDER.length];
  lastUsed.set(player.id, next);
  return next;
}

export function isBusy(player) {
  return active.has(player.id);
}

export function cancelStrike(player) {
  const run = active.get(player.id);
  if (!run) return false;
  run.cancelled = true;
  active.delete(player.id);
  return true;
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function bar(player, text) {
  try {
    player.onScreenDisplay.setActionBar(text);
  } catch (e) {}
}

function title(player, text, sub) {
  try {
    player.onScreenDisplay.setTitle(text, {
      subtitle: sub ?? "",
      fadeInDuration: 4,
      stayDuration: 30,
      fadeOutDuration: 8,
    });
  } catch (e) {}
}

function sound(dimension, id, location, delayTicks = 0) {
  const play = () => {
    try {
      dimension.playSound(id, location);
    } catch (e) {}
  };
  if (delayTicks <= 0) play();
  else system.runTimeout(play, Math.floor(delayTicks));
}

/** Sound that reaches the listener late by distance (343 blocks a second). */
function soundLate(dimension, id, at, listener, extraTicks = 0) {
  let ticks = extraTicks;
  try {
    const d = Math.hypot(
      listener.location.x - at.x,
      listener.location.y - at.y,
      listener.location.z - at.z
    );
    ticks += (d / 343) * 20;
  } catch (e) {}
  sound(dimension, id, at, ticks);
}

function shake(player, intensity, seconds) {
  const cmds = [
    `camerashake add @s ${intensity.toFixed(2)} ${seconds.toFixed(2)} positional`,
    `camerashake add @s ${intensity.toFixed(2)} ${seconds.toFixed(2)} rotational`,
  ];
  for (const cmd of cmds) {
    try {
      player.runCommand(cmd);
      return;
    } catch (e) {}
  }
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function beam(dimension, from, to, particle, density = 2) {
  if (!from || !to) return;
  const steps = Math.min(60, Math.max(6, Math.floor(dist(from, to) * density)));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    try {
      dimension.spawnParticle(particle, {
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
        z: from.z + (to.z - from.z) * t,
      });
    } catch (e) {}
  }
}

function rngFor(seed) {
  return new Rng(seed);
}

// ------------------------------------------------------------
// The strike
// ------------------------------------------------------------

/**
 * Fire one strike. Returns true if it started.
 * @param {import("@minecraft/server").Player} player
 * @param {{location: {x:number,y:number,z:number}}} target
 * @param {string} [key]
 */
export function fireStrike(player, target, key) {
  const strikeKey = key ?? currentStrike(player);
  const plan = STRIKES[strikeKey] ?? STRIKES.plasma;
  if (isBusy(player)) {
    bar(player, "§cA strike is already under way — wait for it, or use /arena:stop.");
    return false;
  }

  const dimension = player.dimension;
  const center = { ...target.location };
  const seed = Math.floor(Math.random() * 0x7fffffff);
  const rng = rngFor(seed);
  const run = { key: strikeKey, cancelled: false };
  active.set(player.id, run);

  // Where the beam comes from: high above and slightly offset, so it
  // reads as coming down from orbit rather than straight overhead.
  const skyAngle = rng.range(0, Math.PI * 2);
  const skyX = center.x + Math.cos(skyAngle) * 6;
  const skyZ = center.z + Math.sin(skyAngle) * 6;
  const skyY = center.y + 70;
  const sky = { x: skyX, y: skyY, z: skyZ };

  const charge = plan.chargeTicks;
  const impactAt = charge + 10;

  // --- stage 1: lock-on -----------------------------------------
  title(player, `${plan.colour}${plan.title}`, "§7Target locked");
  bar(player, `§7Incoming: ${plan.colour}${plan.title}§7 — hold position`);
  sound(dimension, plan.sounds.charge, center);
  shake(player, 0.12, 0.5);

  // --- stage 2: charge ------------------------------------------
  const chargeSteps = Math.floor(charge / 2);
  for (let i = 0; i <= chargeSteps; i++) {
    system.runTimeout(() => {
      if (run.cancelled) return;
      const t = i / chargeSteps;
      // a growing glow at the impact point
      for (let k = 0; k < Math.ceil(t * 6); k++) {
        try {
          dimension.spawnParticle(plan.beamParticle, {
            x: center.x + rng.range(-1.2, 1.2),
            y: center.y + rng.range(0, 2.5),
            z: center.z + rng.range(-1.2, 1.2),
          });
        } catch (e) {}
      }
      if (plan.incoming) {
        // the bomb/rod falling in from high up
        const fall = Math.min(1, t * 1.15);
        const y = sky.y + (center.y + 1 - sky.y) * fall;
        try {
          dimension.spawnParticle(plan.beamParticle, { x: sky.x, y, z: sky.z });
          dimension.spawnParticle("minecraft:large_smoke_particle", {
            x: sky.x + rng.range(-0.4, 0.4),
            y: y + 1.5,
            z: sky.z + rng.range(-0.4, 0.4),
          });
        } catch (e) {}
      } else if (i % 4 === 0) {
        // the beam flickers down from the sky while it charges
        beam(dimension, sky, { x: center.x, y: center.y + 2, z: center.z }, plan.beamParticle, 0.6);
      }
    }, i * 2);
  }

  // --- stage 3: impact ------------------------------------------
  system.runTimeout(() => {
    if (run.cancelled) return;

    // full beam, flash and jolt
    beam(dimension, sky, { x: center.x, y: center.y + 2, z: center.z }, plan.beamParticle, 2.4);
    try {
      dimension.spawnParticle(plan.impactParticle, { x: center.x, y: center.y + 1, z: center.z });
      dimension.spawnParticle("minecraft:huge_explosion_emitter", { x: center.x, y: center.y + 2, z: center.z });
    } catch (e) {}
    sound(dimension, plan.sounds.fire, center);
    soundLate(dimension, plan.sounds.impact, center, player);
    shake(player, 1.0, 2.4);
    title(player, "§c§lIMPACT", `§7${plan.title} has landed`);
    bar(player, "§c§lIMPACT§r §7— the land is being rebuilt");

    // vanilla explosion for the damage story
    try {
      dimension.runCommand(
        `explode ${Math.floor(center.x)} ${Math.floor(center.y)} ${Math.floor(center.z)} ${CONFIG.EXPLOSION_POWER}`
      );
    } catch (e) {}

    damageNearby(dimension, center, player);

    const terrain = new Terrain(dimension, CONFIG.BLOCKS_PER_TICK);
    const crater = plan.crater;

    // the crater proper
    terrain.add(
      craterGen(terrain, center, {
        seed,
        radius: crater.radius,
        depth: crater.depth,
        roughness: crater.roughness,
        lining: plan.lining,
        floor: plan.floor,
        rim: plan.rim,
      })
    );

    // shaft (rod / nuke get a deep one)
    if (plan.shaft) {
      terrain.add(
        craterGen(terrain, center, {
          seed: seed + 1,
          radius: plan.shaft.radius,
          depth: plan.shaft.depth,
          roughness: 0.05,
          lining: plan.lining,
          floor: plan.floor,
          rim: plan.rim,
        })
      );
    }

    // scorch outward, flatten trees, strew rubble, build the ring
    terrain.add(
      scorchGen(terrain, center, {
        seed: seed + 2,
        inner: crater.radius - 1,
        radius: plan.scorch.radius,
        blocks: plan.scorch.blocks,
      })
    );
    if (!CONFIG.KEEP_TREES) {
      terrain.add(flattenGen(terrain, center, { seed: seed + 3, radius: plan.flatten.radius }));
    }
    terrain.add(rubbleGen(terrain, center, { seed: seed + 4, radius: plan.rubble.radius, inner: crater.radius, blocks: plan.rubble.blocks }));
    if (CONFIG.CREATE_ARENA_RING && plan.ring) {
      terrain.add(ringGen(terrain, center, { radius: plan.ring.radius, block: plan.ring.block, accent: plan.ring.accent }));
    }

    // flowers blooming outward (godly)
    if (plan.flowerRadius) {
      system.runTimeout(() => {
        const flowers = ["minecraft:dandelion", "minecraft:poppy", "minecraft:cornflower", "minecraft:azure_bluet"];
        const spots = rngFor(seed + 9);
        for (let i = 0; i < 90; i++) {
          const a = spots.next() * Math.PI * 2;
          const r = spots.range(crater.radius + 1, plan.flowerRadius);
          const x = Math.floor(center.x + Math.cos(a) * r);
          const z = Math.floor(center.z + Math.sin(a) * r);
          const y = terrain.surfaceY(x, z, center.y) + 1;
          terrain.immediate([{ x, y, z, type: spots.pick(flowers), only: new Set(["minecraft:air"]) }]);
        }
      }, 30);
    }

    // thrown blocks drop back into the crater
    scatterDebris(dimension, center, {
      seed: seed + 5,
      count: Math.min(30, crater.radius * 2),
      spread: crater.radius,
      blocks: plan.rubble.blocks,
    });

    // shockwave + smoke column
    shockwave(dimension, center, {
      waves: 3,
      speed: 1.8,
      radius: Math.min(40, plan.scorch.radius + 6),
      particle: "minecraft:large_smoke_particle",
    });
    const smoke = plan.smoke;
    const smokeSteps = smoke.ticks;
    for (let t = 0; t < smokeSteps; t++) {
      system.runTimeout(() => {
        if (run.cancelled) return;
        const p = t / smokeSteps;
        const y = center.y + p * smoke.height;
        const puff = 1 + p * 2.2;
        const spread = (smoke.spread ?? 2.4) * puff;
        const count = 2 + Math.floor(p * 3);
        for (let i = 0; i < count; i++) {
          try {
            dimension.spawnParticle(smoke.particle, {
              x: center.x + (Math.random() - 0.5) * spread * 2,
              y,
              z: center.z + (Math.random() - 0.5) * spread * 2,
            });
          } catch (e) {}
        }
      }, t * 2);
    }

    // extra puffs for the nuke's mushroom cap
    if (plan.extraPuffs) {
      for (let i = 0; i < plan.extraPuffs; i++) {
        system.runTimeout(() => {
          if (run.cancelled) return;
          const a = (i / plan.extraPuffs) * Math.PI * 2;
          const r = plan.smoke.height * 0.34;
          try {
            dimension.spawnParticle("minecraft:large_smoke_particle", {
              x: center.x + Math.cos(a) * r,
              y: center.y + plan.smoke.height * 0.82 + Math.random() * 4,
              z: center.z + Math.sin(a) * r,
            });
          } catch (e) {}
        }, plan.smoke.ticks * 2 + 10 + i * 2);
      }
    }

    // finishing touches once the block work has spread out
    system.runTimeout(() => {
      if (run.cancelled) return;
      bar(player, `§a§l${plan.title} COMPLETE§r §7— crater ${plan.crater.radius * 2} blocks across`);
      active.delete(player.id);
    }, 90);
  }, impactAt);

  return true;
}

function damageNearby(dimension, center, player) {
  const radius = CONFIG.DAMAGE_RADIUS;
  try {
    const entities = dimension.getEntities({ location: center, maxDistance: radius });
    for (const ent of entities) {
      if (ent.id === player.id) continue;
      try {
        ent.applyDamage(CONFIG.ENTITY_DAMAGE, { cause: "explosion" });
      } catch (e) {}
      try {
        const dir = {
          x: ent.location.x - center.x,
          y: 0,
          z: ent.location.z - center.z,
        };
        const len = Math.hypot(dir.x, dir.z) || 1;
        ent.applyImpulse({ x: (dir.x / len) * 1.4, y: 0.9, z: (dir.z / len) * 1.4 });
      } catch (e) {}
    }
  } catch (e) {}
}
