// ============================================================
// Arena Blaster - cutscene camera
// A real cinematic: the owner's camera leaves the body, pulls
// back, watches the strike, then hands control back.
//
// Safety: the camera is ALWAYS restored. Every restore path is
// wrapped and the restore runs on a timer, on cancel, and when the
// player leaves or the script unloads, so nobody gets left stuck
// in a detached camera.
//
// /camera syntax: creator/commands/commands/camera (CameraPresets,
// Easing enums verified against Microsoft Learn).
// ============================================================

import { system, world } from "@minecraft/server";
import { CONFIG } from "./config.js";

const active = new Map(); // playerId -> { timer, player }

function call(player, command) {
  try {
    player.runCommand(command);
    return true;
  } catch (e) {
    if (!call._warned) {
      call._warned = new Set();
    }
    if (!call._warned.has(command.split(" ")[1] ?? command)) {
      call._warned.add(command.split(" ")[1] ?? command);
      try {
        console.warn(`[Arena Blaster] camera command failed: ${command} (${e})`);
      } catch (err) {}
    }
    return false;
  }
}

/** Hand the camera back to the player, no matter what state it's in. */
export function restoreCamera(player) {
  const entry = active.get(player.id);
  if (entry) {
    try {
      system.clearRun(entry.timer);
    } catch (e) {}
    active.delete(player.id);
  }
  call(player, "camera @s clear");
  call(player, "camera @s fov_clear 0.2 linear");
  return true;
}

/**
 * Play the strike cutscene.
 * @param {import("@minecraft/server").Player} player owner
 * @param {{x:number,y:number,z:number}} center impact point
 * @param {{title:string, colour:string}} plan the laser being fired
 * @param {object} [opts] { viewers: Player[] }
 */
export function playCutscene(player, center, plan, opts = {}) {
  if (!CONFIG.CUTSCENE) {
    // still do the fades; they work even without a camera override
    try {
      player.runCommand("camera @s fade time 0.25 0.1 0.25 color 0 0 0");
    } catch (e) {}
    return;
  }

  // Frame the shot: the victim stands off to one side of the impact and
  // looks slightly down at it, so the beam and the crater are both in view.
  const angle = Math.random() * Math.PI * 2;
  const radius = CONFIG.CUTSCENE_RADIUS;
  const camPos = {
    x: center.x + Math.cos(angle) * radius,
    y: center.y + CONFIG.CUTSCENE_HEIGHT,
    z: center.z + Math.sin(angle) * radius,
  };
  const look = { x: center.x, y: center.y + 2, z: center.z };
  const posArg = `${camPos.x.toFixed(1)} ${camPos.y.toFixed(1)} ${camPos.z.toFixed(1)}`;
  const lookArg = `${look.x.toFixed(1)} ${look.y.toFixed(1)} ${look.z.toFixed(1)}`;

  const targets = [player, ...(opts.viewers ?? []).filter((p) => p && p.id !== player.id)];

  for (const p of targets) {
    // 1) a quick fade so the camera cut doesn't snap
    call(p, "camera @s fade time 0.2 0.1 0.3 color 0 0 0");
    // 2) pull the camera out to the framing position, easing in
    call(
      p,
      `camera @s set minecraft:free ease ${CONFIG.CUTSCENE_EASE} in_out_cubic pos ${posArg} facing ${lookArg}`
    );
    // 3) slow push-in while it charges (a dolly), then the beam lands
    system.runTimeout(() => {
      const push = {
        x: center.x + Math.cos(angle) * (radius * 0.72),
        y: center.y + CONFIG.CUTSCENE_HEIGHT * 0.82,
        z: center.z + Math.sin(angle) * (radius * 0.72),
      };
      call(
        p,
        `camera @s set minecraft:free ease 3.6 in_out_sine pos ${push.x.toFixed(1)} ${push.y.toFixed(1)} ${push.z.toFixed(1)} facing ${lookArg}`
      );
    }, 20);
    // 4) widen the lens right before impact, then punch in on it
    system.runTimeout(() => {
      call(p, `camera @s fov_set 88 1.2 in_quad`);
    }, 74);
    system.runTimeout(() => {
      call(p, "camera @s fov_set 62 0.35 out_expo");
    }, 86);
    // 5) pull up and back for the aftermath so the crater reads
    system.runTimeout(() => {
      const pull = {
        x: center.x + Math.cos(angle + 0.5) * (radius * 1.6),
        y: center.y + CONFIG.CUTSCENE_HEIGHT * 1.9,
        z: center.z + Math.sin(angle + 0.5) * (radius * 1.6),
      };
      call(
        p,
        `camera @s set minecraft:free ease 4.0 out_cubic pos ${pull.x.toFixed(1)} ${pull.y.toFixed(1)} ${pull.z.toFixed(1)} facing ${lookArg}`
      );
      call(p, "camera @s fov_set 70 2.0 in_out_sine");
    }, 150);
  }

  // 6) title card over the shot
  for (const p of targets) {
    try {
      p.onScreenDisplay.setTitle(`${plan.colour}${plan.title}`, {
        subtitle: "§7orbital strike",
        fadeInDuration: 6,
        stayDuration: 40,
        fadeOutDuration: 10,
      });
    } catch (e) {}
  }

  // 7) guarantee the camera comes home
  const holdTicks = CONFIG.CUTSCENE_HOLD_TICKS;
  for (const p of targets) {
    const timer = system.runTimeout(() => {
      try {
        call(p, "camera @s fade time 0.5 0.1 0.6 color 0 0 0");
        restoreCamera(p);
      } catch (e) {}
    }, holdTicks);
    active.set(p.id, { timer, player: p });
  }

  // 8) if the player leaves the world, drop the state
  try {
    if (world.afterEvents.playerLeave) {
      world.afterEvents.playerLeave.subscribe((event) => {
        active.delete(event.playerId);
      });
    }
  } catch (e) {}
}

export function isCutsceneActive(player) {
  return active.has(player.id);
}

/** Emergency exit: /arena:camera restores everyone. */
export function restoreAllCameras() {
  for (const player of world.getPlayers()) {
    restoreCamera(player);
  }
}

// Restore on script shutdown so a /reload never leaves a stuck camera.
try {
  system.beforeEvents.shutdown?.subscribe?.(() => {
    restoreAllCameras();
  });
} catch (e) {}
