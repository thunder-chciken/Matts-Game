"""Build 4x4 icon-sheet prompts from art/PROMPTS.md (keeps item order) and a layout map for slicing."""
import json, re, pathlib
root = pathlib.Path(__file__).parent
text = (root / 'PROMPTS.md').read_text(encoding='utf-8')
icons_part = text.split('## 3. Icon prompts by category')[1].split('### Artifacts')[0]
items = re.findall(r'^- `([a-z0-9_]+)` - (.+)$', icons_part, re.M)
# magenta would be keyed out with the background
items = [(i, d.replace('large magenta spider eye', 'large crimson-red spider eye')) for i, d in items]
# artifacts: drop the base-item prefix and lore, keep the visual description
art_part = text.split('### Artifacts')[1].split('\n## ')[0]
for aid, desc in re.findall(r'^- `([a-z0-9_]+)` - (.+)$', art_part, re.M):
    desc = re.sub(r'^base `[a-z_]+`(, [a-z]+)?\. ', '', desc).split(' Lore:')[0]
    items.append((aid, desc + ' Legendary item with a warm golden aura and drifting gold sparks.'))
STYLE = ('Hand-painted fantasy RPG inventory icons, 3/4 view; weapons and long tools angled 45 degrees with handle at '
         'bottom-left and tip at top-right; soft rim light from the top-left; subtle dark outline; rich saturated colors '
         'with clear value contrast; bold simple shapes readable at 40px; painterly brushwork; original fantasy designs. '
         'Gear is drawn in plain neutral materials (plain iron, pine wood, plain leather, linen) with no glow.')
sheets = [items[i:i + 16] for i in range(0, len(items), 16)]
layout = {}
for n, sheet in enumerate(sheets, 1):
    lines = ' '.join(f'({i + 1}) {desc}' for i, (_, desc) in enumerate(sheet))
    prompt = ('Create ONE square 1024x1024 image that is an icon sprite sheet: a 4x4 grid of 16 separate fantasy RPG '
              'inventory icons. Each icon is centered in its own equal cell (each cell is exactly one quarter of the '
              'width and one quarter of the height) with a generous empty margin, so no icon touches a cell edge or '
              'another icon. The ENTIRE background is flat solid pure magenta #FF00FF: no gradient, no grid lines, no '
              'cast shadows, no ground plane. No text, labels, numbers, frames or borders anywhere. '
              f'Style for every icon: {STYLE} '
              f'Draw exactly these {len(sheet)} icons in this order, left to right, top to bottom'
              f'{" (leave the remaining cells empty magenta)" if len(sheet) < 16 else ""}: {lines}')
    (root / 'sheets' / f'sheet{n:02d}.txt').write_text(prompt, encoding='utf-8')
    layout[f'sheet{n:02d}'] = [i for i, _ in sheet]
# profession portraits: one 4x2 landscape sheet, kept opaque
layout['portraits'] = {'ids': ['warrior', 'mage', 'smith', 'ranger', 'tamer', 'fisher', 'alchemist', 'tailor'],
                       'grid': [4, 2], 'out': 'portraits', 'opaque': True}
# monster portraits for the bestiary: two 4x3 landscape sheets, kept opaque
mons = ['rabbit', 'deer', 'horse', 'rat', 'crab', 'wolf', 'bear', 'slime', 'spider', 'bandit', 'zombie', 'skeleton',
        'direwolf', 'grizzly', 'tusker', 'captain', 'bonemage', 'wraith', 'ogre', 'troll', 'drake', 'hollowking', 'cindermaw']
layout['monsters1'] = {'ids': mons[:12], 'grid': [4, 3], 'out': 'monsters', 'opaque': True}
layout['monsters2'] = {'ids': mons[12:], 'grid': [4, 3], 'out': 'monsters', 'opaque': True}
# painted ground textures (made seamless in-game)
layout['terrain'] = {'ids': ['grass', 'grass2', 'forest', 'mud', 'flagstone', 'cobble', 'sand', 'swamp', 'rocky', 'planks',
                             'grave', 'ash', 'water', 'deepwater', 'earth', 'meadow'], 'grid': [4, 4], 'out': 'terrain', 'opaque': True}
# world sprites (Grok tree sheets), cut tight and anchored at the base
layout['trees1'] = {'ids': ['oak1', 'oak2', 'pine1', 'pine2', 'pine3', 'pine4', 'birch1', 'birch2', 'autumn1', 'autumn2',
                            'dead1', 'dead2', 'dead3', 'willow1', 'willow2', 'dead4'], 'grid': [4, 4], 'out': 'props', 'sprite': True, 'max': 340}
layout['trees2'] = {'ids': ['oak3', 'pine5', 'birch3', 'autumn3', 'oak4', 'pine6', 'birch4', 'autumn4', 'dead5', 'dead6',
                            'dead7', 'willow3', 'oak5', 'pine7', 'willow4', 'dead8'], 'grid': [4, 4], 'out': 'props', 'sprite': True, 'max': 340}
layout['wild1'] = {'ids': ['boulder1', 'orerock1', 'orerock2', 'slab', 'herb_sunleaf', 'herb_moonpetal', 'herb_frostcap',
                           'herb_emberroot', 'herb_ghostbloom', 'herb_bare', 'mushrooms', 'ferns', 'reeds', 'bones', 'stump', 'log'],
                   'grid': [4, 4], 'out': 'props', 'sprite': True, 'max': 220}
layout['town1'] = {'ids': ['forge', 'anvil', 'well', 'lamp', 'board', 'shrine', 'oven', 'crate', 'barrel', 'hay', 'tomb1', 'tomb2',
                           'brazier', 'fence', 'signpost', 'firewood'], 'grid': [4, 4], 'out': 'props', 'sprite': True, 'max': 240}
layout['bld1'] = {'ids': ['b_smith', 'b_bank', 'b_mage', 'b_store', 'b_healer', 'b_tailor'], 'grid': [3, 2], 'out': 'props', 'sprite': True, 'max': 512}
layout['bld2'] = {'ids': ['b_miner', 'b_bowyer', 'b_alchemist', 'b_fisher', 'b_crypt', 'b_house'], 'grid': [3, 2], 'out': 'props', 'sprite': True, 'max': 512}
# in-world characters and creatures (face lower-right; mirrored in game)
layout['mobs1'] = {'ids': ['m_rabbit', 'm_deer', 'm_horse', 'm_rat', 'm_crab', 'm_wolf', 'm_bear', 'm_slime', 'm_spider', 'm_bandit',
                           'm_zombie', 'm_skeleton'], 'grid': [4, 3], 'out': 'sprites', 'sprite': True, 'max': 300}
layout['mobs2'] = {'ids': ['m_direwolf', 'm_grizzly', 'm_tusker', 'm_captain', 'm_bonemage', 'm_wraith', 'm_ogre', 'm_troll', 'm_drake',
                           'm_hollowking', 'm_cindermaw', ''], 'grid': [4, 3], 'out': 'sprites', 'sprite': True, 'max': 360}
layout['heroes'] = {'ids': ['h_m_shirt', 'h_m_leather', 'h_m_chain', 'h_m_plate', 'h_m_robe', 'h_f_shirt', 'h_f_leather', 'h_f_chain',
                            'h_f_plate', 'h_f_robe', 'h_townsman', 'h_townswoman'], 'grid': [4, 3], 'out': 'sprites', 'sprite': True, 'max': 320}
(root / 'sheets' / 'layout.json').write_text(json.dumps(layout, indent=1), encoding='utf-8')
print(len(items), 'icons in', len(sheets), 'sheets')
