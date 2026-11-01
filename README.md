# Hoardlands

An original isometric fantasy sandbox RPG built around **collecting gear**. It's inspired by the classic skill-based online RPGs of the late 90s, with a modern loot and collection loop on top.

Everything runs in the browser with plain JavaScript and Canvas. There is no build step and there are no art files. All terrain, buildings, characters, monsters and item icons are drawn in code.

## Run it

Browsers block scripts on `file://` pages in some setups, so serve the folder locally:

```bash
python -m http.server 8642
```

Then open http://localhost:8642. Progress saves automatically in the browser (4 character slots).

## What's in the base game

- **In-depth character creator.** Pick from 8 professions or build a custom one. Customize body, skin, 8 hair styles, hair color, facial hair and outfit colors with a live animated preview. Spend 100 attribute points on Str/Dex/Int and 150 skill points across up to 4 of 21 skills. Choose one of 7 birthsigns and one of 3 starting towns, then review before you start.
- **Classless skill system.** 21 skills from 0 to 100 that rise with use, with a 720 total cap and raise/lower/lock controls per skill. Stats grow from skill gains. Titles run from Novice to Grandmaster.
- **World.** A 192×192 procedural vale (fixed seed) with plains, forests, a swamp, mountains, coast and sea. It has 3 towns (Havenmoor, Ironreach, Saltmere), roads, a day/night cycle with town lights, and 2 boss lairs.
- **Loot.** Gear comes in 5 rarities with random affixes (damage, life leech, fire, luck, skill bonuses and more). There are 13 named Artifacts, material tiers (Iron to Starmetal, Pine to Elderwood, Hide to Drakescale, Linen to Shadowsilk), loot beams, rare-drop fanfare and gear comparison tooltips.
- **Gathering.** Mining (ore and gems), Lumberjacking, Fishing (including Sunken Coffers) and Herbalism. All of them auto-repeat.
- **Crafting.** Blacksmithing, Tailoring, Woodworking, Alchemy, Cooking and Smelting. Exceptional crafts can roll Uncommon through Legendary.
- **Combat and magic.** Melee and archery with swing timers, parrying and shields, 7 spells, bandages, potions and buff food.
- **Pets and mounts.** Tame wolves, bears, horses and even drakes, or buy a horse at a stable and ride it.
- **Economy.** 11 vendor types to buy from and sell to, skill training, a bank vault and "sell all junk".
- **Reasons to come back.** The Codex collection log has milestone titles, gold and permanent Luck. There are 3 daily bounties, a Bounty Seal shop, a daily gift with a login streak, treasure chests in the wilds and respawning bosses.

## Controls

Left-click to walk or interact (hold to keep walking). Use WASD or arrows to move, right-click a creature for options and the mouse wheel to zoom.
`1`–`7` cast spells, `8` uses a bandage, `9` and `0` drink potions, `Space` loots and `R` mounts.
`C` Character · `I` Backpack · `K` Skills · `J` Codex · `B` Bounties · `U` Crafting · `P` Pets · `M` Map · `H` Help.

## Adding generated art

`art/PROMPTS.md` has a consistent prompt pack for ChatGPT or Grok (item icons, artifacts, profession portraits and monster portraits). Save each image as `assets/icons/<itemId>.png` (or `assets/portraits/`, `assets/monsters/`), add its id to `assets/manifest.js`, and reload. Anything not listed falls back to the built-in drawings.

## Code layout

| File | Purpose |
|---|---|
| `js/data.js` | All game data: skills, professions, items, materials, affixes, artifacts, monsters, recipes, towns, vendors |
| `js/items.js` | Item creation, stats, naming, loot rolls, Codex |
| `js/world.js` | World generation and A* pathfinding |
| `js/sprites.js` | Procedural art |
| `js/render.js` | Isometric renderer, lighting, effects |
| `js/entities.js` | Game state, movement, mob and pet AI, combat, spawning |
| `js/player.js` | Player stats, skills, inventory, actions, bounties, save data |
| `js/crafting.js` | Crafting, shops, training |
| `js/ui.js` | HUD and all windows |
| `js/creator.js` | Title screen and character creator |
| `js/main.js` | Main loop, input, saving |

## Roadmap ideas

Player housing, sailing and ships, dungeons, jewelcrafting with gems, reagent-based spellbooks, more regions, item durability and repair, and multiplayer.
