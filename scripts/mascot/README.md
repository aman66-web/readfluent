# Pluto, the mascot

Pluto is modelled in three.js (`pluto.js`: the shapes, materials, faces and the 13 poses and layers) and rendered to
transparent images that `components/mascot/Mascot.tsx` layers and animates with CSS (`.lx-*` in `app/globals.css`).
Nothing 3D runs in the app: it ships 13 small WebP images (about 200 KB in all, loaded once and cached).

- `node scripts/mascot/render.mjs` renders every layer into `components/mascot/pluto/*.webp` (Chromium with software WebGL).
- `harness.html` is the fixed scene: a 720×720 transparent frame, an orthographic camera straight on, world x,y in [-3, 3]
  = the component's 240 box (u = (x + 3) × 40, v = (3 − y) × 40), a soft studio light.
- `pivots.json` are the shoulders the arm layers turn on, in the 240 box (copied into `PIVOT` in `Mascot.tsx`).

The layers: `hello-base` + `hello-arm` (waves), `hello-blink`, `hello-talk`; `reading`, `reading-blink`; `cheer-base` +
`cheer-arm-l` + `cheer-arm-r`; `sleepy`; `ready`, `ready-blink`, `ready-talk`. A new pose is a new asset name in `pluto.js`
and `render.mjs`, and a new entry in `POSE` in `Mascot.tsx`.

Designed 4 Oct 2026 (owner: "Pluto, not an animal, something like this [two soft 3D toy references], cyan, 3D if possible"):
three rival designs (visor buddy, two-tone figure, little planet), a judge panel, then refine and critique rounds.
