// Project-authored VRM 1.0 fixture. No external character, texture or license.
// Rigid primitive meshes follow raw humanoid bones; morphs exercise expressions.
import { mkdirSync, writeFileSync } from 'node:fs';
import { BoxGeometry } from 'three';
const nodes = [], meshes = [], accessors = [], bufferViews = [], chunks = [], humanBones = {};
let byteLength = 0;
function attribute(array, type, bounds = false) {
  const buffer = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
  const aligned = Buffer.alloc(Math.ceil(buffer.length / 4) * 4); buffer.copy(aligned);
  const view = bufferViews.push({ buffer: 0, byteOffset: byteLength, byteLength: buffer.length }) - 1;
  chunks.push(aligned); byteLength += aligned.length;
  const components = type === 'SCALAR' ? 1 : 3;
  const a = { bufferView: view, componentType: array instanceof Float32Array ? 5126 : 5123, count: array.length / components, type };
  if (bounds) { a.min = [Infinity, Infinity, Infinity]; a.max = [-Infinity, -Infinity, -Infinity]; for (let i = 0; i < array.length; i++) { const j = i % 3; a.min[j] = Math.min(a.min[j], array[i]); a.max[j] = Math.max(a.max[j], array[i]); } }
  return accessors.push(a) - 1;
}
const box = new BoxGeometry(1, 1, 1);
const boxPosition = attribute(box.attributes.position.array, 'VEC3', true), normal = attribute(box.attributes.normal.array, 'VEC3'), indices = attribute(box.index.array, 'SCALAR');
function mesh(material, morph = false) {
  const primitive = { attributes: { POSITION: boxPosition, NORMAL: normal }, indices, material };
  if (morph) {
    const deltas = new Float32Array(box.attributes.position.array.length);
    for (let i = 0; i < deltas.length; i += 3) deltas[i + 1] = box.attributes.position.array[i + 1] * 4;
    primitive.targets = [{ POSITION: attribute(deltas, 'VEC3', true) }];
  }
  return meshes.push({ primitives: [primitive], ...(morph ? { weights: [0] } : {}) }) - 1;
}
const bodyMesh = mesh(0), darkMesh = mesh(1), accentMesh = mesh(2), mouthMesh = mesh(1, true), blinkMesh = mesh(1, true);
function node(name, translation, parent = null, extra = {}) {
  const id = nodes.push({ name, translation, ...extra }) - 1;
  if (parent !== null) (nodes[parent].children ??= []).push(id); return id;
}
function bone(name, translation, parent) { const id = node(name, translation, parent); humanBones[name] = { node: id }; return id; }
function cube(parent, name, translation, scale, mesh = bodyMesh) { return node(name, translation, parent, { mesh, scale }); }
const hips = bone('hips', [0, .9, 0], null), spine = bone('spine', [0, .2, 0], hips), chest = bone('chest', [0, .22, 0], spine), neck = bone('neck', [0, .18, 0], chest), head = bone('head', [0, .12, 0], neck);
cube(hips, 'waist', [0, 0, 0], [.27, .22, .22]); cube(spine, 'body', [0, .14, 0], [.5, .47, .3]);
cube(head, 'head-shell', [0, .1, 0], [.48, .38, .35]); cube(head, 'antenna', [0, .38, 0], [.045, .18, .045], accentMesh);
const mouth = cube(head, 'mouth-aa', [0, .015, .183], [.12, .025, .015], mouthMesh);
// A separate eye mesh allows independent blink expression bindings.
const eyeLeft = cube(head, 'eye-left', [.12, .14, .183], [.065, .06, .015], blinkMesh), eyeRight = cube(head, 'eye-right', [-.12, .14, .183], [.065, .06, .015], blinkMesh);
const blinkDeltas = accessors[meshes[blinkMesh].primitives[0].targets[0].POSITION];
// Change blink morph to collapse Y, keeping each eye independently bound.
const blinkChunk = chunks[blinkDeltas.bufferView];
for (let i = 0; i < box.attributes.position.array.length; i += 3) blinkChunk.writeFloatLE(-box.attributes.position.array[i + 1] * .94, (i + 1) * 4);
blinkDeltas.min = [0, -.47, 0]; blinkDeltas.max = [0, .47, 0];
for (const [side, sign] of [['left', 1], ['right', -1]]) {
  const upper = bone(`${side}UpperArm`, [sign * .3, .1, 0], chest), lower = bone(`${side}LowerArm`, [sign * .28, 0, 0], upper), hand = bone(`${side}Hand`, [sign * .23, 0, 0], lower);
  cube(upper, `${side}-upper-arm`, [sign * .14, 0, 0], [.28, .1, .12]); cube(lower, `${side}-lower-arm`, [sign * .115, 0, 0], [.23, .08, .1]); cube(hand, `${side}-hand`, [sign * .05, 0, 0], [.1, .13, .14], accentMesh);
  const thigh = bone(`${side}UpperLeg`, [sign * .14, -.06, 0], hips), shin = bone(`${side}LowerLeg`, [0, -.35, 0], thigh), foot = bone(`${side}Foot`, [0, -.35, 0], shin);
  cube(thigh, `${side}-thigh`, [0, -.17, 0], [.12, .34, .15]); cube(shin, `${side}-shin`, [0, -.17, 0], [.1, .34, .13]); cube(foot, `${side}-foot`, [0, -.03, .065], [.17, .1, .25], accentMesh);
}
const expression = id => ({ morphTargetBinds: [{ node: id, index: 0, weight: 1 }], isBinary: false });
const gltf = { asset: { version: '2.0', generator: 'camera-game-lab / TECH-AVATAR-001' }, scene: 0, scenes: [{ nodes: [hips] }], nodes, meshes, accessors, bufferViews,
  buffers: [{ byteLength, uri: 'data:application/octet-stream;base64,' + Buffer.concat(chunks).toString('base64') }],
  materials: [{ pbrMetallicRoughness: { baseColorFactor: [.67, .82, .98, 1], metallicFactor: 0, roughnessFactor: .7 } }, { pbrMetallicRoughness: { baseColorFactor: [.025, .04, .055, 1], metallicFactor: 0, roughnessFactor: 1 } }, { pbrMetallicRoughness: { baseColorFactor: [1, .49, .3, 1], metallicFactor: 0, roughnessFactor: .7 } }],
  extensionsUsed: ['VRMC_vrm'], extensions: { VRMC_vrm: { specVersion: '1.0',
    meta: { name: 'Camera Lab Puppet Test', version: '0.1', authors: ['camera-game-lab'], licenseUrl: 'https://vrm.dev/licenses/1.0/', avatarPermission: 'everyone', allowExcessivelyViolentUsage: false, allowExcessivelySexualUsage: false, commercialUsage: 'corporation', allowPoliticalOrReligiousUsage: false, allowAntisocialOrHateUsage: false, creditNotation: 'unnecessary', allowRedistribution: true, modification: 'allowModificationRedistribution' },
    humanoid: { humanBones }, expressions: { preset: { aa: expression(mouth), blinkLeft: expression(eyeLeft), blinkRight: expression(eyeRight) } } } } };
mkdirSync('public/models', { recursive: true }); writeFileSync('public/models/puppet-test.vrm', JSON.stringify(gltf));
console.log(`Wrote ${Buffer.byteLength(JSON.stringify(gltf))} bytes: public/models/puppet-test.vrm`);
