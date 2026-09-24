import * as THREE from 'three';

/**
 * A floating scoreboard sign, drawn on a canvas texture and mounted on a
 * plane in the arena so the score is visible without any 2D screen UI
 * (2D overlays don't work in an immersive VR session).
 */
export class Hud {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 512;
    this.canvas.height = 256;
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);

    const geometry = new THREE.PlaneGeometry(2.2, 1.1);
    const material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      toneMapped: false,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.score = 0;
    this._draw();
  }

  _draw() {
    const ctx = this.ctx;
    const { width, height } = this.canvas;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(5, 5, 10, 0.55)';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(150, 190, 255, 0.9)';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, width - 16, height - 16);

    ctx.fillStyle = '#eaf1ff';
    ctx.textAlign = 'center';
    ctx.font = '600 34px Segoe UI, Arial';
    ctx.fillText('SYMBIOTE SCORE', width / 2, 78);

    ctx.font = '800 96px Segoe UI, Arial';
    ctx.fillStyle = '#7fe0ff';
    ctx.shadowColor = 'rgba(120, 200, 255, 0.8)';
    ctx.shadowBlur = 24;
    ctx.fillText(String(this.score), width / 2, 190);
    ctx.shadowBlur = 0;

    this.texture.needsUpdate = true;
  }

  setScore(score) {
    this.score = score;
    this._draw();
  }
}
