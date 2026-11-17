# 💥 Arena Blaster — Instellar Arena Device (Minecraft Bedrock Addon)

**Point at a block/entity → charge → BOOM explosion + arena ring animation!**

A Bedrock addon with a custom sci-fi device. Hold it, aim with your crosshair, press **Use** — it shoots a beam, charges up, then explodes at the target with particles, sound, damage, a crater, and a glowing arena ring on the ground.

---

## 📦 Files

| File | What it is |
|---|---|
| `dist/ArenaBlaster.mcaddon` | **Install this one** — contains both packs |
| `dist/ArenaBlaster_BP.mcpack` | Behavior Pack only (logic + item) |
| `dist/ArenaBlaster_RP.mcpack` | Resource Pack only (textures + particles) |

Source folders:
- `ArenaBlaster_BP/` — behavior pack (item + `scripts/main.js`)
- `ArenaBlaster_RP/` — resource pack (3D model + textures + 5 particles)
- `tools/generate_textures.py` — regenerates all PNGs
- `tools/generate_3d_texture.py` — regenerates the 64×64 3D texture

---

## 🔫 Polished 3D Device Model (v2)

The device is now a **real 3D model in your hand** (not just a flat icon), built with the official Bedrock **attachable** method:

| File | Role |
|---|---|
| `ArenaBlaster_RP/models/entity/instellar_device.geo.json` | 3D geometry — 14 cubes: body, barrel, muzzle ring, cyan lens, orange cell, grip, sight fin, antenna, vents, rear cap |
| `ArenaBlaster_RP/textures/items/instellar_device_3d.png` | 64×64 detailed texture (metal panels, rivets, glow lens/cell) |
| `ArenaBlaster_RP/attachables/instellar_device.player.json` | Attachable — shows the model in hand (first/third person, main/off hand) |
| `ArenaBlaster_RP/animations/instellar_device.animation.json` | Hold poses + **charge shake** (plays while you hold Use) + recoil |
| `ArenaBlaster_BP/items/instellar_device.json` | `minecraft:wearable` (mainhand) so the attachable appears |

**References used (GitHub):**
- [MicrosoftDocs/minecraft-creator — AddCustomItems (Wrench)](https://github.com/MicrosoftDocs/minecraft-creator/blob/main/creator/Documents/AddCustomItems.md) — official attachable + geo pattern
- [Nogard-YT/Mace_3D_RP_Bedrock](https://github.com/Nogard-YT/Mace_3D_RP_Bedrock) — real 3D weapon RP (attachable + custom first/third-person animations)
- [AzureDoom/AzureLib](https://github.com/AzureDoom/AzureLib) — Bedrock models/animations for items (Java mod reference)

> Edit the model in [Blockbench](https://github.com/JannisX11/blockbench) (Bedrock Entity format), export `.geo.json`, and replace the file above. See `preview_device.png` for the concept look.

---

## 🎮 How to Use

1. **Get the device** — in-game, type:
   ```
   /arena:device
   ```
   (also works: `/scriptevent arena:device`, or `/give @s arena:instellar_device` with cheats ON)
2. **Hold the device** in your hand.
3. **Aim** your crosshair at a block or entity (within **32 blocks**). The action bar shows `◎ Target: Xm | Use to BOOM!`
4. **Press Use** (right-click / Use button / tap on the target) → beam + charge → **💥 BOOM!**
   - Explosion particles + sparks + shockwave ring
   - Vanilla explosion + extra damage + knockback
   - Crater (destroys blocks in radius 2)
   - Glowing **arena ring** of glowstone + expanding particle rings
   - Fire at impact point
5. Cooldown: **1.5 seconds** between shots.
6. **No device needed:** aim at a block and run `/arena:ship` (or `/scriptevent arena:ship`) to call a strike.

> Works on blocks, mobs, and players. The shooter is not hurt by their own blast.

---

## 📥 Install

### Android / iOS (Bedrock PE)
1. Download `dist/ArenaBlaster.mcaddon` to your phone.
2. Tap the file → Minecraft opens → **Import** → wait for "Import Successful".
3. Create/edit a world → **Edit** → **Behavior Packs** → activate `Arena Blaster - Behavior Pack` → **Resource Packs** → activate `Arena Blaster - Resource Pack`.
4. Leave **Experiments OFF**. This build targets **Minecraft 26.x** / **Script API 2.1.0** (`min_engine_version` 1.26.0) and does not need Beta APIs.
5. Play → chat `!device`.

### Windows 10/11 (Bedrock)
1. Double-click the `.mcaddon` file → Minecraft imports it.
2. Same as above: activate both packs in your world settings.
3. Play → run `/arena:device`.

### Manual (if .mcaddon doesn't import)
- Unzip `ArenaBlaster_BP.mcpack` → copy folder to `games/com.mojang/behavior_packs/`
- Unzip `ArenaBlaster_RP.mcpack` → copy folder to `games/com.mojang/resource_packs/`
- Activate both in world settings.

---

## ⚙️ Customize

Edit `ArenaBlaster_BP/scripts/config.js`:

```js
AIM_RANGE: 32,            // how far you can aim
EXPLOSION_POWER: 4,       // vanilla explosion power (1-10)
ENTITY_DAMAGE: 12,         // extra damage
DESTROY_BLOCKS: true,     // crater on/off
DESTROY_RADIUS: 2,
CREATE_ARENA_RING: true,  // glowstone ring on/off
ARENA_RING_RADIUS: 4,
COOLDOWN_TICKS: 30,       // 20 ticks = 1 sec
CHARGE_TICKS: 10,         // charge delay before BOOM
```

After editing, re-zip the BP folder into a `.mcpack` (manifest must stay at the zip root) and re-import.

### Change particle colors
Edit `ArenaBlaster_RP/particles/*.json` → `particle_appearance_tint` gradient colors (hex like `"#FF6A00"`).

---

## 🧩 How It Works (for devs)

- **Item:** `arena:instellar_device` (`items/instellar_device.json`)
- **Script:** `scripts/main.js` (Script API 2.1.0, `min_engine_version` 1.26.0)
  - `getBlockFromViewDirection` + `getEntityFromViewDirection` → crosshair raycast
  - `playerUseItem` / `playerInteractWithBlock` / `playerInteractWithEntity` → fire trigger
  - `dimension.spawnParticle` → beam / charge / explosion / sparks / ring
  - `dimension.runCommand("explode ...")` → vanilla explosion
  - `entity.applyDamage` + `applyImpulse` → extra damage + knockback
  - Block loop → crater; glowstone circle → arena ring
- **Particles:** `arena:explosion`, `arena:sparks`, `arena:ring`, `arena:beam`, `arena:charge`

---

## 🛠️ Troubleshooting

| Problem | Fix |
|---|---|
| `/arena:device` does nothing | Pack not active, or world older than 1.26. Check Content Log (Settings → Creator → Content Log GUI) for `[Arena Blaster]` lines. |
| Device not in inventory | Use `/arena:device` or `/give @s arena:instellar_device` (cheats ON). |
| No explosion particles | Resource Pack not activated, or particles disabled in Settings → Creator. |
| "Script error" on load | Make sure you imported the **.mcaddon** (both packs), not just one. |
| Too laggy | Lower `EXPLOSION_POWER` / `DESTROY_RADIUS` in config.js. |

---

## 📄 License

MIT — free to use, modify, and share. Not affiliated with Mojang/Microsoft.
