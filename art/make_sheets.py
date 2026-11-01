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
(root / 'sheets' / 'layout.json').write_text(json.dumps(layout, indent=1), encoding='utf-8')
print(len(items), 'icons in', len(sheets), 'sheets')
