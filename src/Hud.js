import * as THREE from 'three';

/**
 * A simple heads-up prompt: a text plane parented directly to the camera,
 * so it always sits a fixed distance in front of the player's view no
 * matter where they look. A regular DOM overlay isn't rendered inside an
 * actual WebXR immersive session, so this is the way to put "on-screen"
 * text in front of the player in VR (it works identically for the desktop
 * preview, since that's the same camera).
 */
export class Hud {
  constructor(camera) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 512;
    this.canvas.height = 128;
    this.ctx = this.canvas.getContext('2d');

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.175), material);
    this.mesh.position.set(0, 0, -1.1);
    this.mesh.renderOrder = 999;
    this.mesh.visible = false;
    camera.add(this.mesh);

    this.hideAt = -Infinity;
  }

  _draw(text) {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(10,10,14,0.72)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 5;
    ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    this.texture.needsUpdate = true;
  }

  /** Shows `text` for `duration` seconds, measured against the caller's
   * own elapsed-time clock (`t`) so it stays in sync with the render loop. */
  show(text, duration, t) {
    this._draw(text);
    this.mesh.visible = true;
    this.hideAt = t + duration;
  }

  /** Call once per frame with the current elapsed time to auto-hide. */
  update(t) {
    if (this.mesh.visible && t >= this.hideAt) this.mesh.visible = false;
  }
}
