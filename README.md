# we-are-venom

A Meta Quest WebXR scene built with Three.js. The moment you start the
experience, Venom greets you out loud: "Hello, welcome to my game, I do
not ask questions but break has started. Go." A symbiote has bonded to
your arms: they hang as floppy, whip-like black tendrils that follow your
VR controllers with real verlet-rope physics. You wake up in a retro,
PS1-style classroom on the second floor of a good-sized building - checkered floor,
blotchy low-res walls, a chalkboard (blank - it doesn't say anything),
school desks - and right in front of you is another symbiote figure with
the same floppy tendril arms as your own, jagged teeth, and a lolling
tongue. It doesn't chase you; it just stands there and turns to mirror
whatever direction you're currently facing. Three small windows on the
side wall look down onto a glitched-out playground below - a bounded,
cracked-ground field under a radiating pastel rainbow sky, with a
wall-mounted symbiote face looming at the far end and a purple-and-orange
blotched Carnage lurking near a scatter of crates spread across the
platform. A sloped tunnel through the classroom's side
wall is the way downstairs, and you can jump - or hold to fly, tumbling
ragdoll-loose - straight up onto the roof, where a spiked mace is waiting
to be picked up. Swing it hard at Carnage or the crates and they'll knock
back, tumble under real gravity, and pop out shimmering rainbow orbs that
- like Minecraft XP - zip straight to you the moment they appear. The
orbs aren't just for show: get close to the wall-mounted face at the far
end of the platform and it'll prompt you to feed it your orbs, cracking
open a swirling portal hidden in its mouth. Not sure what it wants with
them? Walk up to Carnage instead - he'll tell you all about it.

## Why WebXR

No Unity/Android build chain needed — it runs straight in the Meta Quest
Browser, and you can iterate by just refreshing the page.

## Features

- **Venom greets you out loud** — the first time you actually start the
  experience (clicking the intro screen, or entering VR), a deep,
  deliberately-paced voice line plays via the browser's built-in
  text-to-speech (`speechSynthesis` - no external audio asset or API
  needed): "Hello, welcome to my game, I do not ask questions but break
  has started. Go." It picks the most male-sounding voice the browser/OS
  happens to offer and only ever speaks once per visit.
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
- **Jump, or hold to fly and ragdoll** — tap the right controller's **A**
  button (or `A` on desktop) for a quick jump, using the same floor-region
  gravity that governs falling; keep it held past a quarter-second and it
  turns into sustained upward flight instead of arcing back down, with the
  whole rig gently tumbling on a bounded pitch/roll wobble while airborne
  (a "ragdolled" feel without ever spinning the camera itself, which would
  be nauseating in VR). Let go and gravity takes back over.
- **A retro PS1-style classroom** — a sizeable room (mildly randomized
  dimensions each load, roomier than early builds of this scene) styled
  after low-poly, low-res 32-bit-era horror games: a blue/green checkered
  floor, blotchy low-resolution walls, a flat black ceiling, a blank
  chalkboard, and school desks scattered around (clear of the tunnel
  entrance and the spawn point). Three small square windows are cut into
  the side wall, looking down onto an exterior playground a full story
  below.
- **A tunnel downstairs, a walkable roof, and real gravity** — the way
  down is a sloped, enclosed tunnel through an opening in the classroom's
  left wall, descending to the ground floor outside; walk down it (or off
  any edge) and you actually fall/slide to whatever's below instead of
  floating in place. Jump or fly straight up and you can land on the roof
  itself, now a walkable surface with a low parapet rim. A lightweight
  floor-region lookup (`Gravity.js`) stands in for a physics engine: given
  an X/Z and how high up you currently are, it finds the highest floor at
  or below that height (so the roof doesn't yank you up onto it while
  you're still underneath it) - flat regions, or ramps that interpolate
  height along an axis for the tunnel's slope.
- **A mace on the roof, and a real hit reaction** — squeeze either
  controller's trigger (or `Q`/`E` on desktop) near it to pick it up; it's
  simply reparented onto your hand and swings naturally, and letting go of
  the trigger drops it back into the world under gravity. Swing it fast
  enough near Carnage or a crate and it registers as a hit: the target
  gets shoved and spun by a decaying knockback velocity, and a small
  rainbow-hued orb pops out at the point of impact (no gameplay purpose
  assigned to the orbs yet - just the reward for landing a hit). Like
  Minecraft XP, each orb hops once from its own knockback and then flies
  straight at you, accelerating the whole way, and disappears the instant
  it reaches you.
- **A dreamcore playground** — outside the windows and down the tunnel: a
  bounded platform of cracked, hazy green ground (wider and considerably
  longer than the building itself, but still not an endless field) under a
  radiating pastel-rainbow sky (a conic-gradient skydome), a handful of
  freestanding wooden crates scattered well apart from each other rather
  than piled together, each with its own gravity and knockback physics - a
  wall-mounted symbiote face looming at the far end, turned to look back
  toward the school building (every dimension randomized per load), and
  glitched walls around the ground floor - a corrupted, colour-banded
  texture instead of a clean material.
- **Your symbiote twin mirrors you** — a standing Venom figure shares the
  room with you, built from the same glossy black material and the same
  floppy tendril-arm system as the player: wide white eyes, a gaping
  jagged-toothed mouth, and a long lolling tongue. It doesn't walk toward
  you - it stands its ground and continuously turns to face whatever
  direction you're currently facing, like an eerie mirror.
- **Carnage lurks near the crates** — the same kind of figure as your
  symbiote twin, but with an orange-and-gold hide mottled in big,
  irregular purple blotches instead of Venom's black-and-white crack
  pattern. Unlike Venom, it doesn't mirror you - it just stands its ground
  near the crates until a mace swing sends it reeling, tumbling and
  spinning under the same knockback physics as a hit crate. Walk up close
  and an in-VR prompt invites you to talk to him (trigger, or `Q`/`E` on
  desktop) - he explains, out loud in his own rougher voice, what the
  door wants with your rainbow orbs.
- **A door that eats rainbow orbs** — get within a few meters of the
  wall-mounted symbiote face and a prompt appears for five seconds:
  "CLICK TRIGGER TO FEED DOOR". Do it while you're carrying orbs and
  they're spent to crack open a swirling portal hidden in its mouth,
  which blooms open and slowly spins in place - a permanent change to
  the world once it happens. With none to feed it, it lets you know
  there's nothing to give. A regular HTML overlay wouldn't render inside
  an actual VR headset, so every in-game prompt is a small text plane
  (`Hud.js`) parented to the camera instead, always sitting a fixed
  distance in front of your view.
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
| Jump / hold to fly & ragdoll | Right controller **A**    | `A` key              |
| Pick up / drop the mace, feed the door, or talk to Carnage (context-sensitive) | Either **trigger** | `Q` (left) / `E` (right) |

## Project layout

```
index.html          Entry HTML + intro overlay
src/main.js          Scene setup, XR rig wiring, render loop
src/VenomArm.js       Verlet tendril simulation + tapered tube mesh + claws
src/venomTexture.js   Procedural black/white "symbiote crack" canvas texture
src/VenomTwin.js      Standing, direction-mirroring Venom figure (body + face + a pair of VenomArms)
src/Sludge.js         Short/medium-speed sludge form toggle
src/Gravity.js        Floor-region (flat or ramped) lookup + fall-to-the-floor-below gravity, plus knockback physics
src/Room.js           Second floor (with a side tunnel + walkable roof) + ground floor + rainbow-sky playground
src/Locomotion.js     Thumbstick smooth-move + snap-turn
src/VenomVoice.js     Spoken lines (Venom's greeting, Carnage's door line) via the Web Speech API
src/Hud.js            Camera-attached text-plane prompt, for on-screen messages inside VR
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
- `Room.js`: the random width/depth range (and `height`/`groundHeight`) for
  the building's overall size, the window/desk layout inside
  `buildWalls(...)`/`addDesks(...)`, `FLOOR_DROP` (how far below the ground
  floor sits), `TUNNEL_WIDTH`/`TUNNEL_HEIGHT`/`TUNNEL_RUN` (the side
  tunnel's shape and slope), `yardWidth`/`yardLength` (the playground
  platform's footprint), the crate count/spread in `addCrates(...)`, the
  symbiote wall-face's size/placement and the `lookAt` point it turns
  toward in `addSymbioteFace`, Carnage's spot next to the crates
  (`carnagePosition`), and the skydome's center/radius in the
  `addSkydome(...)` call.
- `main.js` jump/fly constants: `JUMP_SPEED` (tap-jump impulse),
  `FLY_SPEED` (climb rate once flying), `FLY_HOLD_THRESHOLD` (how long the
  **A** button must be held before a jump turns into flight), and
  `RAGDOLL_WOBBLE_AMPLITUDE`/`RAGDOLL_WOBBLE_FREQ` (how floppy the rig tilts
  while airborne). `PICKUP_RADIUS` controls how close a hand needs to be to
  grab the mace; `HIT_SPEED_THRESHOLD`/`HIT_RADIUS`/`HIT_COOLDOWN`/
  `KNOCK_FORCE` control how hard and how often a mace swing needs to
  connect to register a hit, and `Gravity.js`'s `KnockBody` class (its
  internal `KNOCK_DRAG`) controls how quickly a knocked-back crate or
  Carnage skids to a stop. `ORB_POP_DURATION`/`ORB_HOME_ACCEL`/
  `ORB_HOME_MAX_SPEED`/`ORB_COLLECT_RADIUS` control how long a rainbow
  orb hops before homing in on you, how fast it accelerates and tops out,
  and how close it needs to get before it's collected.
- `venomTexture.js`'s `createCarnageTexture()`: the base gradient colours,
  `blobCount`/blob radius (how many purple splotches and how big), and the
  HSL range they're drawn in.
- `VenomVoice.js`: the `GREETING`/`CARNAGE_DOOR_LINE` text, the `pitch`/
  `rate` passed for each (how deep/rough each character sounds), and
  `MALE_VOICE_HINTS` (the substrings used to pick a male-sounding voice
  out of whatever the browser/OS exposes).
- `main.js` door/Carnage-prompt constants: `DOOR_PROMPT_RADIUS`/
  `CARNAGE_PROMPT_RADIUS` (how close you need to be), `PROMPT_DURATION`
  (how long the "CLICK TRIGGER TO..." message stays up), and the portal's
  opening speed (the `dt * 2` lerp factor next to `doorPortalTargetScale`)
  and swirl speed (the `dt * 0.6` on its `rotation.z`).
