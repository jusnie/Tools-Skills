// ============================================================
// Arena Blaster - CONFIG (edit these values to balance the device)
// ============================================================

export const CONFIG = {
  // Item id (must match items/instellar_device.json)
  ITEM_ID: "arena:instellar_device",

  // How far the device can aim (blocks)
  AIM_RANGE: 32,

  // Explosion power (vanilla explode command power, 1-10)
  EXPLOSION_POWER: 4,

  // Extra entity damage on top of vanilla explosion
  ENTITY_DAMAGE: 12,

  // Damage radius (blocks)
  DAMAGE_RADIUS: 5,

  // Destroy blocks in radius? true = crater, false = particles only
  DESTROY_BLOCKS: true,
  DESTROY_RADIUS: 2,

  // Create arena ring of glowstone around impact point?
  CREATE_ARENA_RING: true,
  ARENA_RING_RADIUS: 4,
  ARENA_RING_BLOCK: "glowstone",

  // Cooldown between shots (ticks, 20 ticks = 1 second)
  COOLDOWN_TICKS: 30,

  // Charge delay before explosion (ticks, 10 = 0.5 sec)
  CHARGE_TICKS: 10,

  // Show aim helper in action bar?
  SHOW_AIM_HELPER: true,

  // Give command (chat "!device" to get the device)
  GIVE_COMMAND: "!device",

  // Sounds (vanilla sound ids)
  SOUND_CHARGE: "random.fuse",
  SOUND_EXPLODE: "random.explode",
  SOUND_BEAM: "random.shoot",

  // --- Alien spaceship orbital strike sequence ---
  USE_SHIP_SEQUENCE: true, // true = ship flies in, false = instant blast
  SHIP_ID: "arena:alien_ship",
  SHIP_SPAWN_HEIGHT: 30, // spawn height above target
  SHIP_HOVER_HEIGHT: 12, // hover height above target
  SHIP_DESCEND_TICKS: 40, // fly-in time (20 ticks = 1s)
  SHIP_CHARGE_TICKS: 40, // charge time
  SHIP_AIM_TICKS: 20, // aim/lock time
  SHIP_LEAVE_TICKS: 40, // fly-away time
  SHIP_COMMAND: "!ship", // chat command to test strike at crosshair
};
