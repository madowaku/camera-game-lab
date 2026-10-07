// Bounded keyed pools. Exhaustion drops an effect rather than allocating more.
export class ObjectPool {
  constructor() { this.kinds = new Map(); this.owners = new Map(); }
  register(key, { create, reset = () => {}, deactivate = object => object.setActive?.(false)?.setVisible?.(false), destroy = object => object.destroy?.(), max = 64 }) {
    if (this.kinds.has(key) || !Number.isInteger(max) || max < 1) throw new Error(`Invalid pool registration: ${key}`);
    this.kinds.set(key, { create, reset, deactivate, destroy, max, all: new Set(), free: [], active: new Set() });
    return this;
  }
  acquire(key, ...args) {
    const pool = this.kinds.get(key);
    if (!pool) throw new Error(`Unknown pool: ${key}`);
    let object = pool.free.pop();
    if (!object) {
      if (pool.all.size >= pool.max) return null;
      object = pool.create(); pool.all.add(object); this.owners.set(object, pool);
    }
    pool.active.add(object); pool.reset(object, ...args); return object;
  }
  release(object) {
    const pool = this.owners.get(object);
    if (!pool?.active.delete(object)) return false;
    pool.deactivate(object); pool.free.push(object); return true;
  }
  reset() { for (const pool of this.kinds.values()) for (const object of [...pool.active]) this.release(object); }
  destroy() { for (const pool of this.kinds.values()) for (const object of pool.all) pool.destroy(object); this.kinds.clear(); this.owners.clear(); }
  get activeCount() { return [...this.kinds.values()].reduce((n, pool) => n + pool.active.size, 0); }
  get size() { return this.owners.size; }
}
