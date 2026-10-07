import { fishArt } from './assets.js';

// A curved, textured fish mesh travels in real camera depth. Imagegen's detail
// stays consistent with the 2D fish; this layer owns presentation only.
export function createLandingScene(layer) {
  const { THREE: T, scene } = layer, meshes = new Map(), loader = new T.TextureLoader();
  for (const [id, url] of Object.entries(fishArt)) {
    const texture = loader.load(url); texture.colorSpace = T.SRGBColorSpace;
    const geo = new T.PlaneGeometry(2, 1.4, 12, 4), pos = geo.attributes.position;
    for (let i=0;i<pos.count;i++) pos.setZ(i, .07 * Math.cos(pos.getX(i) * Math.PI / 2));
    geo.computeVertexNormals();
    const material = new T.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: .02, side: T.DoubleSide, depthWrite: false });
    const mesh = new T.Mesh(geo, material); mesh.visible = false; mesh.userData.fishId = id; scene.add(mesh); meshes.set(id, mesh);
  }
  return {
    update(s) {
      for (const mesh of meshes.values()) mesh.visible = false;
      const mesh = meshes.get(s.fish?.id), texture = mesh?.material.map;
      if (s.phase !== 'landing' || !mesh || !texture.image?.width) { layer.render(s.now); return false; }
      mesh.visible = true;
      const p = Math.min(1, s.age / 1.15), arc = layer.reducedMotion ? .65 : Math.sin(Math.pow(p,.72) * Math.PI);
      const pos = layer.normalizedToWorld({ x: .5, y: .75 - arc * .38 }); mesh.position.copy(pos);
      mesh.position.z = arc * 1.65;
      mesh.scale.set(1, (texture.image.height / texture.image.width) / .7, 1);
      mesh.scale.multiplyScalar(.34 + arc * .74);
      mesh.rotation.set(layer.reducedMotion ? 0 : arc * .12, layer.reducedMotion ? 0 : -.18 + p * .36, layer.reducedMotion ? 0 : -.25 + p * .5);
      layer.render(s.now); return true;
    },
    dispose() { for (const mesh of meshes.values()) mesh.visible = false; },
  };
}
