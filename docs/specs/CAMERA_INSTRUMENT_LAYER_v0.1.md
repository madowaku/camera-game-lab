# Camera Instrument Layer v0.1

## 1. Purpose

カメラ映像上の任意の位置を「演奏可能な領域」に変換する共通レイヤー。

現実の机、コップ、ぬいぐるみ、果物、箱などに仮想的な音を割り当て、指で触れる・叩くことで音と演出を発生させる。

ゲームごとに個別の楽器判定を作るのではなく、

**Camera → Tracking → Instrument Zones → Trigger → Sound / FX**

を共通化する。

---

# 2. v0.1の原則

### やる

- アウトカメラ
- 指先追跡
- 画面上への音スポット配置
- 最大5スポット
- タップ / 接触による発音
- ペンタトニック音階
- ドラム音
- 視覚エフェクト
- カメラなしDebug Mode
- スマホ縦画面対応
- 他EXPから利用可能なAPI

### やらない

- 物体認識
- AR平面検出
- 3D空間位置推定
- 本物の物体への自動音割り当て
- MIDI
- DAW機能
- 高度な録音編集
- 指ごとの複雑なジェスチャー

v0.1では、

> 「そこを叩いた」

が高精度で気持ちよく成立することを最優先する。

---

# 3. Core Experience

## SETUP

カメラを机などへ向ける。

画面下：

`＋ ADD SOUND`

を押す。

現実の好きな物を画面上でタップ。

その位置に円形のInstrument Zoneが現れる。

例：

🍌  
`C`

🥤  
`E`

🧸  
`G`

最大5個。

---

# 4. PLAY

MediaPipe Hand Landmarkerで指先を取得。

基本入力：

`index_finger_tip`

指先がInstrument Zoneへ侵入すると候補状態。

さらに、

### DOWN判定

直前フレームより指先が下方向へ一定速度以上移動

または

Zone中心方向へ一定量侵入

した瞬間に発音。

単純な「中に入っただけ」では鳴らさない。

これによって、

- 指を置いたまま連打
- 境界でガタガタ発音
- カメラ揺れによる誤爆

を抑える。

---

# 5. Trigger State Machine

各Zone：

`IDLE`

↓

指接近

`HOVER`

↓

打鍵条件成立

`HIT`

↓

発音

`COOLDOWN`

↓

指がZoneから一定距離離れる

`IDLE`

---

## 推奨初期値

Zone半径：

画面短辺の約7〜10%

Cooldown：

120ms

Retrigger条件：

Zone外へ半径の約20%以上離れる

入力平滑化：

3〜5フレーム程度

数値は実機テストで調整する。

---

# 6. Sound Architecture

共通Sound Bankを用意。

## MELODY

Pentatonic:

- C
- D
- E
- G
- A

どれを叩いても極端に濁りにくい。

---

## DRUM

- Kick
- Snare
- HiHat
- Tom
- Clap

---

## TOY

- Bell
- Pop
- Boing
- Bubble
- Sparkle

---

## ANIMAL

将来プリセット用。

- Cat
- Dog
- Chick
- Frog
- Cow

---

# 7. Instrument Zone

```ts
type InstrumentZone = {
  id: string
  x: number
  y: number
  radius: number

  soundId: string
  label?: string

  triggerMode: "tap" | "enter"

  cooldownMs: number

  visualStyle: string
}
```

位置はpixelではなく0〜1正規化座標で保持。

例：

```ts
x: 0.32
y: 0.67
```

これにより、

- 360×800
- 720×1280
- PC

で扱いやすくする。

---

# 8. Public API

ゲーム側からはなるべく簡単に使えるようにする。

```ts
const instrument =
  createCameraInstrument({
    maxZones: 5,
    soundBank: "pentatonic"
  })
```

追加：

```ts
instrument.addZone({
  x: 0.4,
  y: 0.6,
  soundId: "C4"
})
```

イベント：

```ts
instrument.on("hit", event => {
  console.log(event.zoneId)
})
```

ゲーム側は認識処理を知らなくてよい。

---

# 9. Architecture

```text
Camera
  ↓
Hand Tracker
  ↓
Finger Position
  ↓
Input Smoothing
  ↓
Instrument Hit Detector
  ↓
Zone State Machine
  ↓
────────────────
↓              ↓
Audio          Visual FX
↓              ↓
Game Event     Creator Mode
```

既存Camera Input系とInstrument Layerを分離する。

---

# 10. Visual Feedback

発音した瞬間が重要。

最低限：

### HIT

Zoneが

`1.0 → 1.25 → 1.0`

と膨らむ。

同時に、

- 波紋
- 小さな音符
- パーティクル

を発生。

---

## 強いHIT

指速度が速い場合：

- FX大
- 音量少し大
- Zone変形大

弱いタッチ：

- 小さな演出

将来的なVelocity入力につながる。

---

# 11. Guidance

認識技術をユーザーに意識させない。

悪い例：

「人差し指の先端を認識範囲に入れてください」

良い例：

**「トントンしてみよう！」**

Zone上に指アイコンを一度だけ表示。

成功した瞬間、

`♪`

が飛ぶ。

説明するより成功体験で教える。

---

# 12. Debug Mode

カメラなしでPC開発できるようにする。

Mouse:

クリック = HIT

Touch:

タップ = HIT

Keyboard:

1〜5 = Zone 1〜5

これで

- UI
- Audio
- FX
- ゲームロジック

の大半をカメラなしで開発可能。

---

# 13. Camera Input Debug HUD連携

Debug時のみ表示：

```text
HAND       FOUND

INDEX
x 0.451
y 0.672

VELOCITY
0.083

ZONE
#03

STATE
HOVER

TRIGGER
READY
```

さらにZone境界を表示。

実機で

「認識していない」

のか

「認識しているが判定していない」

のか即座に分かるようにする。

---

# 14. Reliability

優先順位：

1. 鳴らしたい時に鳴る
2. 勝手に鳴らない
3. レスポンスが速い
4. 音程が正しい
5. 見た目

Camera Instrumentでは、

**音ズレ = 操作遅延として直接感じる**

ため、映像演出より音を先に発生させる。

Hit確定：

即Audio

↓

その後FX

---

# 15. Graceful Fallback

手認識が途切れてもゲーム停止にしない。

表示：

`👆 手を映してみよう`

一定時間Lost：

Zoneはそのまま保持。

再認識：

即復帰。

---

# 16. Preset System

```ts
type InstrumentPreset =
  | "toy-piano"
  | "toy-drum"
  | "object-band"
  | "toy-sounds"
```

## toy-piano

5 zones

C / D / E / G / A

---

## toy-drum

Kick / Snare / Hat / Tom / Clap

---

## object-band

ユーザーが自由配置。

---

# 17. First Demo

## Camera Instrument Playground

ゲームに埋め込む前に共通デモを1本作る。

### FLOW

`START`

↓

アウトカメラ起動

↓

`好きな物を3つ選ぼう`

↓

画面を3回タップ

↓

自動的に

C / E / G

を割り当て

↓

`READY!`

↓

自由演奏

所要時間：

10秒以内で演奏開始。

---

# 18. Success Criteria

A401OP実機で：

### Setup

初見で30秒以内に3Zone設置可能

### Input

意図したタップの90%以上が発音

### False Trigger

手を移動させただけでは極力発音しない

### Latency

「触った瞬間に鳴った」と感じる

### Recovery

Hand Lost → 再認識で操作継続可能

### Fun

説明なしでも

「別の物にも音を置いてみたい」

と思える。

---

# 19. v0.1 Test Matrix

最低限：

- 1 Zone
- 3 Zones
- 5 Zones
- Zone重複
- 画面端Zone
- 高速連打
- ゆっくり接触
- 指を置きっぱなし
- Zone間高速移動
- Hand Lost
- Hand Recover
- 左手
- 右手
- 暗所
- カメラなし
- Touch fallback

---

# 20. Repository Structure

```text
src/
  camera/
    instrument/
      CameraInstrument.ts
      InstrumentZone.ts
      HitDetector.ts
      InstrumentPresets.ts
      InstrumentDebugHUD.ts

  audio/
    instrument/
      InstrumentAudio.ts
      banks/
        pentatonic.ts
        drums.ts
        toy.ts

  visual/
    instrument/
      InstrumentFX.ts

  playground/
    camera-instrument/
```

既存のCamera Trackerそのものはコピーしない。

Camera Instrument Layerは

**座標を受け取って楽器入力へ変換する層**

として分離する。

---

# 21. Expansion Path

v0.1  
Finger × Zone

↓

v0.2  
Velocity / Multi Finger

↓

v0.3  
Looper

↓

v0.4  
Two Player Jam

↓

v0.5  
Object Recognition

↓

v0.6  
Automatic Instrument Discovery

最終的には：

## WORLD INSTRUMENT

**世界のどこを触っても音楽になる。**

Camera Instrument Layerはそのための共通基盤とする。

---

# 22. First Applications

この順で試す。

### 1. Camera Instrument Playground

技術検証。

### 2. TOY PIANO

もっとも理解しやすい。

### 3. EXP-047 TOY DRUM

叩く入力との相性を検証。

### 4. EXP-062 WORLD INSTRUMENT

好きな現実物を楽器化。

この4本で、

**「技術デモ → 分かりやすい玩具 → 身体的な楽器 → 新しい遊び」**

まで検証できる。