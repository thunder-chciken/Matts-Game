'use strict';
// List the art files you have added. The game uses these instead of its built-in drawings.
//   icons:     assets/icons/<itemId>.png     e.g. 'longsword'  (see art/PROMPTS.md for ids)
//   portraits: assets/portraits/<professionId>.png   e.g. 'warrior', 'mage', 'smith', 'tamer'
//   monsters:  assets/monsters/<monsterId>.png
// Then reload the game. Anything not listed falls back to the procedural art.
const ART_MANIFEST = {
  icons: [],
  portraits: [],
  monsters: [],
};
