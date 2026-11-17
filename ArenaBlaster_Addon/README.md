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
| `ArenaBlaster_RP/models/entity/instellar_device.geo.json` | 3D geometry — model-bound to `q.item_slot_to_bone_name(context.item_slot)`, 11 cubes: body, core block, barrel, muzzle ring, lens, grip, fins, antenna, base plate |
| `ArenaBlaster_RP/textures/items/instellar_device_3d.png` | 64×64 detailed texture (metal panels, rivets, glow lens/cell) |
| `ArenaBlaster_RP/attachables/instellar_device.player.json` | Attachable — shows the model in hand (first/third person, main/off hand) |
| `ArenaBlaster_RP/animations/instellar_device.animation.json` | Hold poses (first/third person, main/off hand) — required, the binding offsets the model by -24 Y without them |
| `ArenaBlaster_BP/items/instellar_device.json` | `minecraft:hand_equipped` + `minecraft:glint`, format 1.21.70 |

**References used (GitHub):**
- [MicrosoftDocs/minecraft-creator — AddCustomItems (Wrench)](https://github.com/MicrosoftDocs/minecraft-creator/blob/main/creator/Documents/AddCustomItems.md) — official attachable + geo pattern
- [Nogard-YT/Mace_3D_RP_Bedrock](https://github.com/Nogard-YT/Mace_3D_RP_Bedrock) — real 3D weapon RP (attachable + custom first/third-person animations)
- [AzureDoom/AzureLib](https://github.com/AzureDoom/AzureLib) — Bedrock models/animations for items (Java mod reference)

> Edit the model in [Blockbench](https://github.com/JannisX11/blockbench) (Bedrock Entity format), export `.geo.json`, and replace the file above. See `preview_device.png` for the concept look.

---

## 🎮 How to Use

> **v7 — rebuilt after studying [Stink-O/orbital-laser](https://github.com/Stink-O/orbital-laser).** A strike is now a staged
> timeline over ~11 seconds, and the land is rebuilt as **real blocks** in expanding rings instead of one `explode` call.

1. **Get the designator** — in-game:
   ```
   /arena:device
   ```
   (also `/scriptevent arena:device`, or `/give @s arena:instellar_device` with cheats on)
2. **Pick a laser** — `/arena:next` cycles them:
   | Laser | What it leaves |
   |---|---|
   | **PLASMA** | Crater fused into obsidian, black glass and magma; scorched basalt outward; glowstone ring |
   | **GODLY** | Quartz-and-gold crater with a sea-lantern sigil ring, calcite scorch, flowers blooming outward |
   | **NUKE** | A bomb falls in, mushroom cloud, big crater with a glassed floor, hundreds of blocks flattened |
   | **ROD FROM GOD** | A tungsten rod drops, drives a narrow shaft to the deepstone, white-and-gold lined crater |
3. **Hold the designator**, aim at the land (up to **64 blocks**) — the action bar shows `LASER | Target: Xm`.
4. **Right-click / Use** → lock-on → charge → beam → **IMPACT**:
   - camera shake on lock-on and a hard jolt at impact
   - beam/charge particles converging on the point, or the bomb falling in (Nuke / Rod)
   - the crater is then **carved ring by ring**, at 140 blocks per tick, so it never freezes the world
   - scorch band, felled trees, rubble, thrown blocks dropping back, shockwave ring racing outward, smoke column
   - the impact sound reaches you **late by distance** (343 blocks a second), like real thunder
5. **Stop it** — `/arena:stop` ends the running strike (what it already did stays).
6. Cooldown **3 seconds**; only one strike runs at a time.

Tuning lives in `scripts/config.js`: `AIM_RANGE`, `BLOCKS_PER_TICK`, `EXPLOSION_POWER`, `CREATE_ARENA_RING`,
`KEEP_TREES`, `DEFAULT_STRIKE`. Each laser's crater size, lining blocks and effects live in `scripts/strike.js`.

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
- **Scripts:** `scripts/main.js` (designator, raycast, commands), `scripts/strike.js` (the four lasers + timeline),
  `scripts/terrain.js` (block-edit engine), `scripts/config.js` (tuning) — Script API 2.1.0, `min_engine_version` 1.26.0
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
