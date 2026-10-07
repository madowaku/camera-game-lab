# Avatar / Puppet Layer v0.1

**Project:** camera-game-lab\
**Layer ID:** TECH-AVATAR-001\
**Version:** v0.1\
**Goal:** カメラから取得した人間の動きを、3Dアバター・2Dキャラクター・ゲーム内オブジェクトへ共通形式で転写する。

## 1. コンセプト

Avatar / Puppet Layerは、

**Camera → Recognition → Motion → Puppet → Game**

のうち、`Motion → Puppet` を担当する。

重要なのは「人型アバター専用」にしないこと。

プレイヤーの動きで、

- 人型キャラクター
- ぬいぐるみ
- 鳥
- 魚
- 怪獣
- ロボット
- 守護霊
- 手人形
- ソフトクリーム
- 謎の生物

まで動かせる。

つまり **Avatar Layerではなく、Puppet Layerまで含める。**

---

# 2. 全体Architecture

```text
Camera
  ↓
Camera Input Layer
  ↓
MediaPipe Tasks Vision
  ↓
Motion Normalizer
  ↓
MotionFrame
  ├─ Game Input
  ├─ 2D Puppet Driver
  ├─ Three.js Puppet Driver
  └─ VRM Driver
        ↓
   Avatar / Character
```

既存ゲームは今まで通り

```text
Camera → Game
```

でも動く。

必要なEXPだけ、

```text
Camera → MotionFrame → Puppet
```

を追加できる。

Avatar/Puppet Layerを使わないゲームに負荷を与えない。

---

# 3. MotionFrame

全Rendererが共通で受け取る中間データ。

```ts
type MotionFrame = {
  timestamp: number

  tracking: {
    face: boolean
    pose: boolean
    leftHand: boolean
    rightHand: boolean
  }

  head: {
    yaw: number
    pitch: number
    roll: number
  }

  face: {
    mouthOpen: number
    smile: number
    blinkLeft: number
    blinkRight: number
  }

  body: {
    leanX: number
    leanY: number

    leftShoulder: JointRotation
    rightShoulder: JointRotation

    leftElbow: JointRotation
    rightElbow: JointRotation
  }

  hands: {
    left: HandMotion
    right: HandMotion
  }

  energy: {
    movement: number
    speed: number
  }
}
```

値は基本的に `-1〜1` または `0〜1` に正規化する。

生のMediaPipe Landmarkを各ゲームへ直接渡さない。

これによって将来認識エンジンを変更しても、ゲーム側を変更しなくて済む。

---

# 4. v0.1で扱うMotion

最初から全身モーションキャプチャを狙わない。

スマホ縦持ち・インカメラで確実に取れるものを優先する。

### Tier A / Reliable

- 頭の左右傾き
- 顔の左右向き
- 顔の上下向き
- 口を開ける
- まばたき
- 上半身左右移動
- 肩
- 肘
- 手首位置

### Tier B / Experimental

- 笑顔
- 指方向
- 手の開閉
- ピンチ
- 身体の奥行き
- 腰・脚

Tier Bはゲーム必須条件にしない。

---

# 5. Driver System

MotionFrameをキャラクターへ転写する部分を交換可能にする。

```text
MotionFrame
   ↓
PuppetDriver
```

interface:

```ts
interface PuppetDriver {
  load(config: PuppetConfig): Promise<void>
  update(frame: MotionFrame, dt: number): void
  setVisible(value: boolean): void
  reset(): void
  dispose(): void
}
```

## Driver 01
### SimplePuppetDriver

最優先で実装。

Three.js primitiveだけで作った軽量キャラ。

```text
○ HEAD
│
● BODY
├── ARM
└── ARM
```

これでMotionFrameそのものを検証できる。

外部モデル不要。

---

## Driver 02
### MascotPuppetDriver

camera-game-lab向け本命。

人間の骨格をそのままコピーするのではなく、

```text
Human Motion
↓
Character Interpretation
↓
Cute / Strange Motion
```

に変換する。

例：

```text
腕を上げる
↓
鳥
↓
翼を広げる
```

```text
口を開ける
↓
怪獣
↓
火を吐く
```

```text
身体を傾ける
↓
魚
↓
泳ぐ方向が変わる
```

**「人型である必要がない」ことがcamera-game-labの差別化ポイント。**

---

## Driver 03
### VRMPuppetDriver

Three.js +

`@pixiv/three-vrm`

を使用。

three-vrmは現在も開発が続いており、VRM読み込みだけでなくVRM Animation用パッケージも提供されている。公式リポジトリには2026年時点でもThree.js向けのVRM / VRMA実装例がある。

対応：

- VRM 1.0
- Humanoid bones
- Expression
- LookAt
- Blink
- Mouth

将来的には `.vrma` アニメーションとのブレンドも可能。

---

# 6. MediaPipe Strategy

v0.1では

`@mediapipe/tasks-vision`

を基準にする。

現在のWeb版MediaPipe Tasksには、

- Face Landmarker
- Hand Landmarker
- Pose Landmarker
- Gesture Recognizer
- Holistic Landmarker

が用意され、ブラウザ内で動作する。公式WebサンプルでもFace 478点、Hand 21点、Pose、Holisticなどが提供されている。

### 原則

Avatar Layer自身はMediaPipeを直接呼ばない。

既存の

`Camera Input Layer`

からLandmarkを受け取る。

これによって同じ推論結果を

```text
Game Logic
Avatar
Effects
Debug HUD
Creator Mode
```

で共有する。

**同じ顔を二回認識しない。**

---

# 7. Kalidokit

v0.1の必須依存にはしない。

Kalidokitは現在も利用可能だが、npm最新版1.1.5は約5年前の公開で、旧MediaPipe系APIを前提にした部分もある。

したがって、

```text
MediaPipe
↓
Kalidokit
↓
VRM
```

を基盤にはしない。

代わりに、

```text
MediaPipe
↓
MotionNormalizer
↓
MotionFrame
↓
Driver
```

とする。

必要になった場合だけKalidokit互換Adapterを追加できる。

---

# 8. Motion Smoothing

生Landmarkを直接キャラクターへ渡さない。

```text
Raw
↓
Dead Zone
↓
Confidence Gate
↓
Smoothing
↓
MotionFrame
```

最低限、

- lerp
- angle lerp
- dead zone
- tracking confidence
- lost tracking recovery

を持つ。

例：

```ts
smoothed =
  previous +
  (target - previous) *
  smoothingFactor
```

激しく動くゲームでは追従優先。

Creator Modeでは滑らかさ優先。

Preset:

```text
GAME_FAST
GAME_NORMAL
CREATOR_SMOOTH
```

---

# 9. Tracking Lost

認識が消えた瞬間に人形を爆発させない。

```text
0–200ms
KEEP

200–700ms
EASE_TO_IDLE

700ms+
IDLE
```

再認識時もsnapせず、

```text
RECOVER
↓
BLEND
↓
LIVE
```

とする。

これはCamera Input Reliability Matrixとも共通化する。

---

# 10. Puppet Profile

キャラクターごとの変換ルール。

```ts
type PuppetProfile = {
  id: string

  head?: {
    yawScale?: number
    pitchScale?: number
    rollScale?: number
  }

  arms?: {
    scale?: number
  }

  face?: {
    mouth?: boolean
    blink?: boolean
  }

  style?: {
    exaggeration: number
    spring: number
  }
}
```

例：

### HUMAN

```text
exaggeration 1.0
spring       0.1
```

### TOY

```text
exaggeration 1.4
spring       0.4
```

### MONSTER

```text
exaggeration 2.0
spring       0.2
```

### BIRD

```text
arm → wing
lean → turn
mouth → chirp
```

ここが**camera-game-labらしい遊び場**になる。

---

# 11. Creator Mode Integration

既存：

```text
ORIGINAL
EFFECT
HIDE
```

へ追加。

```text
AVATAR
```

最終的には：

```text
ORIGINAL
EFFECT
AVATAR
HIDE
```

### AVATAR

元カメラ映像を隠し、

```text
Background
+
Avatar / Puppet
+
Game FX
```

だけ表示する。

顔出しなしで共有動画を作れる。

---

# 12. Puppet Camera Modes

### MIRROR

通常のインカメラ。

```text
← Player
← Avatar
```

鏡として自然な操作。

### STAGE

画面内キャラクターとして配置。

### FULL REPLACE

プレイヤー映像を完全にキャラクターへ置換。

### MINI

画面端に小さいAvatar。

実況キャラクターにも使える。

---

# 13. Performance Strategy

ターゲット基準：

**Android A401OP**

v0.1目標：

```text
Camera       30fps
Recognition  15–30fps
Render       30fps+
```

認識と描画を分離。

```text
MediaPipe
15–30 Hz

MotionFrame
30 Hz

Three.js
requestAnimationFrame
```

MotionFrame間は補間する。

モデルについてはv0.1で、

```text
Simple Puppet < 1MB
VRM推奨     < 10MB
```

を目安とする。

---

# 14. Adaptive Quality

端末能力に応じて：

### HIGH

```text
Face
Pose
Hands
Avatar
FX
```

### MEDIUM

```text
Face
Pose
Avatar
FX reduced
```

### LOW

```text
Pose
Simple Puppet
```

FPS低下を検知したら自動降格できる設計にする。

---

# 15. First Playable

最初の検証はVRMから始めない。

## CAMERA PUPPET TEST

画面：

```text
┌─────────────────────┐
│                     │
│       ◉             │
│      ╱█╲            │
│       █             │
│      ╱ ╲            │
│                     │
│ MOVE YOUR BODY      │
└─────────────────────┘
```

丸と棒だけのキャラクター。

プレイヤーが

- 首を傾ける
- 腕を上げる
- 口を開ける
- 左右に動く

と人形が追従。

ここで

**入力 → MotionFrame → Puppet**

だけを検証する。

---

# 16. Second Playable

## LITTLE MONSTER

棒人間をかわいい怪獣へ交換。

操作：

```text
HEAD TILT
→ 首を傾げる

ARM UP
→ 腕を振る

MOUTH OPEN
→ ガオー

BODY LEAN
→ よちよち移動
```

この段階で

**「ただのモーションキャプチャより、キャラクター変換の方が面白い」**

か確認する。

---

# 17. Third Playable

## VRM TEST

VRMキャラクターをロード。

確認：

- 頭
- 上半身
- 左右腕
- Blink
- Mouth
- Tracking lost
- Android performance

ここまで通ればAvatar Modeとして共通機能へ昇格。

---

# 18. Folder Proposal

```text
src/avatar/
  AvatarLayer.ts

  motion/
    MotionFrame.ts
    MotionNormalizer.ts
    MotionSmoother.ts

  drivers/
    PuppetDriver.ts
    SimplePuppetDriver.ts
    MascotPuppetDriver.ts
    VRMPuppetDriver.ts

  profiles/
    human.ts
    toy.ts
    monster.ts
    bird.ts

  runtime/
    TrackingRecovery.ts
    AdaptiveQuality.ts

  debug/
    MotionDebugHUD.ts
```

---

# 19. Debug HUD

Camera Input Debug HUDと連携。

```text
AVATAR DEBUG

FPS        31
TRACK      FACE ✓
           POSE ✓
           LH   ✓
           RH   ✓

HEAD
YAW        +0.23
PITCH      -0.08
ROLL       +0.41

MOUTH      0.72
BLINK L    0.03
BLINK R    0.04

MOTION     ███████░░░
```

さらに

```text
RAW
NORMALIZED
SMOOTHED
```

を切替表示可能にする。

---

# 20. EXPへの応用

### BODY WINGS

```text
腕
↓
翼
```

非常に相性が良い。

### GUARDIAN SPIRIT

プレイヤー本人ではなく、

```text
Player motion
↓
Guardian
```

にできる。

### HUMAN FISH

```text
顔
↓
人面魚
```

ほぼ専用技術。

### HAND PUPPET / DANCE

身体に追従するかわいい人形。

### FINGER MAGIC

プレイヤーの身体を魔法使いAvatarに変更。

### ROCK PAPER BOOM!

勝者を巨大怪獣化するなど、結果演出だけAvatar Layerを使うこともできる。

---

# 21. v0.1 Scope

実装する：

- MotionFrame
- MotionNormalizer
- MotionSmoother
- TrackingRecovery
- PuppetDriver interface
- SimplePuppetDriver
- MascotPuppetDriver prototype
- VRMPuppetDriver prototype
- MotionDebugHUD
- Creator Mode AVATAR hook

実装しない：

- Live2D
- キャラクターエディタ
- VRMアップロード
- オンラインモデル共有
- フルボディIK
- 足・歩行IK
- 物理髪
- 高度な指IK
- Avatar Marketplace

---

# 22. Success Criteria

v0.1成功条件：

1. 同じMotionFrameでSimple PuppetとVRMの両方を動かせる。
2. 認識が一瞬消えてもキャラクターが暴れない。
3. Android実機で30fps近辺を維持できる。
4. Avatarを外しても既存EXPへ影響しない。
5. Puppet Profileだけ変更して別キャラクターを動かせる。
6. 既存EXP一つへ30分〜1時間程度で追加できる構造にする。
7. 顔映像を表示せずプレイ動画を成立させられる。

---

# 23. Core Principle

Avatar / Puppet Layerの目的は、

**「自分そっくりのキャラクターを動かす」**

ことではない。

目的は、

> **人間の身体を、ゲーム世界の何にでも変換できるようにすること。**

```text
YOU
 ↓
MOTION
 ↓
ANYTHING
```

これをcamera-game-labの共通能力にする。
