# Puppet test model

`puppet-test.vrm` is a project-authored, texture-free VRM 1.0 integration fixture
for TECH-AVATAR-001. It uses rigid primitive meshes, normalized humanoid bones and
mouth/left-blink/right-blink morph bindings. This is not an imported character.

Regenerate from the project root:

```sh
node scripts/generate-puppet-vrm.js
```

Embedded metadata uses the standard VRM 1.0 license URL and its usage fields.
The model is loaded only when VRM TEST is selected. A game may supply its own
bundled `modelUrl`; this layer has no upload or online-model sharing UI.
