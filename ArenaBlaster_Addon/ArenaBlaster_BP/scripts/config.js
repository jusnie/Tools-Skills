// ============================================================
// Arena Blaster - CONFIG
// Edit these values to balance the device. Tuned for Minecraft
// Bedrock 26.x (Script API 2.x, @minecraft/server 2.1.0).
// ============================================================

export const CONFIG = {
  // Item id (must match items/instellar_device.json)
  ITEM_ID: "arena:instellar_device",

  // How far the designator can aim (blocks)
  AIM_RANGE: 64,

  // Which strike the designator fires by default
  // "plasma" | "godly" | "nuke" | "rod"
  DEFAULT_STRIKE: "plasma",

  // Vanilla explosion at the impact point (1-10). Keep low; the
  // crater itself is carved by the terrain engine.
  EXPLOSION_POWER: 4,

  // Direct damage to mobs near the impact
  ENTITY_DAMAGE: 14,
  DAMAGE_RADIUS: 12,

  // Terrain engine: blocks edited per tick. Higher = faster crater,
  // more lag. 140 is a good balance on a mid-range device.
  BLOCKS_PER_TICK: 140,

  // Land shaping switches
  CREATE_ARENA_RING: true,
  KEEP_TREES: false,

  // Cooldown between strikes (ticks, 20 = 1 second)
  COOLDOWN_TICKS: 60,

  // Aim helper in the action bar
  SHOW_AIM_HELPER: true,

  // Show the strike name + distance while aiming
  SHOW_STRIKE_NAME: true,
};
