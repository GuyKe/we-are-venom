# we-are-venom

A Meta Quest WebXR game built with Three.js. A symbiote has bonded to your
arms: they hang as floppy, whip-like black tendrils that follow your VR
controllers with real verlet-rope physics. You stand on a small floating
baseplate arena, ringed by a lit-window city skyline at night, and smash
glowing orbs out of the air by swinging your arms at them fast enough.

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
- **Smash-the-orbs minigame** — orbs float around the arena; hitting one with
  enough tendril-tip velocity destroys it in a small black goo particle
  burst, plays a synthesized thud, and increments a floating scoreboard.
- **Comfort locomotion** — left thumbstick for smooth movement (relative to
  where you're looking), right thumbstick for snap turns.
- **Tendril lash** — press the right controller's **B** button (or the `B`
  key on desktop) to lash the right arm out to full extension for about a
  second before it snaps back; the left controller's **X** button (or `X` on
  desktop) does the same for the left arm. Great for smashing orbs just out
  of normal reach.
- **Desktop preview** — no headset handy? Click the intro screen to look
  around the arena with mouse-orbit; the tendrils animate on simulated hand
  targets so you can sanity-check the scene on a monitor.
- **Grabbable ragdoll** — a standing ragdoll person waits on the baseplate.
  Squeeze either controller's **grip** while aiming at him to grab him with
  that hand's tendril — the arm itself visibly stretches out to reach him
  from well beyond normal arm's reach (up to ~6m away), then reels him in
  toward your hand while you hold the grip. He's a real verlet-physics
  ragdoll (a small skeleton of particles + distance constraints, the same
  technique as the arms), so he tumbles and drags realistically and
  collapses in a heap when you let go. He stands back up on his own a few
  seconds after being released.
- **Sludge form & takeover** — the left controller's **Y** button turns you
  into a very short, ground-hugging puddle of symbiote that moves at a
  medium pace instead of a full-size humanoid (no arms while you're a
  puddle - your whole rig sinks down and your move speed changes). Crawl
  into the ragdoll while in sludge form and you take him over: he's
  permanently recolored into a glossy black husk and you snap back to your
  normal size and speed, ready to grab someone else.
- **City backdrop** — a ring of procedurally generated skyscrapers with
  lit-window facades (a tileable canvas texture, randomized on/off per
  window) surrounds the baseplate just beyond its edge, so the arena reads
  as a platform floating near a city at night instead of empty space.
- **Wall grapple** — pull a hand back fast (opposite to wherever you're
  looking) and it fires a raycast from that hand toward whatever it's
  aimed at; if it hits a building, you snap onto the wall and stick there,
  frozen in place like you're clinging to the side of it. Squeeze either
  **grip** to let go and drop back down (grip's normal ragdoll-grab is
  suppressed while you're stuck to a wall - letting go always takes
  priority).

| Action                    | VR                          | Desktop preview        |
| -------------------------- | ---------------------------- | ----------------------- |
| Move                       | Left thumbstick               | Mouse-orbit / scroll    |
| Snap turn                  | Right thumbstick               | —                        |
| Lash right arm out & back  | Right controller **B**        | `B` key                 |
| Lash left arm out & back   | Left controller **X**         | `X` key                 |
| Grab the ragdoll (right hand) | Right controller **grip**  | `G` key (aims with the camera) |
| Grab the ragdoll (left hand)  | Left controller **grip**   | `F` key (aims with the camera) |
| Toggle sludge form          | Left controller **Y**        | `Y` key |
| Fire wall grapple            | Pull a hand back fast          | `R` key (aims with the camera) |
| Let go of a wall             | Either controller **grip**    | `G` or `F` key |

## Project layout

```
index.html          Entry HTML + intro overlay
src/main.js          Scene setup, XR rig wiring, render loop
src/VenomArm.js       Verlet tendril simulation + tapered tube mesh + claws
src/venomTexture.js   Procedural black/white "symbiote crack" canvas texture
src/Ragdoll.js        Grabbable verlet-physics ragdoll person
src/Sludge.js         Short/medium-speed sludge form + touch-to-possess
src/WallGrapple.js    Fast-pull-back wall grab/detach
src/City.js           Procedural lit-window skyscraper ring around the arena
src/Environment.js    Baseplate arena, starfield, lighting
src/TargetOrbs.js     Smash-game orbs, hit detection, particle bursts
src/Locomotion.js     Thumbstick smooth-move + snap-turn
src/Hud.js            Floating canvas-texture scoreboard sign
src/sound.js          WebAudio-synthesized hit/possess/grapple sounds (no audio files)
```

## Run it locally

```bash
npm install
npm run dev
```

Vite prints a `https://<your-ip>:5173/` URL (HTTPS is required — WebXR
immersive sessions need a secure context). On your dev machine you can open
that URL in a normal browser to preview the arena with mouse + scroll
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
6. Tap **Enter VR**, grab your controllers, and start swinging.

For a permanent build you can deploy `npm run build`'s `dist/` folder to any
HTTPS static host (GitHub Pages, Netlify, Vercel, etc.) and open that URL in
the Quest Browser — no local dev server needed at that point.

## Tuning the feel

- `VenomArm` constructor options (`src/main.js`): `armLength`, `slack`
  (higher = floppier/saggier), `baseRadius`/`tipRadius` (arm thickness taper).
- `TargetOrbs`: `HIT_SPEED_THRESHOLD` in `src/TargetOrbs.js` controls how fast
  you need to swing to register a smash.
- `Ragdoll.js` constants: `REEL_SPEED` (how fast the grabbed rope shortens),
  `MIN_ROPE_LENGTH`, `RESPAWN_DELAY` (seconds before he stands back up), and
  the `tryGrab(..., maxDistance, grabRadius)` arguments in `main.js` control
  how far away and how forgiving the grab raycast is.
- `Sludge.js` constants: `HEIGHT_DROP` (how short the sludge form is),
  `SLUDGE_MOVE_SPEED`, and `TOUCH_RADIUS` (how close you need to crawl to
  the ragdoll to take him over).
- `WallGrapple.js` constants: `PULL_SPEED_THRESHOLD`/`BACKWARD_DOT_THRESHOLD`
  (how fast and how "backward" a pull needs to be to fire), `MAX_DISTANCE`
  (grapple range), and `STANDOFF` (how far off the wall surface you hang).
- `City.js` constants: `BUILDING_COUNT` and the `RING_INNER_RADIUS`/
  `RING_OUTER_RADIUS` band the skyscrapers are scattered across.
