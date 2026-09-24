# we-are-venom

A Meta Quest WebXR scene built with Three.js. A symbiote has bonded to your
arms: they hang as floppy, whip-like black tendrils that follow your VR
controllers with real verlet-rope physics. You wake up standing in a quiet
room with two windows looking out onto a grass field - and right in front
of you is another symbiote figure, with the same floppy tendril arms as
your own.

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
- **A room with a view** — a plain indoor room (mildly randomized dimensions
  each load) with two windows cut into its far wall, looking out onto an
  exterior grass field under open sky.
- **Your symbiote twin** — a standing Venom figure waits in the room, built
  from the same glossy black material and the same floppy tendril-arm system
  as the player, topped with a pair of iconic wide white eyes. Its arms idly
  sway on their own rather than being controller-driven.
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
src/VenomTwin.js      The standing Venom figure (body + a pair of VenomArms)
src/Sludge.js         Short/medium-speed sludge form toggle
src/Room.js           Indoor room, two windows, exterior grass field
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
  height), and the grass `PlaneGeometry` size/position.
