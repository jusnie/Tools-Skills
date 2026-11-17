// ============================================================
// Arena Blaster - Instellar Arena Device
// Aim at the land -> lock-on -> charge -> orbital beam -> impact
// -> the land is rebuilt in real blocks, outwards from the middle
// Built for Minecraft Bedrock 26.x (Script API 2.x / @minecraft/server 2.1.0)
// ============================================================

import { world, system, ItemStack, EntityComponentTypes } from "@minecraft/server";
import { CONFIG } from "./config.js";
import { restoreCamera, restoreAllCameras } from "./cutscene.js";
import {
  fireStrike,
  STRIKES,
  STRIKE_ORDER,
  currentStrike,
  setStrike,
  cycleStrike,
  isBusy,
  cancelStrike,
} from "./strike.js";

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
      if (ent.typeId === "arena:alien_ship") continue;
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
// Firing
// ------------------------------------------------------------

function triggerBlast(player, target) {
  const now = currentTick;
  const last = cooldowns.get(player.id) ?? -9999;
  if (now - last < CONFIG.COOLDOWN_TICKS) return;
  if (isBusy(player)) {
    try {
      player.onScreenDisplay.setActionBar("§cStrike in progress — /arena:stop to end it.");
    } catch (e) {}
    return;
  }
  cooldowns.set(player.id, now);
  fireStrike(player, target);
}

// ------------------------------------------------------------
// Giving the device
// ------------------------------------------------------------

function giveDevice(player) {
  try {
    const inv = getInventory(player);
    if (inv && inv.container) {
      try {
        inv.container.addItem(new ItemStack(CONFIG.ITEM_ID, 1));
      } catch (e) {
        runCommandSafe(player.dimension, `give "${player.name}" ${CONFIG.ITEM_ID} 1`);
      }
    } else {
      runCommandSafe(player.dimension, `give "${player.name}" ${CONFIG.ITEM_ID} 1`);
    }
    player.sendMessage(
      "§a§l[Arena Blaster]§r §7You have the §bInstellar Arena Device§7. Aim at the land and §bUse§7 to call a strike. §8(/arena:next cycles the laser)"
    );
  } catch (e) {
    console.warn(`[Arena Blaster] give failed: ${e}`);
  }
}

// ------------------------------------------------------------
// Commands (Script API 2.1+ custom commands)
// ------------------------------------------------------------

function fireAtCrosshair(player, key) {
  const target = getAimTarget(player);
  if (!target) {
    try {
      player.onScreenDisplay.setActionBar("§cNO TARGET IN RANGE — aim at the land.");
    } catch (e) {}
    return;
  }
  cooldowns.set(player.id, currentTick);
  fireStrike(player, target, key);
}

try {
  system.beforeEvents.startup.subscribe((init) => {
    const registry = init.customCommandRegistry;
    if (!registry) return;

    try {
      registry.registerCommand(
        {
          name: "arena:device",
          description: "Get the Instellar Arena Device",
          permissionLevel: 0,
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
          name: "arena:strike",
          description: "Call an orbital strike at your crosshair (cycle lasers with /arena:next)",
          permissionLevel: 0,
          cheatsRequired: false,
        },
        (origin) => {
          const player = origin.sourceEntity;
          if (!player) return { status: 1, message: "Run this as a player." };
          system.run(() => fireAtCrosshair(player, undefined));
          return { status: 0, message: "§bArena Blaster: strike inbound!" };
        }
      );
    } catch (e) {}

    try {
      registry.registerCommand(
        {
          name: "arena:next",
          description: "Cycle which orbital strike the device fires",
          permissionLevel: 0,
          cheatsRequired: false,
        },
        (origin) => {
          const player = origin.sourceEntity;
          if (!player) return { status: 1, message: "Run this as a player." };
          const next = cycleStrike(player);
          const plan = STRIKES[next];
          system.run(() => {
            try {
              player.onScreenDisplay.setActionBar(`${plan.colour}${plan.title}§7 loaded`);
              player.sendMessage(`${plan.colour}§l${plan.title}§r §7— ${plan.blurb}`);
            } catch (e) {}
          });
          return { status: 0, message: `§7Loaded: ${plan.colour}${plan.title}` };
        }
      );
    } catch (e) {}

    try {
      registry.registerCommand(
        {
          name: "arena:camera",
          description: "Give the camera back to the player (fixes a stuck cutscene camera)",
          permissionLevel: 0,
          cheatsRequired: false,
        },
        (origin) => {
          const player = origin.sourceEntity;
          system.run(() => {
            if (player) restoreCamera(player);
            else restoreAllCameras();
          });
          return { status: 0, message: "§7Camera restored." };
        }
      );
    } catch (e) {}

    try {
      registry.registerCommand(
        {
          name: "arena:stop",
          description: "Stop the running orbital strike",
          permissionLevel: 0,
          cheatsRequired: false,
        },
        (origin) => {
          const player = origin.sourceEntity;
          if (!player) return { status: 1, message: "Run this as a player." };
          const stopped = cancelStrike(player);
          system.run(() => restoreCamera(player));
          return {
            status: 0,
            message: stopped ? "§7Strike stopped. What it already did stays." : "§7Nothing was running.",
          };
        }
      );
    } catch (e) {}
  });
} catch (e) {
  console.warn(`[Arena Blaster] custom command setup skipped: ${e}`);
}

// Safety net: if a world was saved mid-cutscene, hand the camera back on join.
try {
  world.afterEvents.playerSpawn.subscribe((event) => {
    if (!event.initialSpawn) return;
    system.runTimeout(() => {
      try {
        restoreCamera(event.player);
      } catch (e) {}
    }, 40);
  });
} catch (e) {}

// Chat/scriptevent fallbacks: !device, !strike, /scriptevent arena:device
try {
  system.afterEvents.scriptEventReceive.subscribe(
    (event) => {
      const player = event.sourceEntity;
      if (!player) return;
      const id = event.id.toLowerCase();
      if (id === "arena:device") giveDevice(player);
      else if (id === "arena:strike") fireAtCrosshair(player, undefined);
      else if (id === "arena:next") cycleStrike(player);
      else if (id === "arena:stop") cancelStrike(player);
    },
    { namespaces: ["arena"] }
  );
} catch (e) {}

function handleChat(player, message) {
  if (!player || !message) return false;
  const m = message.trim().toLowerCase();
  if (m === "!device") {
    giveDevice(player);
    return true;
  }
  if (m === "!strike" || m === "!ship") {
    fireAtCrosshair(player, undefined);
    return true;
  }
  if (m === "!next") {
    const next = cycleStrike(player);
    const plan = STRIKES[next];
    try {
      player.sendMessage(`${plan.colour}${plan.title}§r §7— ${plan.blurb}`);
    } catch (e) {}
    return true;
  }
  return false;
}

try {
  if (world.afterEvents.message) {
    world.afterEvents.message.subscribe((event) => handleChat(event.sender, event.message));
  }
} catch (e) {}

try {
  if (world.afterEvents.chatSend) {
    world.afterEvents.chatSend.subscribe((event) => handleChat(event.sender, event.message));
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
    const plan = STRIKES[currentStrike(player)] ?? STRIKES.plasma;
    const name = CONFIG.SHOW_STRIKE_NAME ? `${plan.colour}${plan.title}§8 | ` : "";
    if (isBusy(player)) continue;
    try {
      if (target) {
        player.onScreenDisplay.setActionBar(
          `${name}§b◎ §7Target: §f${Math.round(target.distance)}m §8| §bUse to STRIKE`
        );
      } else {
        player.onScreenDisplay.setActionBar(
          `${name}§b◎ §7Aim at the land (${CONFIG.AIM_RANGE}m) §8| §bUse to STRIKE`
        );
      }
    } catch (e) {}
  }
}, 5);

system.run(() => {
  console.log("[Arena Blaster] Loaded. /arena:device for the designator, /arena:next to cycle lasers, /arena:strike to fire.");
});
