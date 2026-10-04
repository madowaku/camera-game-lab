import * as THREE from 'three';
import { normalizedToNdc, syntheticPlaneZ } from './projection.js';
import { viewportSize, cappedPixelRatio } from './viewport.js';
import { initialQuality, PerformanceGovernor } from './performancePolicy.js';
import { disposeObject3D } from './disposeScene.js';

export function createThreeVisualLayer({
  host,
  transparent = true,
  mirror = false,
  profile,
  cameraZ = 5,
  depthRange = 4,
  className = 'three-visual-layer',
  onError = () => {},
} = {}) {
  if (!host) throw new Error('Three visual layer requires a host element.');
  const media = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  let reducedMotion = !!media?.matches;
  let quality = profile && typeof profile === 'object'
    ? profile
    : initialQuality({ devicePixelRatio: globalThis.devicePixelRatio ?? 1, hardwareConcurrency: globalThis.navigator?.hardwareConcurrency ?? 4, reducedMotion });
  const governor = new PerformanceGovernor(quality);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, .01, 100);
  camera.position.set(0, 0, cameraZ);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: transparent, antialias: quality.antialias, powerPreference: 'high-performance' });
  } catch (error) {
    onError(error); throw error;
  }
  renderer.setClearColor(0x000000, transparent ? 0 : 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.className = className;
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '2' });
  host.append(canvas);

  let disposed = false, paused = false, failed = false, lastRenderAt = 0, lastSize = '';
  const qualityListeners = new Set();

  const applySize = force => {
    if (disposed) return;
    const { width, height } = viewportSize(host);
    const key = `${width}x${height}@${quality.maxPixelRatio}`;
    if (!force && key === lastSize) return;
    lastSize = key;
    renderer.setPixelRatio(cappedPixelRatio(quality.maxPixelRatio));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const resize = () => applySize(true);
  const observer = globalThis.ResizeObserver ? new ResizeObserver(resize) : null;
  observer?.observe(host);
  const onReduced = event => { reducedMotion = event.matches; };
  media?.addEventListener?.('change', onReduced);
  const onContextLost = event => { event.preventDefault(); failed = true; onError(new Error('WebGL context lost.')); };
  canvas.addEventListener('webglcontextlost', onContextLost);

  const normalizedToWorld = (point, depth = 0) => {
    const ndc = normalizedToNdc(point, { mirror });
    const planeZ = syntheticPlaneZ(depth, depthRange);
    const probe = new THREE.Vector3(ndc.x, ndc.y, .5).unproject(camera);
    const direction = probe.sub(camera.position).normalize();
    if (Math.abs(direction.z) < 1e-5) return new THREE.Vector3(0, 0, planeZ);
    return camera.position.clone().add(direction.multiplyScalar((planeZ - camera.position.z) / direction.z));
  };

  // A paused scene may redraw once after resize/accessibility changes. Such a
  // redraw is not a frame-time sample and does not resume its animation.
  const render = (now = performance.now(), { force = false } = {}) => {
    if (disposed || (paused && !force) || failed) return false;
    applySize(false);
    if (!paused && lastRenderAt) {
      const next = governor.sample(now - lastRenderAt);
      if (next) {
        quality = next; lastSize = ''; applySize(true);
        qualityListeners.forEach(listener => listener(quality));
      }
    }
    if (!paused) lastRenderAt = now;
    renderer.render(scene, camera);
    return true;
  };

  applySize(true);

  return {
    THREE, scene, camera, renderer, canvas,
    get quality() { return quality; },
    get reducedMotion() { return reducedMotion; },
    get failed() { return failed; },
    normalizedToWorld,
    resize,
    render,
    pause() { paused = true; },
    resume() { paused = false; lastRenderAt = 0; },
    onQualityChange(listener) { qualityListeners.add(listener); return () => qualityListeners.delete(listener); },
    dispose() {
      if (disposed) return;
      disposed = true; observer?.disconnect(); media?.removeEventListener?.('change', onReduced);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      qualityListeners.clear(); disposeObject3D(scene); scene.clear();
      const context = renderer.getContext();
      renderer.dispose();
      if (!context.isContextLost()) renderer.forceContextLoss?.();
      canvas.remove();
    },
  };
}
