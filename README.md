# we-are-venom

A Meta Quest WebXR scene built with Three.js. A symbiote has bonded to your
arms: they hang as floppy, whip-like black tendrils that follow your VR
controllers with real verlet-rope physics. You wake up standing on a small
green floor on the second floor of a building - right in front of you is
another symbiote figure with the same floppy tendril arms as your own,
jagged teeth, and a lolling tongue, and it never stops following you. Two
windows on the side wall look down onto a crate-filled yard below, where
Carnage is lurking, and a hatch in the floor drops you straight down to
the ground floor if you walk into it.

## Why WebXR

No Unity/Android build chain needed — it runs straight in the Meta Quest
Browser, and you can iterate by just refreshing the page.

## Features

- **Floppy symbiote arms** — each arm is a 9-point verlet chain rendered as a
  tapered tube mesh, pinned at the shoulder and at your hand (controller
  grip). Low constraint-iteration count keeps them soft and whip-like instead
  of rigid, so fast swings make them lag, sag and snap like living goo.
- **Spiky tentacle mass** — rather than one smooth limb, a scattering of
  thin, sharp secondary spikes branches off each tendril's body and idly
  writhes, plus a few longer claw-like spikes at the tip that curl with the
  hand — closer to the concept-art "mass of symbiote whips" look than a
  single clean arm.
- **Venom-style material** — a procedurally generated canvas texture paints
  branching white "muscle crack" veins onto a glossy, wet-looking black
  clearcoat material. No external image assets.
- **Tendril lash** — press the right controller's **B** button (or the `B`
  key on desktop) to lash the right arm out to full extension for about a
  second before it snaps back; the left controller's **X** button (or `X` on
  desktop) does the same for the left arm.
- **Sludge form** — the left controller's **Y** button (or `Y` on desktop)
  turns you into a very short, ground-hugging puddle of symbiote that moves
  at a medium pace instead of a full-size humanoid: your whole rig sinks
  down, both arms hide, and your move speed changes.
- **A room on the second floor** — a small green-floored room (mildly
  randomized dimensions each load) with two windows cut into its side wall,
  looking down onto an exterior yard a full story below.
- **A hatch to the ground floor, and real gravity** — a rectangular hole is
  cut into the room's floor; step into it (or off any other edge) and you
  actually fall to whatever's below instead of floating in place, landing
  on the ground floor one story down. A lightweight floor-region lookup
  (`Gravity.js`) stands in for a physics engine: it just asks "what's the
  highest floor under this X/Z?" and falls you toward it.
- **Your symbiote twin follows you** — a standing Venom figure shares the
  room with you, built from the same glossy black material and the same
  floppy tendril-arm system as the player: wide white eyes, a gaping
  jagged-toothed mouth, and a long lolling tongue. It continuously walks
  toward you and turns to face you as you move, using the same gravity
  lookup - so it'll chase you right through the floor hatch and down to
  the ground floor.
- **Carnage in the yard** — outside the windows, one story down, sits a
  crate-scattered yard lit by a dim red glow - and lurking among the crates
  is a Carnage twin of the same figure (stationary), reskinned in a glossy
  blood-red material with black cracks instead of Venom's black-and-white.
- **Desktop preview** — no headset handy? Click the intro screen to look
  around the room with mouse-orbit; the tendrils animate on simulated hand
  targets so you can sanity-check the scene on a monitor.

## Controls

| Action                     | VR                       | Desktop preview     |
| --------------------------- | ------------------------- | --------------------- |
| Move                        | Left thumbstick            | Mouse-orbit / scroll |
| Snap turn                   | Right thumbstick           | —                     |
| Lash right arm out & back   | Right controller **B**     | `B` key              |
| Lash left arm out & back    | Left controller **X**      | `X` key              |
| Toggle sludge form          | Left controller **Y**      | `Y` key              |

## Project layout

```
index.html          Entry HTML + intro overlay
src/main.js          Scene setup, XR rig wiring, render loop
src/VenomArm.js       Verlet tendril simulation + tapered tube mesh + claws
src/venomTexture.js   Procedural black/white "symbiote crack" canvas texture
src/VenomTwin.js      Standing/following Venom or Carnage figure (body + face + a pair of VenomArms)
src/Sludge.js         Short/medium-speed sludge form toggle
src/Gravity.js        Floor-region lookup + fall-to-the-floor-below gravity
src/Room.js           Second floor (with a floor hatch) + ground floor + yard + crates
src/Locomotion.js     Thumbstick smooth-move + snap-turn
```

## Run it locally

```bash
npm install
npm run dev
```

Vite prints a `https://<your-ip>:5173/` URL (HTTPS is required — WebXR
immersive sessions need a secure context). On your dev machine you can open
that URL in a normal browser to preview the room with mouse + scroll
(click the intro screen to dismiss it first).

## Run it on a Meta Quest headset

1. Make sure your computer and your Quest are on the **same Wi-Fi network**.
2. Start the dev server so it's reachable on your LAN:
   ```bash
   npm run dev -- --host
   ```
3. Find your computer's local IP address (e.g. `192.168.1.42`).
4. In the Quest's **Meta Quest Browser**, go to `https://192.168.1.42:5173/`.
5. The browser will warn about the self-signed certificate — tap
   **Advanced → Proceed** (this is expected for local dev; the built-in
   `@vitejs/plugin-basic-ssl` plugin generates a throwaway cert).
6. Tap **Enter VR** and look around.

For a permanent build you can deploy `npm run build`'s `dist/` folder to any
HTTPS static host (GitHub Pages, Netlify, Vercel, etc.) and open that URL in
the Quest Browser — no local dev server needed at that point.

## Tuning the feel

- `VenomArm` constructor options (`src/main.js`, `src/VenomTwin.js`):
  `armLength`, `slack` (higher = floppier/saggier), `baseRadius`/`tipRadius`
  (arm thickness taper).
- `Sludge.js` constants: `HEIGHT_DROP` (how short the sludge form is) and
  `SLUDGE_MOVE_SPEED`.
- `Room.js`: the random width/depth range, `sillY`/`windowH` (window size and
  height), `FLOOR_DROP` (how far below the ground floor sits), the `hole`
  object (hatch position/size), and the crate count/spread in `addCrates(...)`.
- `venomTexture.js`: `createCarnageMaterial()`'s color options control
  Carnage's red/black skin tone.
- `VenomTwin.js`: `FOLLOW_SPEED` and `FOLLOW_STOP_DISTANCE` control how fast
  it closes in and how close it gets before stopping.
