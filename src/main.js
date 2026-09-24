import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildEnvironment } from './Environment.js';
import { createVenomMaterial } from './venomTexture.js';
import { VenomArm } from './VenomArm.js';
import { Locomotion } from './Locomotion.js';
import { TargetOrbs } from './TargetOrbs.js';
import { Hud } from './Hud.js';
import { playSmashSound } from './sound.js';

const intro = document.getElementById('intro');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 100);
camera.position.set(0, 1.6, 3);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.xr.enabled = true;
document.getElementById('app').appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

buildEnvironment(scene);

// Player rig ("dolly"): move this to move the player around the baseplate.
const rig = new THREE.Group();
rig.add(camera);
scene.add(rig);

// Desktop preview controls (only used outside an active XR session).
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.target.set(0, 1.2, 0);
orbit.enableDamping = true;

// Shared glossy black symbiote material for both tendril-arms.
const venomMaterial = createVenomMaterial();
const armLeft = new VenomArm({ material: venomMaterial, side: 'left' });
const armRight = new VenomArm({ material: venomMaterial, side: 'right' });
scene.add(armLeft.mesh, armLeft.tipAnchor, armRight.mesh, armRight.tipAnchor);

// Raw controller + grip spaces give us tracked pose data; we don't attach
// any visible controller model since the symbiote tendrils replace the hands.
const controllerGrips = [renderer.xr.getControllerGrip(0), renderer.xr.getControllerGrip(1)];
const controllers = [renderer.xr.getController(0), renderer.xr.getController(1)];
const handedness = { 0: null, 1: null };

controllers.forEach((controller, i) => {
  controller.addEventListener('connected', (event) => {
    handedness[i] = event.data.handedness;
  });
  controller.addEventListener('disconnected', () => {
    handedness[i] = null;
  });
  rig.add(controller);
  rig.add(controllerGrips[i]);
});

// Desktop fallback hand targets, so the tendrils are visible while previewing
// on a monitor without a headset connected.
const desktopTargets = {
  left: new THREE.Object3D(),
  right: new THREE.Object3D(),
};
rig.add(desktopTargets.left, desktopTargets.right);

const hud = new Hud();
hud.mesh.position.set(0, 2.4, -4);
scene.add(hud.mesh);

let score = 0;
const orbs = new TargetOrbs(scene, {
  onScore: () => {
    score += 1;
    hud.setScore(score);
    playSmashSound();
  },
});

const locomotion = new Locomotion(rig, camera, renderer);

renderer.xr.addEventListener('sessionstart', () => {
  intro.classList.add('hidden');
});
renderer.xr.addEventListener('sessionend', () => {
  intro.classList.remove('hidden');
});
intro.addEventListener('click', () => {
  if (!renderer.xr.isPresenting) intro.classList.add('hidden');
});

function findGripBySide(side) {
  for (let i = 0; i < 2; i++) {
    if (handedness[i] === side) return controllerGrips[i];
  }
  return null;
}

const shoulderOffsetLeft = new THREE.Vector3(-0.22, -0.28, -0.08);
const shoulderOffsetRight = new THREE.Vector3(0.22, -0.28, -0.08);

const tmpAnchor = new THREE.Vector3();
const tmpTarget = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();
const tmpHeadPos = new THREE.Vector3();
const tmpHeadQuat = new THREE.Quaternion();

function computeShoulderAnchor(offset, out) {
  camera.getWorldPosition(tmpHeadPos);
  camera.getWorldQuaternion(tmpHeadQuat);
  out.copy(offset).applyQuaternion(tmpHeadQuat).add(tmpHeadPos);
  return out;
}

const prevTipPositions = { left: new THREE.Vector3(), right: new THREE.Vector3() };
const tipVelocities = { left: new THREE.Vector3(), right: new THREE.Vector3() };

function updateArm(arm, side, offset, dt, inXR) {
  const anchor = computeShoulderAnchor(offset, tmpAnchor);
  const targetObject = (inXR && findGripBySide(side)) || desktopTargets[side];

  targetObject.getWorldPosition(tmpTarget);
  targetObject.getWorldQuaternion(tmpQuat);

  arm.update(anchor, tmpTarget, tmpQuat, dt);

  const tip = arm.getTip();
  const prev = prevTipPositions[side];
  const vel = tipVelocities[side];
  if (dt > 0) vel.copy(tip).sub(prev).divideScalar(dt);
  prev.copy(tip);
}

function updateDesktopTargets(t) {
  desktopTargets.left.position.set(
    -0.35 + Math.sin(t * 1.3) * 0.12,
    1.15 + Math.sin(t * 2.1) * 0.15,
    -0.5 + Math.cos(t * 1.7) * 0.15
  );
  desktopTargets.right.position.set(
    0.35 + Math.cos(t * 1.5) * 0.12,
    1.15 + Math.cos(t * 1.9) * 0.15,
    -0.5 + Math.sin(t * 1.6) * 0.15
  );
}

// The Quest right controller's "B" button lashes the right tendril out and
// back (a one-shot pulse - see VenomArm.triggerExtend). Edge-detected so
// holding the button doesn't keep re-triggering it.
let bButtonWasPressed = false;
function checkExtendButton() {
  const session = renderer.xr.getSession();
  if (!session) return;
  for (const source of session.inputSources) {
    if (source.handedness !== 'right' || !source.gamepad) continue;
    const button = source.gamepad.buttons[5]; // xr-standard: 4=A/X, 5=B/Y
    const pressed = !!button && button.pressed;
    if (pressed && !bButtonWasPressed) armRight.triggerExtend();
    bButtonWasPressed = pressed;
    return;
  }
}

// Keyboard "B" mirrors the same lash-out for desktop preview/testing.
window.addEventListener('keydown', (event) => {
  if (!event.repeat && event.key.toLowerCase() === 'b') armRight.triggerExtend();
});

const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  const t = clock.elapsedTime;
  const inXR = renderer.xr.isPresenting;

  if (inXR) {
    locomotion.update(dt);
    checkExtendButton();
  } else {
    orbit.update();
    updateDesktopTargets(t);
  }

  updateArm(armLeft, 'left', shoulderOffsetLeft, dt, inXR);
  updateArm(armRight, 'right', shoulderOffsetRight, dt, inXR);

  orbs.update(dt, [
    { position: armLeft.getTip(), velocity: tipVelocities.left },
    { position: armRight.getTip(), velocity: tipVelocities.right },
  ]);

  hud.mesh.lookAt(tmpHeadPos);

  renderer.render(scene, camera);
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
