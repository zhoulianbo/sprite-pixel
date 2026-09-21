# Raccoon Forge Hero Assets

All three assets were created with the built-in ImageGen workflow and converted to lossless WebP for the production Canvas.

## Raccoon Sprite Sheet

- Production file: `public/imgs/demo/raccoon-forge-sprite-sheet-v1.webp`
- Layout: 4 rows × 8 frames
- Rows: idle, walk, forge/interact, equip/attack

Final generation prompt:

> Create one consistent small raccoon game hero and a clean sprite sheet containing the exact animation phases needed for a seamless website Hero loop. Use a genuinely transparent background and a strict orthographic side view facing right. Arrange frames in a perfectly aligned 4-row × 8-column grid: idle, walk, forge/interact with a cyan-gold Project Core, and equip/short-sword attack. The raccoon has warm-gray fur, charcoal mask markings, striped tail, mustard scarf, navy utility vest and cyan chest badge. Render crisp hand-crafted 32-bit indie pixel art with hard edges and a limited SpritePixel navy, Forge Gold, Cyan and Success Green palette. Keep scale, pivot, baseline, anatomy, outfit and lighting identical in every frame. No text, UI, grid lines, scenery, logos or watermark.

Final background-extraction prompt:

> Remove only the entire dark backdrop and vignette lighting from the generated sprite sheet and replace it with genuine transparent alpha. Preserve the exact 4-row × 8-column arrangement, every sprite and effect, dimensions, spacing, baseline, colors and frame order unchanged. Do not repaint, crop or rearrange any frame.

## Matching Project Asset Strip

- Production file: `public/imgs/demo/raccoon-project-assets-v1.webp`
- Layout: 1 row × 4 assets
- Assets: sword, shield, potion, paw-burst skill

Final generation prompt:

> Create four matching pixel-art assets for the same raccoon adventurer project: a Forge Gold short sword, navy-and-gold round shield with cyan Project Core gem, cyan healing potion with gold stopper, and cyan magical paw-burst skill icon. Arrange exactly four assets in one horizontal row of equal square cells on genuine transparency. Use consistent 32-bit indie pixel art, hard edges and the SpritePixel palette. No text, UI frames, borders, scenery, character, logos or watermark.

## Training Dummy

- Production file: `public/imgs/demo/raccoon-training-dummy-v1.webp`

Final generation prompt:

> Create one compact wooden training dummy for the raccoon to test its newly forged sword. Use an orthographic side view, navy cloth wraps, Forge Gold brackets, a small cyan hit rune and crisp 32-bit indie pixel art on genuine transparency. Keep the whole prop visible and consistent in scale with a small biped game character. No floor, text, UI, scenery, logos or watermark.
