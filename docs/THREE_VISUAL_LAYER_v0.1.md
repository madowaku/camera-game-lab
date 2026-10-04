# Three.js Visual Layer v0.1

Status: DESIGN  
Target: camera-game-lab  
Date: 2026-10-04

## 1. Purpose

camera-game-lab に three.js を追加し、カメラ入力ゲームへ「奥行き」「空間」「粒子」「3Dオブジェクト」「画面奥への移動」を持ち込む。

v0.1 の目的はゲーム全体を3D化することではない。

**既存のゲームロジック・MediaPipe入力・Platform lifecycleを保ったまま、必要なEXPだけが後付けできる3D演出レイヤーを作る。**

主な利用候補:

- 指印魔法 / MAGIC TEST
- BODY WINGS
- NOTE EATER
- GUARDIAN SPIRIT
- BLINK HORROR
- FINGER GUN
- PALM PONG

2Dの方が強いゲームは移行しない。

例:

- WIPE!
- DON'T LAUGH
- だいたい勇者
- UI主体のゲーム

---

## 2. Core principle

### Rule A: Game state never lives in Three.js

Three.js object position, animation progress, scene hierarchyをゲームルールの正としない。

```
MediaPipe / Camera
        ↓
src/input/*
        ↓
normalized player input
        ↓
src/games/*
        ↓
deterministic game state + events
        ↓
Three.js Visual Layer
```

Three.js は最後の「見せ方」だけを担当する。

### Rule B: Visual layer never owns camera recognition

Three.js側から `getUserMedia`、MediaPipe初期化、gesture判定を行わない。

既存の `src/input/*` が持つ camera / model lifecycle を維持する。

### Rule C: 2D and 3D coexist

全ゲームをthree.jsへ寄せない。

ゲームごとに以下を選べる状態を目標とする。

```js
visual: "dom"
visual: "canvas2d"
visual: "three"
visual: "hybrid"
```

v0.1では metadata は必須にしない。まずは3D対応ゲーム側からlazy importする。

---

## 3. Fit with the current architecture

現在の構成にはすでに良い境界がある。

### Input

`src/input/bodyInput.js` などが camera / MediaPipe lifecycleを所有している。

ここは変更しない。

### Game logic

`src/games/*` はゲーム状態・判定・イベントを持つ。

例: BODY WINGS は `ringsAhead`、`PERFECT`、`BOOST` などをゲーム側で確定している。

この方針を維持する。

### View

各ゲームの View が、

- activate / deactivate
- requestAnimationFrame
- input sampling
- game.step
- draw/render
- UI更新

を統合する。

Three.js layer は View から使う。

### Platform

`src/platform/launcher.js` はゲームinstanceのcache、activate/deactivate、input releaseを担当している。

Three.jsはPlatformの必須依存にしない。

つまり、three.jsを使わないゲームのbundleやruntimeへ不要なコストを持ち込まない。

### MotionDirector

`src/platform/motionDirector.js` のCSS motionは残す。

Three.js effectとMotionDirectorは競合させず、役割を分ける。

- Three.js: 世界内の奥行き、物体、particle、trail、camera FX
- MotionDirector: DOM上の短い強調、caption、platform共通演出

---

## 4. Rendering stack

基本構成は以下。

```
┌─────────────────────────────┐
│ DOM HUD / buttons / captions │  ← highest
├─────────────────────────────┤
│ Platform MotionDirector       │
├─────────────────────────────┤
│ Three.js transparent canvas   │
├─────────────────────────────┤
│ camera <video>                │
└─────────────────────────────┘
```

### Camera background

v0.1では可能な限り **camera videoをDOM backgroundとして表示し、その上にtransparent WebGL canvasを重ねる**。

理由:

- 毎frame VideoTexture uploadを避ける
- MediaPipeとGPU帯域を奪い合いにくい
- camera previewのmirror制御を既存CSSで維持できる
- 3D layerを完全に独立して破棄できる

VideoTextureが必要な特殊表現は後段で追加する。

---

## 5. Proposed module layout

```
src/
  visual3d/
    createThreeVisualLayer.js
    viewport.js
    projection.js
    performancePolicy.js
    disposeScene.js

    effects/
      particleTrail.js
      impactBurst.js
      magicCircle.js
      screenShake.js

    presets/
      cameraFxPreset.js
      worldPreset.js
```

ゲーム固有の3Dモデル・演出は共通層へ入れない。

```
src/
  magicTest/
    threeScene.js

  bodyWings/
    threeScene.js

  guardian/
    threeScene.js
```

共通層は「道具箱」、ゲーム側は「演出監督」。

---

## 6. Public API

想定する最小API。

```js
const visual = await createThreeVisualLayer({
  host: stageElement,
  transparent: true,
  mirror: true,
  profile: "camera-fx",
});

visual.resize();

visual.render({
  dt,
  now,
  game,
  input,
});

visual.pause();
visual.resume();

visual.dispose();
```

必要に応じて低レベルAPIも提供する。

```js
visual.scene
visual.camera
visual.renderer

visual.screenToWorld({ x, y }, depth)
visual.normalizedToWorld({ x, y }, depth)
visual.createEffect(...)
```

ただしゲームロジック側が `visual.scene` を読むことは禁止する。

---

## 7. Coordinate contract

カメラゲームでは「左右反転」が最もバグを生みやすい。

そのため入力座標を一度 canonical player space に統一する。

### Player space

```
x = 0.0  screen left
x = 1.0  screen right
y = 0.0  screen top
y = 1.0  screen bottom
```

ここでいう left / right は **プレイヤーがpreview上で見ている方向**。

front cameraのmirror補正は projection layer で1回だけ行う。

### NDC conversion

```js
ndcX = x * 2 - 1
ndcY = 1 - y * 2
```

### Depth

MediaPipeのz値をそのまま世界距離として使わない。

端末・姿勢・モデルでscaleが安定しないため、v0.1では演出用のsynthetic depthを使う。

```
depth = 0.0  player plane
depth = 0.3  near effect
depth = 0.6  gameplay space
depth = 1.0  far world
```

例:

- 指先の光球: 0.05
- 魔法陣: 0.20
- 敵: 0.45
- 遠景ring: 0.80

実世界の奥行き推定はv0.1 scope外。

---

## 8. Renderer policy

v0.1は `WebGLRenderer` を標準とする。

WebGPUは共通APIが安定してから別adapterとして検討する。

推奨初期設定:

```js
new WebGLRenderer({
  alpha: true,
  antialias: quality.antialias,
  powerPreference: "high-performance",
});
```

pixel ratioは無制限にdevicePixelRatioを使わない。

```js
renderer.setPixelRatio(
  Math.min(devicePixelRatio, quality.maxPixelRatio)
);
```

初期値:

| profile | DPR cap | particles | post FX | shadows |
|---|---:|---:|---|---|
| low | 1.0 | 80 | off | off |
| standard | 1.5 | 180 | light | off |
| high | 2.0 | 400 | optional | off |

camera + MediaPipe + WebGLが同時にGPUを使うため、**shadow mapはv0.1では使用しない**。

---

## 9. Adaptive performance

Visual Layerがゲーム本体の認識精度を壊してはいけない。

優先順位:

1. camera tracking
2. game simulation
3. visual effect

fps低下時に最初に捨てるのは演出。

### Degrade order

```
post processing
    ↓
particle count
    ↓
trail length
    ↓
DPR
    ↓
antialias
    ↓
minimal 3D
```

trackingやgame stepを削らない。

### Initial guard

最初の数秒でframe timeを観測し、明確に重い端末ではqualityを1段落とす。

頻繁に上下させない。quality changeは1セッション最大2回程度に抑える。

---

## 10. Lifecycle

現在のPlatformはcontroller instanceをcacheする。

そのためWebGL contextをgame instanceと同じ寿命にすると、複数ゲームを遊んだ際にcontextが蓄積する危険がある。

v0.1では **Three rendererはactivation単位で作り、deactivateで破棄する**。

```
activate
  ↓
lazy import three
  ↓
create renderer
  ↓
play
  ↓
deactivate
  ↓
cancel RAF owned by visual
dispose geometry/material/texture
renderer.dispose()
remove canvas
```

ゲームcontroller自体はcacheされてもよい。

### Mandatory disposal

`dispose()` は以下を保証する。

- geometry.dispose()
- material.dispose()
- texture.dispose()
- render target dispose
- composer/pass dispose when present
- renderer.dispose()
- event listener removal
- ResizeObserver removal
- internal RAF cancellation
- canvas removal

visual layer自身が独立RAFを持つのは原則避ける。

ゲームViewの既存loopからrenderする。

---

## 11. Lazy loading

`three` は3Dゲームでだけロードする。

例:

```js
async function ensureThreeScene() {
  if (!this.visual) {
    const { createThreeVisualLayer } =
      await import("../visual3d/createThreeVisualLayer.js");

    this.visual = await createThreeVisualLayer({
      host: this.stage,
      mirror: this.source === "camera",
      profile: "camera-fx",
    });
  }
}
```

Platform home/feed表示時にはthree.jsをロードしない。

2Dゲームを遊ぶユーザーにもロードさせない。

---

## 12. Visual event contract

Gameが出したeventをVisual Layerが受け取る。

例:

```js
for (const event of game.takeEvents()) {
  audio.play(event);
  visual.handle(event);
}
```

Visual effectは結果へ影響しない。

### Common event vocabulary

将来共通化しやすい候補:

```
SPAWN
HIT
MISS
PERFECT
COMBO
BOOST
CHARGE
CAST
IMPACT
CLEAR
FINISH
```

各eventは最低限、

```js
{
  type: "IMPACT",
  at: game.time,
  data: {
    x: 0.62,
    y: 0.41,
    intensity: 0.8
  }
}
```

を持てる形が理想。

---

## 13. Common effects v0.1

最初から巨大なeffect libraryを作らない。

以下の4つで始める。

### 1. ParticleTrail

用途:

- 指先
- 魔法
- NOTE EATER
- FINGER GUN
- BODY WINGS boost

### 2. ImpactBurst

用途:

- 命中
- PERFECT
- ring通過
- ボールhit

### 3. MagicCircle

用途:

- 指印魔法
- GUARDIAN SPIRIT
- charge演出

円、glyph、回転ringのprimitiveベース。

### 4. ScreenShake

Three cameraを短時間だけ揺らす。

DOM HUDは揺らさない。

酔いやすさを避けるため、

- short
- low amplitude
- prefers-reduced-motionではoff

---

## 14. Post processing

v0.1のpost processingは慎重に扱う。

標準ではOFF。

導入候補:

- light bloom
- vignette
- chromatic aberrationを使わない簡易impact
- afterimage trail

DOF、heavy blur、multi-pass distortionは初期scope外。

理由はMediaPipeとGPU budgetを共有するため。

「派手さ」はpost FXよりparticle、scale、timing、camera movementで先に作る。

---

## 15. Accessibility / reduced motion

`prefers-reduced-motion: reduce` の場合:

- screen shake off
- long trail off
- camera punch off
- particle count reduced
- rapid rotation reduced
- flash intensity reduced

ゲーム情報そのものは欠落させない。

成功・失敗はHUD、shape、soundでも分かるようにする。

---

## 16. Camera mirror rules

front cameraはpreviewとlandmarkの左右関係を揃える。

rear cameraはmirrorしない。

Visual Layerの利用側が毎回 `1 - x` しない。

mirror transformは共通projection層で一元化する。

このルールを破るコードは追加しない。

---

## 17. Demo mode

すべての3Dゲームはcamera無しでもrendererを確認できるようにする。

Demo modeではsynthetic inputを流す。

```js
{
  x: 0.5,
  y: 0.5,
  active: true
}
```

これにより:

- desktop QA
- screenshot
- visual regression
- automated browser test

がcamera permissionなしで可能になる。

---

## 18. Failure fallback

WebGL初期化に失敗してもゲーム全体を落とさない。

```
Three init success
  → three mode

Three init failure
  → existing Canvas2D / DOM fallback
```

3Dがゲームルールの正ではないため、このfallbackが成立する。

ゲームごとに `fallbackRenderer` を残す。

---

## 19. Testing strategy

### Unit

対象:

- normalized → NDC conversion
- mirror conversion
- viewport resize
- quality degradation
- event mapping
- dispose traversal

Three sceneの見た目そのものをNode testへ詰め込みすぎない。

### Browser QA

必須:

- 360×800
- 720×1280
- portrait
- landscape where required
- camera denied
- demo mode
- page hidden / resume
- rotate
- enter → exit → enter repeated

### Leak gate

10回程度の game enter / exit 後に以下を確認する。

- active MediaStreamTrack = 0 after exit
- active renderer RAF = 0 after exit
- detached canvasが増え続けない
- WebGL context lost警告が出ない

---

## 20. First pilot: MAGIC TEST

最初の実験は新規3D大作ではなく、共通層を試す小さなvertical sliceにする。

### Flow

1. front camera
2. fingertipにlight orb
3. 指を動かすとParticleTrail
4. 印成立でMagicCircle出現
5. castでprojectileが画面奥へ飛ぶ
6. targetへImpactBurst
7. failed castなら変な魔法が出る

### Success criteria

- MediaPipe trackingを落とさず動く
- 360×800で破綻しない
- three.jsはpilot起動までdownloadされない
- exitでrenderer/context/resourcesを解放
- reduced-motion対応
- demo modeでcameraなしQA可能
- Visual Layerを別ゲームから再利用できる

---

## 21. Adoption priority

### Tier A: three.js効果が大きい

1. 指印魔法
2. BODY WINGS
3. NOTE EATER
4. GUARDIAN SPIRIT
5. BLINK HORROR

### Tier B: 部分利用が強い

6. FINGER GUN
7. PALM PONG

### Keep 2D first

- WIPE!
- DON'T LAUGH
- だいたい勇者
- UI / silhouette中心のゲーム

---

## 22. Suggested implementation order

### TASK-001

`three` dependency追加。

### TASK-002

`src/visual3d/createThreeVisualLayer.js` を作成。

- transparent canvas
- PerspectiveCamera
- resize
- DPR cap
- dispose

### TASK-003

`projection.js`。

- normalizedToNdc
- mirror
- screenToWorld

### TASK-004

`performancePolicy.js`。

- low / standard / high
- adaptive degrade

### TASK-005

共通effect 4種。

- ParticleTrail
- ImpactBurst
- MagicCircle
- ScreenShake

### TASK-006

MAGIC TESTへ接続。

### TASK-007

demo / reduced motion / context cleanup tests。

### TASK-008

BODY WINGSで2本目の再利用検証。

2本目で使いにくいAPIが見つかった場合に初めて共通層を修正する。

---

## 23. Definition of done for Visual Layer v0.1

以下を満たしたらv0.1完成。

- [ ] existing 2D games remain unchanged
- [ ] three.js loads only for three-enabled games
- [ ] game logic has no Three.js dependency
- [ ] input layer has no Three.js dependency
- [ ] one active game creates at most one WebGL renderer
- [ ] renderer/resources are released on deactivate
- [ ] normalized camera coordinates map consistently on front/rear camera
- [ ] reduced-motion works
- [ ] WebGL failure has a fallback
- [ ] MAGIC TEST uses all four common effects
- [ ] BODY WINGS can reuse the same Visual Layer without copying infrastructure

---

## 24. Decision summary

Three.jsはcamera-game-labの新しい土台ではなく、**選択可能なVisual Layer**として導入する。

```
INPUT        = reality
GAME         = rules
THREE.JS     = spectacle
DOM / UI     = communication
PLATFORM     = lifecycle
```

この境界を守る。

camera-game-labの強みは「3Dだから面白い」ではなく、
**身体入力で起きたことが、現実空間の続きを見ているような演出で返ってくること**。

Three.js Visual Layer v0.1は、そのための薄くて強い演出層にする。
