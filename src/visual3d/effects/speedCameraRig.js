const clamp01 = value => Math.max(0, Math.min(1, value));

export class SpeedCameraRig {
  constructor(camera, {
    minSpeed = 180,
    maxSpeed = 330,
    maxFovBoost = 8,
    sway = .025,
  } = {}) {
    this.camera = camera;
    this.baseFov = camera.fov;
    this.basePosition = camera.position.clone();
    this.minSpeed = minSpeed;
    this.maxSpeed = Math.max(minSpeed + 1, maxSpeed);
    this.maxFovBoost = Math.max(0, maxFovBoost);
    this.sway = Math.max(0, sway);
    this.amount = 0;
  }

  update({ speed = this.minSpeed, boosted = false, time = 0, dt = 16, reducedMotion = false } = {}) {
    const normalized = clamp01((speed - this.minSpeed) / (this.maxSpeed - this.minSpeed));
    const target = reducedMotion ? 0 : Math.max(normalized * .55, boosted ? 1 : 0);
    const blend = 1 - Math.exp(-Math.max(0, Math.min(100, dt)) / (target > this.amount ? 150 : 260));
    this.amount += (target - this.amount) * blend;

    this.camera.fov = this.baseFov + this.maxFovBoost * this.amount;
    const motion = reducedMotion ? 0 : this.amount;
    this.camera.position.set(
      this.basePosition.x + Math.sin(time * .0031) * this.sway * motion,
      this.basePosition.y + Math.cos(time * .0023) * this.sway * .65 * motion,
      this.basePosition.z
    );
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
    return this.amount;
  }

  reset() {
    this.amount = 0;
    this.camera.fov = this.baseFov;
    this.camera.position.copy(this.basePosition);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
  }

  dispose() {
    this.reset();
  }
}
