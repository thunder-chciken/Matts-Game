# Hoardlands - Art Prompt Pack

Paste-ready prompts for ChatGPT (GPT image) or Grok Imagine. Ids below are the exact item ids from `js/data.js`.

## 1. How to use

1. Start every icon prompt with the **STYLE BLOCK** (section 2), then add the line for that item (section 3).
2. Generate each icon as a **square PNG, 512x512, TRANSPARENT background**.
   - If the tool cannot output transparency, add this sentence to the prompt: `Background: flat pure magenta #FF00FF, no gradient, no shadow on the background.` Then key the magenta out afterwards (any editor's "color to alpha" / remove-background step).
3. Save as `assets/icons/<id>.png` using the **exact id** (example: `assets/icons/longsword.png`, `assets/icons/ore_copper.png`, `assets/icons/tr_wolf.png`).
4. Portraits go in `assets/portraits/<name>.png` (see sections 4 and 5). Monster portraits optionally go in `assets/monsters/<id>.png`.
5. Consistency tips: generate a whole category in one chat/session so the tool keeps the look; if a result drifts, paste the STYLE BLOCK again; if a tool adds a stray ground shadow or text, re-roll rather than editing.

Quick template:

```
[STYLE BLOCK]
Subject: [line from the lists below]
```

## 2. STYLE BLOCK (prepend to every icon prompt)

```
Hand-painted fantasy RPG inventory icon, single object centered on the canvas with a small even margin, 3/4 view angled 45 degrees (for weapons and long tools: hilt/handle at bottom-left, tip/head at top-right), soft rim light from the top-left, subtle dark outline, rich saturated colors and clear value contrast, bold simple shapes that stay readable when shrunk to 40px, painterly brushwork with gentle texture, original fantasy design, square 1:1 composition, transparent background. No text, no letters, no frame, no border, no background scene, no hands, no characters, no drop-shadow plane, no watermark.
```

(Keep the line "transparent background" out and use the magenta sentence from section 1 instead if your tool cannot do alpha.)

## 3. Icon prompts by category

**Note on materials:** the game tints gear in code by material (iron/copper/silver/mithril/adamantite/starmetal for metal, pine/oak/ash/yew/ironwood/elderwood for wood, plain/thick/drakescale hide, linen/silk/shadowsilk cloth). So draw all gear in a neutral **plain iron / pine / plain-leather / linen** version with natural mid-tone colors, no gems or magical glow. Resources (ores, ingots, logs, hides, cloth) are drawn in their actual material color because they are shown as-is.

### Weapons (17)

- `dagger` - short double-edged iron dagger with a plain steel crossguard and wrapped brown leather grip, small round pommel.
- `rapier` - slender iron rapier with a swept-hilt cup guard, long thin blade, leather grip.
- `spear` - long pine-shafted spear with a leaf-shaped iron head, leather wrap below the head, shown diagonally.
- `shortsword` - straight single-handed iron short sword, simple crossguard, leather-wrapped grip, round pommel.
- `longsword` - classic iron longsword with a straight crossguard, fuller down the blade, leather grip, disc pommel.
- `scimitar` - curved single-edged iron scimitar with a swept guard and a leather grip, gentle blade curve.
- `katana` - slightly curved iron katana with a round tsuba-style guard and dark wrapped grip, original fantasy styling, no markings.
- `greatsword` - oversized two-handed iron greatsword with a broad blade, long grip and heavy crossguard.
- `battleaxe` - two-handed battle axe with a pine haft and a broad double-bitted iron head.
- `club` - rough pine club, thick knobbed head tapering to a handle, a few bark scratches.
- `mace` - iron flanged mace on a short pine haft with leather grip, six metal flanges.
- `warhammer` - two-handed war hammer with a long pine haft, heavy iron hammer head on one side and a spike on the other.
- `quarterstaff` - plain long pine quarterstaff with iron-capped ends and a leather grip wrap in the middle.
- `wizstaff` - pine wizard staff with a twisted crook top holding a small clear blue-white crystal, a few carved rune lines, faint glow.
- `shortbow` - simple pine recurve shortbow with a taut string and a leather grip, no arrow nocked.
- `longbow` - tall pine longbow with a gently curved limb, string and wrapped grip, no arrow nocked.
- `crossbow` - pine-stocked crossbow with iron prod, trigger and string, cocked, no bolt.

### Armor (19)

- `leathercap` - plain-leather skullcap with stitched seams and a small brim.
- `chaincoif` - iron chain mail coif, riveted rings draping to the neck, hollow face opening.
- `platehelm` - iron full plate helm with a visor slit and a short central ridge, rounded top.
- `wizhat` - tall pointed linen wizard hat with a wide brim and a soft bend at the tip, a plain band.
- `shirt` - simple off-white linen shirt with a laced neckline and rolled sleeves, laid flat in 3/4 view.
- `robe` - long linen robe with wide sleeves, a rope belt and a hood folded at the neck.
- `leathertunic` - plain-leather tunic with stitched seams, shoulder straps and a buckled belt.
- `chaintunic` - iron chain mail hauberk with short sleeves and a hem, visible riveted rings.
- `platechest` - iron plate cuirass with a ridged breastplate, pauldrons and rivets, polished steel.
- `trousers` - plain linen trousers with a drawstring waist, slightly rumpled folds.
- `leatherlegs` - plain-leather leggings with stitched seams and knee patches.
- `chainlegs` - iron chain mail leggings with a leather waist belt.
- `platelegs` - iron plate greaves with articulated knee guards and thigh plates.
- `leathergloves` - a pair of plain-leather gloves with stitched cuffs, one overlapping the other.
- `plategloves` - a pair of iron plate gauntlets with articulated finger plates and flared cuffs.
- `shoes` - a pair of simple plain-leather shoes with a stitched sole and small lace.
- `leatherboots` - a pair of plain-leather boots with folded cuffs and buckled straps.
- `platefeet` - a pair of iron plate sabatons with overlapping toe lames.
- `cloak` - plain linen cloak with a clasp at the neck, draped in soft folds, hood folded back.

### Shields (4)

- `buckler` - small round iron buckler with a central boss and a riveted rim.
- `woodshield` - round pine shield made of vertical planks with an iron boss and a rope-bound rim.
- `kite` - iron kite-shaped shield with a gently curved face and a raised ridge, rivets along the edge, plain surface.
- `tower` - tall rectangular iron tower shield with a reinforced border, rivets and a narrow vertical rib.

### Jewelry (4)

- `ring` - a simple gold ring with a small polished clear gemstone setting, seen at a 3/4 angle.
- `amulet` - gold pendant amulet on a short chain, a round medallion with a small inset stone and etched border.
- `talisman` - pale blue-silver talisman charm, an angular crystal-and-silver trinket tied with a short cord, soft cool glow.
- `rabbitfoot` - lucky rabbit's foot charm with soft cream fur, a small gold cap and a short chain.

### Tools (7)

- `smithhammer` - blacksmith's hammer with a square iron head and a short pine handle, handle bottom-left.
- `sewingkit` - small leather sewing kit roll with a needle, a spool of thread and a thimble peeking out.
- `saw` - woodworker's hand saw with a toothed steel blade and a pine handle.
- `mortar` - stone mortar bowl with a wooden pestle, a few crushed green herb bits inside.
- `fishpole` - slender pine fishing pole with a reel-less line and a small red-and-white bobber hanging from the tip.
- `hatchet` - small iron hatchet with a pine handle and a single curved blade.
- `pickaxe` - miner's pickaxe with a pine handle and a pointed iron head, handle bottom-left.

### Resources (26)

Ores: a chunky raw rock cluster with ore veins and metallic flecks; ingots: a single polished bar with a trapezoid profile and a bright top edge.

- `ore_iron` - rough grey ore chunk with dull steel-grey veins.
- `ore_copper` - rough rock chunk threaded with orange-copper veins and a hint of green patina.
- `ore_silver` - rock chunk with bright silvery-white veins and sparkles.
- `ore_mithril` - rock chunk with glowing icy light-blue veins.
- `ore_adamant` - rock chunk with vivid emerald-green crystalline veins.
- `ore_starmetal` - dark rock chunk with violet-purple veins and tiny star-like glints.
- `ingot_iron` - a single iron ingot bar, matte steel-grey with a lighter top edge.
- `ingot_copper` - a single copper ingot bar, warm orange-brown with a bright highlight.
- `ingot_silver` - a single silver ingot bar, bright white-silver and polished.
- `ingot_mithril` - a single mithril ingot bar, pale sky-blue with a faint inner glow.
- `ingot_adamant` - a single adamantite ingot bar, deep green with a glassy sheen.
- `ingot_starmetal` - a single starmetal ingot bar, violet with a faint glow and tiny sparkles.
- `log_pine` - a short cut pine log, pale yellow-tan wood with visible end rings and bark.
- `log_oak` - a short cut oak log, rich brown wood with thick rugged bark and end rings.
- `log_ash` - a short cut ash log, pale cream wood with light grey bark.
- `log_yew` - a short cut yew log, reddish-orange heartwood with thin bark.
- `log_ironwood` - a short cut ironwood log, dense blue-grey wood with a dark knotted bark.
- `log_elderwood` - a short cut elderwood log, mint-teal wood with a faint magical glow in the rings.
- `hide_plain` - a folded tanned animal hide, warm brown, rough edge stitches.
- `hide_thick` - a rolled thick animal hide, dark chocolate-brown with a heavy texture.
- `hide_scaled` - a folded drakescale hide with overlapping green scales and a faint sheen.
- `cloth_linen` - a folded bolt of plain off-white linen cloth, soft weave texture.
- `cloth_silk` - a folded bolt of pale pink spider silk, glossy with a soft shimmer.
- `cloth_shadowsilk` - a folded bolt of deep indigo-violet shadowsilk, faint dark wisps rising from it.
- `bone` - a single large cream-colored bone, simple knobbed ends, slightly cracked.
- `slimegel` - a small glob of translucent bright green slime gel in a droplet shape, glossy highlight.

### Herbs & Gems (11)

Gems: a single faceted cut stone, bright and clear, one strong highlight.

- `gem_amethyst` - a faceted violet amethyst.
- `gem_ruby` - a faceted deep red ruby.
- `gem_sapphire` - a faceted royal blue sapphire.
- `gem_emerald` - a faceted vivid green emerald, emerald cut.
- `gem_diamond` - a faceted brilliant-cut diamond, icy white with rainbow flecks.
- `gem_stargem` - a faceted pink-opal Star Opal, milky iridescent with a tiny starburst glint inside.
- `sunleaf` - a small bunch of sunleaf, bright golden-yellow leaves with a little stem.
- `moonpetal` - a moonpetal flower sprig with pale blue-lavender petals and a soft glow.
- `frostcap` - a frostcap mushroom cluster, icy cyan caps dusted with frost.
- `emberroot` - an emberroot, a gnarled red-orange root with glowing ember cracks.
- `ghostbloom` - a ghostbloom flower, translucent pale mint-white petals with a faint ghostly aura.

### Fish & Food (13)

- `fish_trout` - a whole raw trout, olive-green back with speckles, silver belly.
- `fish_bass` - a whole raw bass, deep green with a pale belly and a spiky dorsal fin.
- `fish_salmon` - a whole raw salmon, coral-pink with a silver sheen.
- `fish_swordfish` - a whole raw swordfish, blue-grey with a long pointed bill.
- `fish_glowfin` - a whole raw glowfin, sleek with bioluminescent aqua-cyan fins and a soft glow.
- `raw_meat` - a raw red cut of meat on a small bone, marbled with fat.
- `cook_meat` - roast meat on the bone, browned and glistening, a little steam.
- `cook_trout` - a cooked whole trout, golden-brown skin with grill marks.
- `cook_bass` - a grilled bass, charred grill stripes, golden-brown skin.
- `cook_salmon` - smoked salmon fillet, glossy deep orange-pink, a wisp of smoke.
- `cook_sword` - a thick grilled swordfish steak, blue-tinged seared edges, juicy.
- `cook_glow` - a glowing aqua-cyan cooked glowfin feast on a small plain plate, soft sparkle and steam.
- `oldboot` - a soggy old brown leather boot, wet and slumped, with a drip of water and a bit of seaweed.

### Potions & Consumables (15)

Potions: a glass bottle with a cork stopper, glowing liquid, small rim highlights; vary the bottle silhouette slightly by size (lesser = small round flask, greater = larger ornate bottle).

- `hpot_l` - small round flask of light red healing liquid, simple cork.
- `hpot` - medium bottle of bright red healing potion, cork stopper, soft glow.
- `hpot_g` - large ornate bottle of deep crimson healing potion, wax-sealed neck, strong glow.
- `mpot` - medium bottle of bright blue mana potion, cork stopper, soft glow.
- `mpot_g` - large ornate bottle of deep sapphire-blue mana potion, wax-sealed neck, swirling sparkles.
- `elixir_swift` - slender bottle of icy cyan Elixir of Haste, wispy streaks of motion inside.
- `elixir_might` - stout bottle of fiery orange Elixir of Might, bubbling, a faint warm glow.
- `elixir_fortune` - ornate bottle of shimmering gold Elixir of Fortune, tiny floating gold sparkles.
- `bandage` - a neat rolled linen bandage with a loose end and a small tie.
- `arrow` - a single wooden arrow, grey-feather fletching, steel broadhead, diagonal (nock bottom-left, tip top-right).
- `cache_d` - a small green-glowing wooden cache box with a rope tie and a green gem clasp.
- `coffer` - a sunken coffer, waterlogged teal-green wooden chest with barnacles, seaweed and rusted bands.
- `cache_c` - a blue-banded collector's cache chest with silver trim and a blue gem on the lid.
- `cache_g` - a purple gilded cache chest with ornate gold filigree and a glowing purple gem.
- `cache_a` - a golden Artifact Coffer, ornate gold chest with radiant light spilling from the lid, jeweled corners.

### Trophies (16)

Collectible monster parts: each is a single object, slightly stylized, with a small base-less presentation.

- `tr_rat` - a long thin pinkish giant rat tail, curled into an S shape.
- `tr_crab` - an iridescent crab shell, coral-orange with shimmering pink and teal highlights.
- `tr_antler` - a single branching tan stag antler.
- `tr_wolf` - a single ivory wolf fang, curved and sharp.
- `tr_bear` - a large dark-brown bear claw, curved and ridged.
- `tr_slime` - a glowing lime-green slime core, a dense translucent orb with a bright nucleus.
- `tr_spider` - a large magenta spider eye, glossy and faceted, with a dark pupil.
- `tr_bandit` - a black bandit's mask, a worn cloth-and-leather half-mask with eye slits.
- `tr_skull` - a polished ivory skull, clean and slightly yellowed, hollow eyes.
- `tr_tusker` - a pale yellow-ivory bogrunt tusk, thick, curved and worn.
- `tr_wraith` - a swirling purple wraith essence, a small floating ghostly wisp trapped in a haze of violet light.
- `tr_ogre` - a big ivory-yellow ogre tooth, chipped and heavy.
- `tr_troll` - a green-grey troll heart, rugged and gnarled with moss-like veins.
- `tr_drake` - a red-orange drake claw, sharp, scaled at the base.
- `tr_hollow` - a shard of the Hollow Crown, a jagged piece of pale lilac-violet crown metal with a cold glow and cracked runes.
- `tr_cinder` - a cinder scale, a single glowing orange-red dragon scale with ember cracks.

### Artifacts (12)

Each artifact is a **unique, named, legendary-tier** version of its base item. Give it bespoke design and a **golden aura/glow** (warm gold rim light, drifting gold sparks), still a single centered object with the STYLE BLOCK. Unlike regular gear, draw these in their specific material colors.

- `dawnbringer` - base `longsword`, silver. A radiant silver longsword whose blade holds a sunrise gradient from pale gold to rose, golden sun-ray engravings on the fuller, a sun-disc pommel, flaring gold light along the edge. Lore: "Forged at first light, it burns brightest against the dark."
- `pinewhisper` - base `longbow`, yew. An elegant red-yew longbow with carved pine-branch scrollwork along the limbs, a silver-green string that glows faintly, tiny pine needles and a soft wind-swirl of gold motes. Lore: "The string hums like wind in the high branches."
- `gravewarden` - base `tower`, adamantite. A massive green-steel tower shield, cracked and weathered but unbroken, with a sculpted stone-gate emblem and a skeletal hand motif, glowing gold runes pulsing along the rim. Lore: "It held the crypt door for a hundred years."
- `hollowcrown` - base `platehelm`, starmetal. A violet-black starmetal crown-helm, a spiked crown of broken points fused to a helm, hollow eye-slits glowing cold gold-white, a faint ghostly mist leaking from the crown. Lore: "Cold, and heavier than any crown should be."
- `cinderheart` - base `amulet`. A dark volcanic-stone amulet shaped like a beating heart on a gold chain, molten orange cracks that pulse with golden-white fire, ember sparks rising. Lore: "Still warm. Still beating."
- `tinkerhammer` - base `smithhammer`. A smith's hammer with a polished brass-and-iron head, a four-leaf clover etched on the face, golden sparks bursting from its striking face, a worn well-loved handle. Lore: "Every strike rings true."
- `deepdelver` - base `pickaxe`, adamantite. A green-steel pickaxe with a crystal-veined head that glints with embedded gold ore, a faint golden glow that points to the vein, a carved stone-textured grip. Lore: "It always finds the vein."
- `moonweave` - base `robe`, shadowsilk. A deep indigo-and-silver robe with moon-phase embroidery running down the front, a pale silver full-moon clasp, silken fabric catching golden-white moonlight and tiny stars. Lore: "Woven only under a full moon."
- `wanderer` - base `ring`. A slim gold band engraved with a winding road and tiny footprints, a small green-gold stone, soft golden motion trails circling the ring. Lore: "Its last owner never stayed in one place."
- `anglerdream` - base `fishpole`. A graceful golden-lacquered fishing pole with a silver-and-teal line, a glowing pearl bobber, a tiny golden fish leaping from a small swirl of water at the tip. Lore: "The fish practically leap onto the hook."
- `stormcaller` - base `wizstaff`, elderwood. A teal-white elderwood staff topped with a swirling storm-cloud crystal, a bolt of gold-white lightning arcing within, tiny crackling sparks around it. Lore: "Clouds gather wherever it is raised."
- `bloodfang` - base `katana`, mithril. A pale-blue mithril katana with a crimson-tinted edge, a fang-shaped guard, dark red cord wrap, faint red mist and gold-edged highlights. Lore: "It is always thirsty."
- `titanmaul` - base `warhammer`, adamantite. A huge green-steel maul with a boulder-sized head carved with mountain peaks, thick bound haft, golden shockwave cracks radiating across the head. Lore: "Mountains have been leveled with less."

## 4. Character creation portraits

Output **768x1024 PNG** (portrait, 3:4), saved as `assets/portraits/<profession id>.png`. These are normal opaque images (no transparency needed).

**PORTRAIT STYLE BLOCK** (prepend to every portrait):

```
Hand-painted fantasy RPG character portrait, waist-up, three-quarter view facing slightly left, confident calm expression, original human fantasy character, rich painterly brushwork with a subtle dark outline, consistent soft key light from the top-left with a faint warm rim light on the right, neutral dark slate-brown vignette background with no scene, 3:4 vertical composition, no text, no frame, no watermark.
```

- `warrior` (Warrior) - a broad-shouldered fighter in iron chain mail and a leather tabard with a steel pauldron, longsword hilt at the hip and a round iron shield slung on the back, short cropped hair, stoic gaze.
- `mage` (Mage) - a lean mage in a deep blue linen robe with a hood folded back, holding a pine wizard staff topped with a small glowing crystal, faint blue arcane light on the face.
- `smith` (Blacksmith) - a stocky blacksmith with a leather apron over a linen shirt, rolled sleeves, soot on the forearms, a smith's hammer resting on the shoulder, a faint forge-orange glow from behind.
- `ranger` (Ranger) - a woodland archer in a green-brown leather jerkin and a hooded cloak, a pine longbow over the shoulder, a quiver of grey-feathered arrows behind, keen eyes.
- `tamer` (Beastmaster) - a rugged beastmaster in fur-trimmed leather with a pelt over one shoulder, a young gray wolf pup at their side leaning against them, a leather glove on one arm, wild confident look.
- `fisher` (Fisher) - a weathered fisher in a woolen cap and a patched oilskin coat, a pine fishing pole on the shoulder, a small silver fish held up, rope and netting at the hip, easy smile.
- `alchemist` (Alchemist) - a sharp-eyed alchemist in a stained linen coat with goggles pushed up on the forehead, holding a glowing green potion in one hand, a bandolier of small corked vials across the chest and a sprig of herbs.
- `tailor` (Tailor) - an elegant tailor in a fitted vest over a crisp linen shirt, a measuring tape around the neck, a rapier at the hip, holding a needle and a bolt of colored silk, nimble hands.

(Add per-character variety if you wish: "feminine" or "masculine", skin tones and hair from the creator's palette - the game's own character creator is separate from these presets.)

## 5. Monster portraits (optional, for a future bestiary)

Use the PORTRAIT STYLE BLOCK from section 4 but change the framing to `full creature or bust, three-quarter view, facing slightly left` and use a **square 1024x1024** canvas with the same dark vignette. Save as `assets/monsters/<id>.png`.

- `rabbit` - a small wild brown-grey rabbit, long ears, alert and twitchy, puffy tail.
- `deer` - a graceful tawny stag deer with branching antlers, white-spotted flanks, alert in tall grass.
- `horse` - a wild chestnut-brown horse with a dark flowing mane, strong and untamed, mid-turn.
- `rat` - a giant dog-sized dark-grey rat with a long scaly tail, beady eyes and yellow teeth.
- `crab` - a shore crab the size of a shield, red-orange shell, big raised claws, six legs, seaweed on its back.
- `wolf` - a gray wolf with pointed ears and a bushy tail, snarling, mid-stride.
- `bear` - a black bear, bulky and heavy, round ears, standing on all fours with a growl.
- `slime` - a translucent bright green slime blob with a visible core and a few bones and coins floating inside.
- `spider` - a giant black spider with a red hourglass mark, eight hairy legs, many eyes, thread of silk.
- `bandit` - a hooded human bandit in dark leather with a short sword, a cloth mask, wary stance.
- `zombie` - a shambling green-grey zombie in ragged clothes, slack jaw, tattered cloth, torn limbs.
- `skeleton` - an armed skeleton with a rusty sword and a battered round shield, hollow glowing eye sockets.
- `direwolf` - a huge charcoal-grey dire wolf with glowing red eyes and a thick bristling mane.
- `grizzly` - a massive brown grizzly bear rearing up on its hind legs, claws out, roaring.
- `tusker` - a green-skinned Bogrunt brute with big lower tusks, rough hide armor and a crude axe.
- `captain` - a human Bandit Captain in a dark hood and a red-lined coat, a longsword drawn, scarred and commanding.
- `bonemage` - a skeletal Bone Mage in a tattered purple robe, a twisted staff with a violet flame, glowing eye sockets.
- `wraith` - a translucent violet wraith, a hooded ghostly figure fading into mist, glowing eyes, wispy tendrils.
- `ogre` - a huge tan-skinned ogre with a heavy belly, crude hide clothing, a gnarled wooden club, small mean eyes.
- `troll` - a tall grey-green moss-streaked troll with long arms and a heavy stone-headed mace, hunched and scowling.
- `drake` - a red-scaled drake with a lighter belly, bat-like wings folded, smoke curling from its nostrils.
- `hollowking` - the Hollow King boss: a skeletal king in dark violet royal robes, a broken cold-glowing crown, a pale violet staff, ghostly mist, regal and terrible.
- `cindermaw` - Cindermaw the Elder boss: a huge dark-red horned elder dragon with an orange glowing belly and molten cracks in its scales, fire in its maw, ember-filled air.
