# Camera Input Feel Layer v0.1
Implementation Spec

Status: Draft v0.1  
Project: camera-game-lab  
Target: Web / Mobile Browser  
Primary references: Earth in Your Hand / existing PALM PONG / TILT TURBO input implementations

## 1. Purpose

Camera Input Feel Layer は、MediaPipe 等から得られた認識結果をそのままゲームへ渡すのではなく、**プレイヤーの意図をゲームらしい運動へ変換する共通層**である。

Camera Game Lab ではこれまで、認識結果の安定化を各ゲーム内で個別に実装してきた。

PALM PONG では手位置に対して時間方向の平滑化と遅延補間を行い、TILT TURBO では頭部傾きに対して平滑化、デッドゾーン、非線形レスポンスを適用している。

v0.1では、それらを一つの巨大な万能フィルタへ統合するのではなく、再利用可能な小さな「触感プリミティブ」として切り出す。

目標は、

> Raw camera input を正確に再現することではなく、  
> プレイヤーが「自分が動かした」と感じる操作へ変換すること。

である。

---

# 2. Layer Architecture

Camera Input Pipeline は以下の責務に分離する。

```text
Camera
  ↓
MediaPipe / Sensor
  ↓
RAW LANDMARK / RAW SIGNAL
  ↓
Reliability Layer
  ↓
STABLE SIGNAL
  ↓
Feel Layer
  ↓
GAME INPUT
  ↓
Game Logic / Physics
  ↓
Presentation
```

### Reliability Layer

担当するもの:

```text
confidence
tracking loss
jump rejection
gesture hold
hysteresis
temporal stability
hand ownership
calibration
```

問いは、

> 「この入力を信用してよいか？」

である。

### Feel Layer

担当するもの:

```text
dead zone
response curve
easing
spring
velocity
friction
inertia
snap
magnetism
```

問いは、

> 「この入力をどう動かしたら気持ちいいか？」

である。

両者を混同しない。

特に Feel Layer は認識失敗を隠蔽するための層ではない。

---

# 3. Core Principle

Camera Input Feel Layer v0.1 の原則は次の4つとする。

| Principle | Rule |
|---|---|
| Low latency first | 平滑化より応答性を優先する |
| Small composable functions | 巨大な万能フィルタを作らない |
| Game-specific feel | ゲームによって触感を変える |
| Truth / Feel separation | 必要なら判定位置と描画位置を分離する |

特に最後を重要原則とする。

```text
STABLE INPUT
     │
     ├── Truth Input → collision / judgment
     │
     └── Feel Output → visual / animation
```

「見た目は滑らかだが判定は遅延しない」という構造を許可する。

---

# 4. Directory

新規共通モジュールを以下に置く。

```text
src/inputFeel/
  smooth.js
  response.js
  spring.js
  inertia.js
  snap.js
  presets.js
  index.js
```

テスト:

```text
test/inputFeel.test.js
```

v0.1では外部ライブラリを追加しない。

純粋なJavaScriptで実装する。

Three.js / GSAP / MediaPipe への依存も持たせない。

---

# 5. Primitive API

## 5.1 exponentialSmooth

時間差を考慮した指数平滑。

既存 PALM PONG / TILT TURBO と同系統の方式を共通化する。

```js
exponentialSmooth(current, target, dt, tau)
```

### Parameters

| Parameter | Meaning |
|---|---|
| current | 現在値 |
| target | 入力値 |
| dt | 経過秒 |
| tau | 時定数 |

基本式:

```text
alpha = 1 - exp(-dt / tau)

output =
current + (target - current) × alpha
```

固定フレームレート前提の

```js
current += (target - current) * 0.1
```

は共通層では使用しない。

端末FPSによって触感が変わらないよう、時間基準とする。

---

# 6. smoothVec2

2D座標用。

```js
smoothVec2(current, target, dt, tau)
```

戻り値:

```js
{
  x,
  y
}
```

用途:

```text
hand position
face position
paddle
cursor
virtual object
```

---

# 7. Dead Zone

小さな揺れを無視する。

```js
applyDeadZone(value, zone)
```

例:

```text
-0.05 ～ +0.05
→ 0
```

ただし境界で値が急に飛ばないよう、デッドゾーン外を再正規化する。

```text
input

 -1              0              +1
  |--------------|--------------|

dead zone

              [-0.1 +0.1]
```

結果:

```text
0.10 → 0
0.20 → 0.11...
1.00 → 1
```

---

# 8. Response Curve

入力の感度を変更する。

```js
responseCurve(value, exponent)
```

基本:

```text
output =
sign(value) × abs(value)^exponent
```

例:

| exponent | Feel |
|---:|---|
| 0.7 | 小さい入力にも敏感 |
| 1.0 | linear |
| 1.4 | 中心付近が穏やか |
| 2.0 | 大きく動かすまで反応を抑える |

TILT TURBO では現在使われている非線形操舵をこのカテゴリへ整理する。

---

# 9. Spring Follow

Earth in Your Hand の単純 easing より少し一般化した追従系。

```js
createSpring1D(options)
createSpring2D(options)
```

API:

```js
spring.update(target, dt)
```

state:

```js
{
  value,
  velocity
}
```

Parameters:

```text
frequency
damping
maxVelocity
```

用途:

```text
SOFT SERVE cone
avatar
puppet
floating UI
camera companion
virtual hand
```

過度なバネ演出は避ける。

デフォルトでは overshoot しない、またはごく小さい設定を使用する。

---

# 10. Inertia

入力の速度を仮想物体へ渡す。

```js
createInertia1D(options)
createInertia2D(options)
```

操作:

```js
inertia.push(impulse)
inertia.update(dt)
```

state:

```js
{
  position,
  velocity
}
```

Parameters:

```text
friction
maxVelocity
stopThreshold
```

Earth in Your Hand の

```text
rotationVelocity += inputImpulse
rotationVelocity *= 0.99
```

を時間依存しない形へ一般化する。

用途:

```text
globe spin
throw
swipe
AIR SLASH
camera-object rotation
wheel
spinner
```

---

# 11. Magnetic Snap

認識精度をゲーム設計側から補助する。

```js
magneticSnap(position, target, options)
```

Parameters:

```text
radius
strength
releaseRadius
```

状態は、

```text
FREE
ATTRACTED
SNAPPED
```

の3段階を許可する。

用途:

```text
SOFT SERVE nozzle
PINCH WORLD objects
buttons
slots
puzzle sockets
targets
```

重要:

Snap は「判定をごまかす」機能ではない。

プレイヤーの意図が十分明白な範囲でのみ使用する。

---

# 12. Feel Presets

ゲーム側が物理値を毎回直接指定しなくてもよいよう、v0.1では少数の preset を用意する。

```js
FEEL_PRESETS.direct
FEEL_PRESETS.steering
FEEL_PRESETS.softFollow
FEEL_PRESETS.sport
FEEL_PRESETS.inertial
```

### direct

用途:

```text
cursor
aim
precise selection
```

Characteristics:

```text
very low latency
little smoothing
no inertia
```

### steering

用途:

```text
TILT TURBO
BODY WINGS
vehicle control
```

Characteristics:

```text
dead zone
response curve
small smoothing
```

### softFollow

用途:

```text
SOFT SERVE
puppets
avatars
companions
```

Characteristics:

```text
spring follow
slight lag
visual softness
```

### sport

用途:

```text
PALM PONG
boxing
goalkeeper
```

Characteristics:

```text
minimal latency
velocity preserved
almost no visual lag
```

### inertial

用途:

```text
globe
throw
spin
swipe-powered objects
```

Characteristics:

```text
impulse
momentum
friction
```

preset の数値は固定仕様ではない。

A401OP実機テストによって調整する。

---

# 13. PALM PONG Integration

PALM PONG は Feel Layer v0.1 の最重要テスト対象とする。

現在の tracking.js は、

```text
hand identity
jump rejection
60ms smoothing
40ms interpolation
tracking reliability
```

を担当している。

v0.1ではこの処理を一度に置換しない。

まず、

```text
PalmTracker
↓
stable hand
↓
Feel Layer
```

として追加可能にする。

ただしゲーム判定と見た目を分離する。

```text
PalmTracker
   │
   ├── Physics Paddle
   │     minimal processing
   │
   └── Visual Paddle
         sport preset
```

Collision 判定へ大きな easing を適用してはいけない。

目的は、

```text
手を振った瞬間に当たる
+
画面ではガタつかない
```

を両立すること。

### PALM PONG A/B

```text
A:
current implementation

B:
current reliability
+
Feel Layer visual output
```

比較項目:

| Metric | Target |
|---|---|
| perceived delay | 増えない |
| paddle jitter | 減少 |
| accidental miss | 増えない |
| hand→paddle connection | 改善または同等 |

---

# 14. TILT TURBO Integration

TILT TURBO は連続アナログ入力のテスト対象。

現在:

```text
head roll
↓
calibration
↓
70ms smoothing
↓
dead zone
↓
response curve
↓
steering
```

v0.1では、

```text
smoothing
dead zone
response curve
```

を Feel Layer API に置換可能な構造へ整理する。

ゲーム挙動は変更しない。

第一段階は完全なリファクタリング equivalence とする。

その後 experimental preset として、

```text
steering + small inertia
```

を比較する。

### Variant B

```text
head tilt
↓
stable roll
↓
dead zone
↓
response curve
↓
target steering
↓
light spring
↓
car steering
```

狙いは「カーソル移動」ではなく、

> 車体に少し重量がある

感覚。

ただし操作遅延が感じられる場合は採用しない。

---

# 15. SOFT SERVE Experimental Integration

v0.1の必須実装対象ではない。

PALM PONG / TILT TURBO検証後の最初の適用候補とする。

想定:

```text
hand position
↓
Reliability
↓
softFollow
↓
cone
```

ノズル付近では、

```text
magneticSnap
```

を適用できる。

狙い:

```text
正確にノズル中央へ置かなければ失敗
```

ではなく、

```text
ノズルへ置こうとしている
↓
ゲーム側が数cmだけ助ける
```

へ変える。

---

# 16. No Double Smoothing Rule

Feel Layer導入時に最も注意する。

既存ゲームにはすでに smoothing が存在する。

したがって、

```text
existing smoothing
↓
new smoothing
↓
spring
```

のような多重処理を無条件に追加してはいけない。

症状:

```text
遅延
追従不足
水中操作感
入力と画面のズレ
```

ゲームごとに、

```text
Reliability smoothing
Feel smoothing
Visual smoothing
```

のどこで処理しているかを明示する。

同じ目的のフィルタは原則一つ。

---

# 17. Frame Rate Independence

Feel Layer のすべての時間処理は dt ベースとする。

NG:

```js
velocity *= 0.99
```

Preferred:

```js
velocity *= Math.exp(-friction * dt)
```

NG:

```js
position += (target - position) * 0.1
```

Preferred:

```js
alpha = 1 - Math.exp(-dt / tau)
position += (target - position) * alpha
```

30fps / 60fps / 120fps で可能な限り同じ触感を維持する。

---

# 18. Tracking Loss

Feel Layer は tracking loss を推測して補完し続けない。

Reliability Layer が、

```text
present: false
reliable: false
```

を返した場合、ゲーム側が loss policy を決定する。

例:

```text
freeze
center slowly
fade
drop object
pause
```

Feel Layerだけで勝手に長時間 extrapolate しない。

最大でも明示的に設定された短時間のみとする。

---

# 19. Debug HUD

Camera Input Debug HUD と連携可能な情報を返せるようにする。

Debug mode では、

```text
RAW
STABLE
FEEL
```

の3値を同時表示できるようにする。

例:

```text
RAW       ○
STABLE     ○
FEEL        ◎
```

これによって、

```text
認識がおかしいのか
安定化がおかしいのか
触感処理がおかしいのか
```

を目視で分離できる。

将来、

```text
velocity
tracking confidence
spring velocity
snap radius
```

も表示可能にする。

---

# 20. Tests

`test/inputFeel.test.js` を追加する。

最低限以下を検証する。

| Test | Requirement |
|---|---|
| smooth convergence | targetへ収束する |
| fps independence | 30/60/120fpsで近い結果 |
| dead zone | 微小入力が0 |
| response curve | signと最大値を保持 |
| spring stability | NaN / runawayしない |
| inertia decay | 時間とともに停止 |
| max velocity | 上限を超えない |
| snap enter | radius内で吸着 |
| snap hysteresis | 境界でガタつかない |
| loss/reset | stateを安全にreset可能 |

追加で、

```text
100ms
1s
10s
```

など極端な dt を与えても破綻しないことを確認する。

---

# 21. Human Feel Test

自動テストでは「気持ちいい」は検証できない。

PALM PONG と TILT TURBO で A/B テストを行う。

各variantを最低5プレイずつ触る。

評価:

| Question | Scale |
|---|---|
| 自分の動きと一致する | 1–5 |
| 遅れて感じる | 1–5 |
| ガタつく | 1–5 |
| 操作が予測できる | 1–5 |
| もう一度触りたい | 1–5 |

技術値より主観を優先する。

特に、

> smoothing量が多いほど良い

という評価はしない。

---

# 22. Performance Budget

Feel Layer は非常に軽量であること。

目標:

```text
allocation-free update loop where practical
no DOM dependency
no renderer dependency
no MediaPipe dependency
```

数十個の入力チャンネルを毎フレーム処理しても、実用上無視できる負荷にする。

---

# 23. v0.1 Non-goals

v0.1では以下を行わない。

```text
Kalman Filterの全面導入
One Euro Filterの全面導入
機械学習による意図予測
プレイヤーごとの自動パラメータ学習
長時間の軌道予測
ジェスチャー認識
MediaPipe wrapperの全面刷新
全ゲームへの一括導入
```

必要性が実測できてから追加する。

Earth in Your Hand の価値は複雑な数学ではなく、

> 数行の物理処理で認識結果を遊びへ変えたこと

にある。

v0.1でも同じ軽さを維持する。

---

# 24. Implementation Order

実装順序:

```text
STEP 1
src/inputFeel core primitives

STEP 2
unit tests

STEP 3
Debug HUD用 RAW / STABLE / FEEL出力

STEP 4
TILT TURBO既存処理を共通APIへ移行
挙動変更なし

STEP 5
PALM PONG Visual Paddle A/B

STEP 6
A401OP physical test

STEP 7
parameters tuning

STEP 8
SOFT SERVE magneticSnap experiment
```

いきなり全ゲームへ導入しない。

---

# 25. Success Criteria

Camera Input Feel Layer v0.1 は以下を満たせば成功とする。

```text
✓ 共通primitiveが独立moduleとして存在する

✓ 30/60/120fpsで大きく触感が変わらない

✓ TILT TURBOを既存挙動を壊さず移行できる

✓ PALM PONGで判定遅延を増やさず
  visual jitterを減らせる

✓ RAW / STABLE / FEELをDebug HUDで比較できる

✓ ゲーム側からpresetまたは個別parameterで調整できる

✓ 新しい外部dependencyを増やさない
```

---

# 26. Future v0.2

v0.1実機検証後に検討する。

候補:

```text
One Euro Filter
adaptive smoothing
velocity-aware smoothing
prediction
gesture momentum
direction lock
elastic boundaries
camera-space → game-space nonlinear mapping
automatic preset tuning
device FPS adaptation
```

特に有力なのは、

```text
slow movement
→ strong smoothing

fast movement
→ weak smoothing
```

となる velocity-aware smoothing。

これはカメラゲームとの相性が良い可能性が高い。

ただしv0.1では導入しない。

---

# 27. Camera Game Feel Law v0.1

最後に本Layerの設計原則を一文にする。

> **カメラの座標をゲームへ渡すのではなく、プレイヤーの意図をゲーム世界の運動へ翻訳する。**

Camera Input Reliability Layer が、

> 「何をした？」

を判断する。

Camera Input Feel Layer が、

> 「それをゲームの中でどう動かしたら気持ちいい？」

を担当する。

この二層を Camera Game Lab の共通入力設計とする。