# Brief: Pluto's wardrobe and pets (3D)

Pluto (ReadFluent's mascot) is a three.js model, `scripts/mascot/pluto.js`, rendered by `scripts/mascot/harness.html` (fixed
orthographic camera, world x,y in [-3, 3] = the app's 240 box, 720×720 transparent) into the layers in
`components/mascot/pluto/*.webp`. Read `scripts/mascot/README.md`, then `pluto.js` (POSES, assemble(), buildPluto()).

Readers will earn coins and spend them on Pluto's look. Add, IN `pluto.js`, these extra assets (asset names passed to
`buildPluto(THREE, name, helpers)`), each rendering ONLY the item, exactly where it sits for that pose, same camera, same
lighting and the same soft vinyl-toy finish as Pluto, so the app can lay it straight over Pluto's layers:

Accessories, each for the five poses' head: `acc-<item>-<base>` with base in `hello-base`, `reading`, `cheer-base`, `sleepy`, `ready`
(the blink and talk frames share the head of their base). Items (6):
- `crown`: a small chunky gold crown sitting on top of the helmet, behind/around the star antenna (the antenna may poke through).
- `party`: a striped cone party hat (cyan/white or pink/yellow) tilted on the helmet, with a pompom.
- `beanie`: a cosy knitted beanie (deep teal or red) over the top of the helmet, with a bobble; must not cover the visor.
- `wizard`: a tall soft wizard hat (deep blue with small gold stars), bent tip.
- `headphones`: a chunky headband over the helmet with big padded cups covering the ear pods (white and coral/orange accents).
- `shades`: cool dark sunglasses sitting on the visor (over the eyes), slightly tilted, glossy.
Each must follow the head's position, tilt and scale in every pose (sleepy and reading tilt the head). Nothing else in the frame.
The waving arm and cheer arms are separate layers drawn ABOVE the accessory, so an accessory may be partly behind them; fine.

Pets (4): `pet-<name>`: a small companion standing on the ground to Pluto's left (screen left), inside u 6–78, v 160–230 of the
240 box (x −2.9…−1.05, y −2.75…−1.0), facing a little towards Pluto, same toy finish, cute, each with simple glossy eyes:
- `pet-moon`: a tiny round grey-lilac moon buddy with soft craters and stubby feet.
- `pet-ufo`: a little hovering flying saucer (silver with a cyan glass dome and a tiny friendly face inside), floating slightly.
- `pet-robodog`: a small rounded robot puppy (white and coral), floppy antenna ears, wagging tail.
- `pet-comet`: a baby comet: a round warm-yellow head with a soft flame-like tail, floating.
Pets must not overlap Pluto's body (Pluto spans about u 55–185).

Also add these names to `ASSETS` in `scripts/mascot/render.mjs`? NO: write a separate list in a new file `scripts/mascot/wardrobe.mjs`
that renders only these 34 assets (6 × 5 + 4) to `components/mascot/pluto/` as WebP like render.mjs does (copy its approach). Do not
change the existing 13 assets or their look.

How to see your work: write a small preview script (in the scratchpad, not the repo) that composites, with the same harness, each pose
with each accessory (base layer + accessory + arm layers) and each pet beside hello, and LOOK at the PNGs with the Read tool at full
size and at 64px. Iterate until every item sits right in every pose and looks as polished as Pluto. Keep each item simple and readable.

When done: run `node scripts/mascot/wardrobe.mjs`, list the files written and their sizes, and report in a few lines. Do not edit any
other file in the repo (Mascot.tsx, CSS and the shop are being built by someone else) and do not run git.
