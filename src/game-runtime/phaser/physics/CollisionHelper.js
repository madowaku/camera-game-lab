// Camera targets are kinematic. Recognition noise never becomes impulse force.
export class CollisionHelper {
  constructor(scene) { this.scene = scene; this.colliders = new Set(); }
  kinematic(object) {
    this.scene.physics.add.existing(object);
    object.body.setAllowGravity(false).setImmovable(true); object.body.moves = false;
    return object;
  }
  move(object, x, y) { object.setPosition(x, y); object.body.reset(x, y); }
  collide(a, b, callback, { overlap = false, process } = {}) {
    const collider = this.scene.physics.add[overlap ? 'overlap' : 'collider'](a, b, callback, process);
    this.colliders.add(collider);
    return () => { collider.destroy(); this.colliders.delete(collider); };
  }
  destroy() { for (const collider of this.colliders) collider.destroy(); this.colliders.clear(); }
}
