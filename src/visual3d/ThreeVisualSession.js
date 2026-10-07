// Lifecycle only. Importing this adapter never loads Three or a game scene.
export class ThreeVisualSession {
  constructor({ host, loadScene, onChange = () => {}, name = 'Game', loadLayer = () => import('./createThreeVisualLayer.js') }) {
    Object.assign(this, { host, loadScene, onChange, name, loadLayer });
    this.generation = 0; this.layer = null; this.scene = null; this.error = null; this.ready = null; this.paused = false;
  }
  start(options = {}) {
    this.stop(); this.error = null;
    const token = this.generation;
    this.ready = this.create(token, options);
    return this.ready;
  }
  async create(token, options) {
    let layer, scene;
    try {
      const [module, createScene] = await Promise.all([this.loadLayer(), this.loadScene()]);
      if (token !== this.generation) return null;
      layer = module.createThreeVisualLayer({ ...options, host: this.host(),
        onError: error => this.fail(error, token) });
      if (token !== this.generation) { layer.dispose(); return null; }
      scene = createScene(layer);
      this.layer = layer; this.scene = scene; this.onChange();
      return this.layer;
    } catch (error) {
      // A partially built scene is still attached to layer.scene and is released
      // by the layer. Installed scenes own their effects first, then the layer.
      if (layer && layer !== this.layer) { scene?.dispose(); layer.dispose(); }
      this.fail(error, token); return null;
    }
  }
  render(state) {
    if (!this.scene) return false;
    try {
      const paused = !!state.paused;
      if (paused !== this.paused) {
        this.paused = paused;
        if (paused) this.layer.pause(); else this.layer.resume();
      }
      return this.scene.update(state);
    } catch (error) { this.fail(error); return false; }
  }
  handle(event, state) {
    if (!this.scene) return;
    try { this.scene.handleEvent?.(event, state); }
    catch (error) { this.fail(error); }
  }
  fail(error, token = this.generation) {
    if (token !== this.generation) return;
    this.error = error; this.stop();
    console.warn(`${this.name} 3D unavailable; keeping the existing renderer.`, error);
    this.onChange();
  }
  stop() {
    ++this.generation;
    const scene = this.scene, layer = this.layer;
    this.scene = null; this.layer = null; this.ready = null; this.paused = false;
    try { scene?.dispose(); } finally { layer?.dispose(); }
  }
}
