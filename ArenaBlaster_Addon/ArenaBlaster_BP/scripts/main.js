// ============================================================
// Arena Blaster - Instellar Arena Device
// Point at a block/entity -> alien ship flies in -> hovers ->
// charges -> aims at your point -> FIRE!
// Built for Minecraft Bedrock 26.x (Script API 2.x / @minecraft/server 2.1.0)
// ============================================================

import { world, system, ItemStack, EntityComponentTypes } from "@minecraft/server";
import { CONFIG } from "./config.js";

// player.id -> tick of last shot
const cooldowns = new Map();
let currentTick = 0;

// Script API 2.x: Entity.isValid was removed, use this helper instead.
function isValid(entity) {
  try {
    return !!entity && !!entity.location;
  } catch (e) {
    return false;
  }
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function getInventory(player) {
  try {
    return player.getComponent(EntityComponentTypes.Inventory);
  } catch (e) {
    try {
      return player.getComponent("inventory");
    } catch (err) {
      return undefined;
    }
  }
}

function getHeldSlot(player) {
  // 2.x name is selectedSlotIndex, 1.x was selectedSlot
  const idx = player.selectedSlotIndex ?? player.selectedSlot;
  return typeof idx === "number" ? idx : 0;
}

function isHoldingDevice(player) {
  try {
    const inv = getInventory(player);
    if (!inv || !inv.container) return false;
    const item = inv.container.getItem(getHeldSlot(player));
    return !!item && item.typeId === CONFIG.ITEM_ID;
  } catch (e) {
    return false;
  }
}

function getEyeLocation(player) {
  try {
    return player.getHeadLocation();
  } catch (e) {
    return player.location;
  }
}

function isProtectedBlock(id) {
  return (
    id === "minecraft:bedrock" ||
    id === "minecraft:barrier" ||
    id.startsWith("minecraft:command_block") ||
    id.startsWith("minecraft:jigsaw") ||
    id.startsWith("minecraft:structure_block")
  );
}

/**
 * Raycast from the player's crosshair.
 * Returns { location, block, entity, distance } or null.
 */
/**
 * Manual crosshair raycast.
 * The built-in getBlockFromViewDirection / getEntityFromViewDirection calls
 * fail silently on 26.x builds, so we march the view vector ourselves.
 */
function getAimTarget(player) {
  const eye = getEyeLocation(player);
  let dir;
  try {
    dir = player.getViewDirection();
  } catch (e) {
    dir = undefined;
  }
  if (!dir) return null;

  const range = CONFIG.AIM_RANGE;
  const step = 0.4;

  // 1) Nearest entity along the ray (skip the ship itself)
  let bestEntity = null;
  let bestEntDist = Infinity;
  try {
    const searchCenter = {
      x: eye.x + dir.x * (range * 0.5),
      y: eye.y + dir.y * (range * 0.5),
      z: eye.z + dir.z * (range * 0.5),
    };
    const near = player.dimension.getEntities({
      location: searchCenter,
      maxDistance: range * 0.75,
    });
    for (const ent of near) {
      if (ent.id === player.id) continue;
      if (ent.typeId === CONFIG.SHIP_ID) continue;
      if (!isValid(ent)) continue;
      let toEnt;
      try {
        toEnt = ent.getHeadLocation();
      } catch (e) {
        toEnt = ent.location;
      }
      if (!toEnt) continue;
      const vx = toEnt.x - eye.x;
      const vy = toEnt.y - eye.y;
      const vz = toEnt.z - eye.z;
      const along = vx * dir.x + vy * dir.y + vz * dir.z;
      if (along < 0 || along > range) continue;
      const perp = Math.sqrt(Math.max(0, vx * vx + vy * vy + vz * vz - along * along));
      if (perp > 1.6) continue;
      if (along < bestEntDist) {
        bestEntDist = along;
        bestEntity = ent;
      }
    }
  } catch (e) {}

  // 2) First solid block along the ray
  let blockHit = null;
  let blockDist = Infinity;
  try {
    for (let d = 0.5; d <= range; d += step) {
      const pos = {
        x: Math.floor(eye.x + dir.x * d),
        y: Math.floor(eye.y + dir.y * d),
        z: Math.floor(eye.z + dir.z * d),
      };
      const block = player.dimension.getBlock(pos);
      if (!block) continue;
      if (block.isAir || block.isLiquid) continue;
      blockHit = block;
      blockDist = d;
      break;
    }
  } catch (e) {}

  if (bestEntity && bestEntDist <= blockDist) {
    let loc;
    try {
      loc = bestEntity.getHeadLocation();
    } catch (e) {
      loc = bestEntity.location;
    }
    return { location: loc, block: null, entity: bestEntity, distance: bestEntDist };
  }

  if (blockHit) {
    const loc = blockHit.center();
    return { location: loc, block: blockHit, entity: null, distance: blockDist };
  }

  return null;
}

function spawnParticleSafe(dimension, id, location) {
  try {
    if (location) dimension.spawnParticle(id, location);
  } catch (e) {}
}

function playSoundSafe(dimension, soundId, location) {
  try {
    dimension.playSound(soundId, location);
  } catch (e) {}
}

function runCommandSafe(dimension, command) {
  try {
    dimension.runCommand(command);
  } catch (e) {
    try {
      console.warn(`[Arena Blaster] command failed: ${command}`);
    } catch (err) {}
  }
}

// ------------------------------------------------------------
// Effects
// ------------------------------------------------------------

function spawnBeam(dimension, from, to) {
  if (!from || !to) return;
  const steps = Math.max(4, Math.floor(from.distanceTo(to) * 2));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    spawnParticleSafe(dimension, "arena:beam", {
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
      z: from.z + (to.z - from.z) * t,
    });
  }
}

function spawnChargeEffect(dimension, location) {
  spawnParticleSafe(dimension, "arena:charge", location);
  spawnParticleSafe(dimension, "arena:sparks", location);
}

function spawnExplosionEffect(dimension, location) {
  spawnParticleSafe(dimension, "arena:explosion", location);
  spawnParticleSafe(dimension, "arena:sparks", location);
  spawnParticleSafe(dimension, "arena:ring", location);

  system.runTimeout(() => {
    spawnParticleSafe(dimension, "arena:explosion", location);
    spawnParticleSafe(dimension, "arena:sparks", location);
  }, 5);
  system.runTimeout(() => {
    spawnParticleSafe(dimension, "arena:ring", location);
  }, 10);
}

function spawnArenaRing(dimension, center) {
  if (!CONFIG.CREATE_ARENA_RING) return;

  for (let wave = 0; wave < 3; wave++) {
    system.runTimeout(() => {
      const radius = CONFIG.ARENA_RING_RADIUS + wave;
      for (let a = 0; a < 360; a += 12) {
        const rad = (a * Math.PI) / 180;
        spawnParticleSafe(dimension, "arena:ring", {
          x: center.x + Math.cos(rad) * radius,
          y: center.y + 0.5,
          z: center.z + Math.sin(rad) * radius,
        });
      }
    }, wave * 6);
  }

  // Ground ring made of glowstone
  try {
    const groundY = Math.floor(center.y);
    const r = CONFIG.ARENA_RING_RADIUS;
    for (let a = 0; a < 360; a += 10) {
      const rad = (a * Math.PI) / 180;
      const x = Math.floor(center.x + Math.cos(rad) * r);
      const z = Math.floor(center.z + Math.sin(rad) * r);
      const block = dimension.getBlock({ x, y: groundY, z });
      if (block && block.isAir) {
        block.setType(CONFIG.ARENA_RING_BLOCK);
      }
    }
  } catch (e) {}
}

function destroyBlocks(dimension, center) {
  if (!CONFIG.DESTROY_BLOCKS) return;
  const r = CONFIG.DESTROY_RADIUS;
  const cx = Math.floor(center.x);
  const cy = Math.floor(center.y);
  const cz = Math.floor(center.z);

  for (let x = cx - r; x <= cx + r; x++) {
    for (let y = cy - r; y <= cy + r; y++) {
      for (let z = cz - r; z <= cz + r; z++) {
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2);
        if (dist > r) continue;
        try {
          const block = dimension.getBlock({ x, y, z });
          if (!block || block.isAir) continue;
          if (isProtectedBlock(block.typeId)) continue;
          block.setType("minecraft:air");
        } catch (e) {}
      }
    }
  }
}

function damageEntities(dimension, center, sourcePlayer) {
  try {
    const entities = dimension.getEntities({ location: center, maxDistance: CONFIG.DAMAGE_RADIUS });
    for (const ent of entities) {
      if (ent === sourcePlayer) continue;
      if (!isValid(ent)) continue;
      if (ent.typeId === sourcePlayer?.typeId && ent.id === sourcePlayer?.id) continue;
      try {
        ent.applyDamage(CONFIG.ENTITY_DAMAGE, { cause: "magic" });
      } catch (e) {}
      try {
        const dir = ent.location.subtract(center).normalize();
        ent.applyImpulse({ x: dir.x * 6, y: 5, z: dir.z * 6 });
      } catch (e) {}
    }
  } catch (e) {}
}

// ------------------------------------------------------------
// Orbital strike
// ------------------------------------------------------------

function executeImpact(dimension, center, player) {
  spawnExplosionEffect(dimension, center);
  playSoundSafe(dimension, CONFIG.SOUND_EXPLODE, center);

  runCommandSafe(
    dimension,
    `explode ${Math.floor(center.x)} ${Math.floor(center.y)} ${Math.floor(center.z)} ${CONFIG.EXPLOSION_POWER}`
  );

  damageEntities(dimension, center, player);
  destroyBlocks(dimension, center);
  spawnArenaRing(dimension, center);

  try {
    player.onScreenDisplay.setActionBar("§c§lBOOM!§r §7Orbital strike complete!");
  } catch (e) {}
}

function triggerShipStrike(player, target) {
  const dimension = player.dimension;
  const center = target.location;

  const spawnPos = {
    x: center.x - 16,
    y: center.y + CONFIG.SHIP_SPAWN_HEIGHT,
    z: center.z - 16,
  };
  const hoverPos = {
    x: center.x,
    y: center.y + CONFIG.SHIP_HOVER_HEIGHT,
    z: center.z,
  };

  let ship = null;
  try {
    ship = dimension.spawnEntity(CONFIG.SHIP_ID, spawnPos);
  } catch (e) {
    console.warn(`[Arena Blaster] ship spawn failed: ${e}`);
    executeImpact(dimension, center, player);
    return;
  }

  try {
    player.onScreenDisplay.setActionBar("§b§lALIEN SHIP INCOMING...§r");
  } catch (e) {}
  playSoundSafe(dimension, "mob.ghast.scream", hoverPos);

  const descendTicks = CONFIG.SHIP_DESCEND_TICKS;
  const chargeTicks = CONFIG.SHIP_CHARGE_TICKS;
  const aimTicks = CONFIG.SHIP_AIM_TICKS;
  const leaveTicks = CONFIG.SHIP_LEAVE_TICKS;

  // Phase 1: fly in from the sky to the hover point
  for (let t = 1; t <= descendTicks; t += 2) {
    system.runTimeout(() => {
      if (!isValid(ship)) return;
      const p = t / descendTicks;
      const ease = 1 - (1 - p) * (1 - p);
      const pos = {
        x: spawnPos.x + (hoverPos.x - spawnPos.x) * ease,
        y: spawnPos.y + (hoverPos.y - spawnPos.y) * ease,
        z: spawnPos.z + (hoverPos.z - spawnPos.z) * ease,
      };
      try {
        ship.teleport(pos, { facingLocation: center });
      } catch (e) {}
      spawnParticleSafe(dimension, "arena:sparks", pos);
    }, t);
  }

  // Phase 2: hover + charge the core
  const chargeStart = descendTicks;
  system.runTimeout(() => {
    try {
      player.onScreenDisplay.setActionBar("§e§lSHIP CHARGING...§r");
    } catch (e) {}
    playSoundSafe(dimension, CONFIG.SOUND_CHARGE, hoverPos);
  }, chargeStart);

  for (let t = 0; t < chargeTicks; t += 4) {
    system.runTimeout(() => {
      if (!isValid(ship)) return;
      spawnChargeEffect(dimension, { x: hoverPos.x, y: hoverPos.y - 1.5, z: hoverPos.z });
      try {
        ship.teleport(hoverPos, { facingLocation: center });
      } catch (e) {}
    }, chargeStart + t);
  }

  // Phase 3: lock the beam onto the target
  const aimStart = chargeStart + chargeTicks;
  system.runTimeout(() => {
    try {
      player.onScreenDisplay.setActionBar("§c§lTARGET LOCKED!§r");
    } catch (e) {}
    playSoundSafe(dimension, CONFIG.SOUND_BEAM, hoverPos);
  }, aimStart);

  for (let t = 0; t < aimTicks; t += 4) {
    system.runTimeout(() => {
      if (!isValid(ship)) return;
      spawnBeam(dimension, { x: hoverPos.x, y: hoverPos.y - 1.5, z: hoverPos.z }, center);
      spawnParticleSafe(dimension, "arena:charge", center);
    }, aimStart + t);
  }

  // Phase 4: FIRE
  const fireTick = aimStart + aimTicks;
  system.runTimeout(() => {
    spawnBeam(dimension, { x: hoverPos.x, y: hoverPos.y - 1.5, z: hoverPos.z }, center);
    executeImpact(dimension, center, player);
  }, fireTick);

  // Phase 5: fly away and despawn
  const leaveStart = fireTick + 10;
  const exitPos = {
    x: hoverPos.x + 24,
    y: hoverPos.y + CONFIG.SHIP_SPAWN_HEIGHT,
    z: hoverPos.z + 24,
  };
  for (let t = 1; t <= leaveTicks; t += 2) {
    system.runTimeout(() => {
      if (!isValid(ship)) return;
      const p = t / leaveTicks;
      const pos = {
        x: hoverPos.x + (exitPos.x - hoverPos.x) * p,
        y: hoverPos.y + (exitPos.y - hoverPos.y) * p,
        z: hoverPos.z + (exitPos.z - hoverPos.z) * p,
      };
      try {
        ship.teleport(pos, { facingLocation: exitPos });
      } catch (e) {}
    }, leaveStart + t);
  }

  system.runTimeout(() => {
    try {
      if (isValid(ship)) ship.remove();
    } catch (e) {}
  }, leaveStart + leaveTicks + 2);
}

// ------------------------------------------------------------
// Blast (instant mode when USE_SHIP_SEQUENCE is false)
// ------------------------------------------------------------

function triggerBlast(player, target) {
  const now = currentTick;
  const last = cooldowns.get(player.id) ?? -9999;
  if (now - last < CONFIG.COOLDOWN_TICKS) return;
  cooldowns.set(player.id, now);

  if (CONFIG.USE_SHIP_SEQUENCE) {
    triggerShipStrike(player, target);
    return;
  }

  const dimension = player.dimension;
  const eye = getEyeLocation(player);
  const center = target.location;

  playSoundSafe(dimension, CONFIG.SOUND_CHARGE, center);
  spawnChargeEffect(dimension, center);
  spawnBeam(dimension, eye, center);
  try {
    player.onScreenDisplay.setActionBar("§b§lCHARGING...§r");
  } catch (e) {}

  system.runTimeout(() => {
    spawnBeam(dimension, eye, center);
    playSoundSafe(dimension, CONFIG.SOUND_BEAM, eye);
    executeImpact(dimension, center, player);
  }, CONFIG.CHARGE_TICKS);
}

function tryFire(player) {
  if (!player || !isHoldingDevice(player)) return;
  let target = getAimTarget(player);
  if (!target) {
    // Fallback: drop the strike a few blocks in front of the player so Use always does something
    try {
      const dir = player.getViewDirection();
      const eye = getEyeLocation(player);
      const px = eye.x + dir.x * 6;
      const pz = eye.z + dir.z * 6;
      // find the ground
      let y = eye.y + dir.y * 6;
      for (let i = 0; i < 40; i++) {
        const b = player.dimension.getBlock({ x: Math.floor(px), y: Math.floor(y), z: Math.floor(pz) });
        if (b && !b.isAir && !b.isLiquid) break;
        y -= 1;
      }
      target = { location: { x: px, y: y + 1, z: pz }, block: null, entity: null, distance: 6 };
    } catch (e) {
      return;
    }
  }
  triggerBlast(player, target);
}

// ------------------------------------------------------------
// Giving the device
// ------------------------------------------------------------

function giveDevice(player) {
  try {
    const inv = getInventory(player);
    if (inv && inv.container) {
      const item = new ItemStack(CONFIG.ITEM_ID, 1);
      try {
        inv.container.addItem(item);
      } catch (e) {
        runCommandSafe(player.dimension, `give "${player.name}" ${CONFIG.ITEM_ID} 1`);
      }
    } else {
      runCommandSafe(player.dimension, `give "${player.name}" ${CONFIG.ITEM_ID} 1`);
    }
    player.sendMessage("§a§l[Arena Blaster]§r §7You received the §bInstellar Arena Device§7! Aim + Use to call the strike.");
  } catch (e) {
    console.warn(`[Arena Blaster] give failed: ${e}`);
    try {
      player.sendMessage("§cCould not give the device — check the content log.");
    } catch (err) {}
  }
}

// ------------------------------------------------------------
// Chat commands: !device / !ship
// Script API 2.x has no chat event, so use script events:
//   /scriptevent arena:device
//   /scriptevent arena:ship
// The old "!device" style is still wired up for versions that
// still expose chatSend / message events.
// ------------------------------------------------------------

function handleCommand(player, msg) {
  if (!player || !msg) return false;
  const m = msg.trim().toLowerCase();
  if (m === CONFIG.GIVE_COMMAND || m === "!device" || m === "arena:device") {
    giveDevice(player);
    return true;
  }
  if (m === CONFIG.SHIP_COMMAND || m === "!ship" || m === "arena:ship") {
    const target = getAimTarget(player);
    if (target) triggerShipStrike(player, target);
    return true;
  }
  return false;
}

// Real slash commands (Script API 2.1+): /arena:device and /arena:ship
try {
  system.beforeEvents.startup.subscribe((init) => {
    const registry = init.customCommandRegistry;
    if (!registry) return;

    try {
      registry.registerCommand(
        {
          name: "arena:device",
          description: "Get the Instellar Arena Device",
          permissionLevel: 0, // Any
          cheatsRequired: false,
        },
        (origin) => {
          const player = origin.sourceEntity;
          if (!player) return { status: 1, message: "Run this as a player." };
          system.run(() => giveDevice(player));
          return { status: 0, message: "§aArena Blaster: device given!" };
        }
      );
    } catch (e) {}

    try {
      registry.registerCommand(
        {
          name: "arena:ship",
          description: "Call an alien ship orbital strike at your crosshair",
          permissionLevel: 0,
          cheatsRequired: false,
        },
        (origin) => {
          const player = origin.sourceEntity;
          if (!player) return { status: 1, message: "Run this as a player." };
          system.run(() => {
            const target = getAimTarget(player);
            if (target) triggerShipStrike(player, target);
            else {
              try {
                player.onScreenDisplay.setActionBar("§cNo target — aim at a block within " + CONFIG.AIM_RANGE + "m.");
              } catch (err) {}
            }
          });
          return { status: 0, message: "§bArena Blaster: strike inbound!" };
        }
      );
    } catch (e) {}
  });
} catch (e) {
  console.warn(`[Arena Blaster] custom command setup skipped: ${e}`);
}

try {
  system.afterEvents.scriptEventReceive.subscribe(
    (event) => {
      const player = event.sourceEntity;
      if (!player) return;
      handleCommand(player, event.id);
    },
    { namespaces: ["arena"] }
  );
} catch (e) {
  console.warn(`[Arena Blaster] scriptevent hook failed: ${e}`);
}

try {
  if (world.afterEvents.message) {
    world.afterEvents.message.subscribe((event) => {
      handleCommand(event.sender, event.message);
    });
  }
} catch (e) {}

try {
  if (world.afterEvents.chatSend) {
    world.afterEvents.chatSend.subscribe((event) => {
      handleCommand(event.sender, event.message);
    });
  }
} catch (e) {}

// ------------------------------------------------------------
// Events: use item / interact block / interact entity
// ------------------------------------------------------------

try {
  if (world.afterEvents.playerUseItem) {
    world.afterEvents.playerUseItem.subscribe((event) => {
      tryFire(event.player);
    });
  }
} catch (e) {}

// Some 26.x builds only raise itemStartUse for hand-equipped items
try {
  if (world.afterEvents.itemStartUse) {
    world.afterEvents.itemStartUse.subscribe((event) => {
      if (event.itemStack?.typeId === CONFIG.ITEM_ID) tryFire(event.source);
    });
  }
} catch (e) {}

try {
  if (world.afterEvents.playerInteractWithBlock) {
    world.afterEvents.playerInteractWithBlock.subscribe((event) => {
      if (!isHoldingDevice(event.player)) return;
      triggerBlast(event.player, {
        location: event.block.center(),
        block: event.block,
        entity: null,
        distance: 0,
      });
    });
  }
} catch (e) {}

try {
  if (world.afterEvents.playerInteractWithEntity) {
    world.afterEvents.playerInteractWithEntity.subscribe((event) => {
      if (!isHoldingDevice(event.player)) return;
      triggerBlast(event.player, {
        location: event.target.location,
        block: null,
        entity: event.target,
        distance: 0,
      });
    });
  }
} catch (e) {}

// ------------------------------------------------------------
// Aim helper in the action bar
// ------------------------------------------------------------

system.runInterval(() => {
  currentTick += 5;

  for (const player of world.getPlayers()) {
    if (!isHoldingDevice(player)) continue;
    if (!CONFIG.SHOW_AIM_HELPER) continue;

    const target = getAimTarget(player);
    try {
      if (target) {
        player.onScreenDisplay.setActionBar(
          `§b◎ §7Target: §f${Math.round(target.distance)}m §8| §bUse to BOOM!`
        );
      } else {
        player.onScreenDisplay.setActionBar(
          `§b◎ §7Aim at a block/entity (${CONFIG.AIM_RANGE}m) §8| §bUse to BOOM!`
        );
      }
    } catch (e) {}
  }
}, 5);

system.run(() => {
  console.log("[Arena Blaster] Loaded on Script API 2.x. Use /scriptevent arena:device to get the device.");
});
