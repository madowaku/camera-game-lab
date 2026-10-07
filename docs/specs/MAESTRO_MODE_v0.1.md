# MAESTRO MODE 仕様書 v0.1

## 0. Positioning

**Camera Instrument Layer v0.1** 上で動く、インカメラ型の指揮者体験。

プレイヤーがカメラの前で両手を動かすと、画面内のオーケストラがその動きに反応して演奏する。

正確な指揮法を学ぶシミュレーターではない。

目標は、

> **手を振った瞬間、音楽が自分についてくる。**

という気持ちよさ。

---

# 1. Core Fantasy

プレイヤーはオーケストラの指揮者。

静かに手を上げれば弦楽器が鳴り始める。

大きく振れば音楽が盛り上がる。

左を向けば弦。

右を向けば金管。

両腕を大きく広げれば全員が参加する。

そして最後に腕を振り切る。

**JAAAAAN!!**

画面いっぱいのフィナーレ。

---

# 2. Main Concept

Camera Instrument Layerには2種類の操作体系を持たせる。

## PLAYER MODE

現実世界を直接演奏する。

```text
Finger
 ↓
Instrument Zone
 ↓
Sound
```

例：

- TOY PIANO
- TOY DRUM
- WORLD INSTRUMENT

---

## MAESTRO MODE

音楽全体を身体で操る。

```text
Body / Hands
 ↓
Gesture
 ↓
Music Parameter
 ↓
Orchestra
```

つまり、

**PLAYER = 音符を鳴らす**

**MAESTRO = 音楽を動かす**

---

# 3. Camera

## Front Camera

基本はインカメラ。

縦画面。

プレイヤーは胸から上が映ればプレイ可能。

全身を映す必要はない。

推奨距離：

約70〜120cm。

---

# 4. Screen Composition

```text
┌─────────────────────┐
│                     │
│   STRINGS   BRASS   │
│      🎻      🎺     │
│                     │
│        PLAYER       │
│          🙂         │
│        /    \       │
│                     │
│      ORCHESTRA      │
│ 🎻 🎷 🎺 🥁 🎻     │
│                     │
│     ♪ ♪ ♪ ♪        │
└─────────────────────┘
```

プレイヤー本人を中央。

周囲または下部にミニチュアのオーケストラ。

各パートは現在の演奏状態に応じて反応する。

---

# 5. Orchestra Sections

v0.1は3パート。

## STRINGS

弦楽器。

常に音楽のベースになる。

---

## BRASS

金管。

盛り上がり担当。

---

## PERCUSSION

打楽器。

リズムとフィナーレ担当。

---

将来：

- Woodwind
- Choir
- Piano
- Synth
- Guitar

などを追加可能。

---

# 6. Music Architecture

リアルタイム作曲はしない。

1曲を複数のStemに分ける。

```text
MASTER TRACK

├── STRINGS
├── BRASS
└── PERCUSSION
```

各Stemは同期した状態でループ再生。

プレイヤー操作によって、

- Volume
- Filter
- Accent
- Mute
- Intensity

などを変更する。

これにより常に音楽的に破綻しにくい。

---

# 7. Basic Gesture Set

v0.1ではジェスチャーを増やしすぎない。

## ① RAISE

片手を上げる。

### ACTION

オーケストラ開始。

```text
SILENCE
 ↓
STRINGS START
```

最初は弦から始まる。

---

# 8. INTENSITY

## 両手の開き具合

身体中心から両手までの距離を利用。

### CLOSE

```text
🤲
```

静かな演奏。

### OPEN

```text
\ 😃 /
```

大きな演奏。

内部値：

```text
intensity = 0.0 ～ 1.0
```

この値を、

- 音量
- フィルター
- エフェクト
- 演奏アニメーション

へ利用。

---

# 9. Section Control

## LEFT

左側へ大きく手を向ける。

### STRINGS

```text
👈
🎻🎻🎻
```

Stringsが前面へ。

---

## RIGHT

右側へ大きく手を向ける。

### BRASS

```text
👉
🎺🎺🎺
```

Brassが参加。

---

## DOWN

下方向へ振る。

### PERCUSSION

```text
👇
🥁
```

ドラムが入る。

---

# 10. ACCENT

素早く大きな手振りを検出。

```text
SWING
 ↓
ACCENT
```

その瞬間、

- Cymbal
- Orchestra Hit
- Bass Drum
- Flash

などを発生。

音楽上は次のBeat位置へQuantizeして発音してもよい。

これにより多少タイミングがズレても気持ちよく鳴る。

---

# 11. CUT

最重要ジェスチャー。

## 両手を急停止

一定速度以上で動いていた手が、

短時間でほぼ静止。

```text
MOVE MOVE MOVE

      ✋ 😐 ✋

STOP
```

### RESULT

全パート停止。

```text
♪♪♪♪♪

   ...

SILENCE
```

演出：

全奏者が一斉に止まる。

これだけでもかなり指揮者感が出る。

---

# 12. FINALE

ゲーム最大の気持ちいい瞬間。

条件：

- Intensityが高い
- 全パート参加
- 大きな両手ジェスチャー

状態から、

両手を強く下へ振る。

### RESULT

```text
JAAAAAN!!
```

- Orchestra Hit
- Cymbal
- Bass Drum
- Screen Shake
- Light Burst
- Confetti

そして、

# BRAVO!

---

# 13. Gesture Philosophy

実際のオーケストラ指揮法を厳密に再現しない。

優先順位：

1. 分かりやすい
2. 大きな動き
3. 認識しやすい
4. 動画映えする
5. 音楽的に気持ちいい

つまり、

**リアルな指揮ではなく、指揮者になった気分を再現する。**

---

# 14. Input Model

MediaPipe Pose / Hand Tracking。

必要情報：

```text
leftHand
rightHand
leftShoulder
rightShoulder
bodyCenter
```

そこから、

```text
handHeight
handSpread
handVelocity
handDirection
```

を算出する。

---

# 15. Normalized Inputs

ゲーム側ではカメラ座標を直接扱わない。

```ts
type MaestroInput = {
  intensity: number
  leftDirection: number
  rightDirection: number

  leftVelocity: number
  rightVelocity: number

  handsRaised: boolean
  handsStopped: boolean
}
```

---

# 16. Gesture Mapper

```text
Pose Tracking
 ↓
Normalized Maestro Input
 ↓
Gesture Mapper
 ↓
Music Events
```

イベント例：

```text
START
STRINGS
BRASS
PERCUSSION
ACCENT
CUT
FINALE
```

---

# 17. State Machine

```text
READY

 ↓ Raise

INTRO

 ↓

PLAY

 ├ Strings
 ├ Brass
 ├ Percussion
 ├ Accent
 └ Intensity

 ↓ Stop Gesture

CUT

 ↓ Raise

PLAY

 ↓ Finale Gesture

FINALE

 ↓

BRAVO
```

---

# 18. First-Time UX

説明画面を長く出さない。

最初は画面上に、

```text
手を上げてみよう
```

だけ表示。

成功すると、

Stringsが鳴り始める。

次に、

```text
もっと大きく！
```

プレイヤーが腕を広げる。

音楽が盛り上がる。

次に、

```text
止めて！
```

CUT。

この3ステップで操作を覚える。

---

# 19. Tutorial

所要時間：

約15〜20秒。

## STEP 1

手を上げる。

→ Strings Start

## STEP 2

両腕を広げる。

→ Crescendo

## STEP 3

急停止。

→ CUT

最後：

```text
READY, MAESTRO?
```

---

# 20. FREE MODE

最初のメインモード。

制限時間なし。

自由に、

- Strings
- Brass
- Percussion
- Intensity
- Accent
- Cut
- Finale

を操作。

スコアなし。

純粋な音楽玩具。

---

# 21. CHALLENGE MODE

v0.2候補。

画面から指示が出る。

例：

```text
STRINGS ONLY
```

```text
LOUDER!
```

```text
BRASS!
```

```text
CUT!
```

成功すると、

```text
PERFECT!
```

失敗しても音楽は止めない。

ゲームより演奏体験を優先する。

---

# 22. CHAOS ORCHESTRA

将来モード。

奏者が勝手な行動を始める。

例：

- Violinが暴走
- Trumpetが寝る
- Drummerが速くなる
- Tubaがソロを始める

プレイヤーが指揮して収拾する。

指揮者ゲームとして最もゲーム性を強くできるモード。

---

# 23. Visual Direction

演奏が静かな時：

- 小さな光
- 控えめな音符
- 落ち着いた演奏者

Intensity上昇：

- 光量増加
- パーティクル増加
- 奏者の動き増加
- Camera FX増加

最大：

```text
PLAYER

✨✨✨✨✨

🎻🎺🥁🎷🎻

FORTISSIMO
```

---

# 24. Orchestra Characters

リアルな人間オーケストラである必要はない。

Camera Game Labらしく、

- 小さなおもちゃ
- 動物
- 人形
- ロボット

などでも成立する。

むしろ小型キャラクターオーケストラの方が、

**プレイヤー本人 + 小さな世界**

という構図になりやすい。

---

# 25. Creator Mode

MAESTRO MODEはCreator Mode重点対象。

9:16縦動画。

構図：

```text
PLAYER

   ↓ 指揮

MINI ORCHESTRA

   ↓

BIG FINALE
```

録画ポイント候補：

- 最初のStart
- 最大Crescendo
- Perfect CUT
- Finale

---

# 26. AUTO DIRECTOR

Creator Mode v0.2との連携候補。

自動で、

### INTRO

プレイヤー中心。

### BUILD UP

少しズーム。

### FORTE

FX強化。

### CUT

一瞬静止。

### FINALE

最大演出。

という15秒動画を生成。

---

# 27. Audio Latency

MAESTRO MODEでは、

操作と音楽の同期感が最重要。

Gesture検出後、

視覚演出より先にAudio Parameterを変更。

```text
Gesture
 ↓
Audio
 ↓
Visual
```

Accentなどは必要に応じて、

次のBeatへQuantize。

---

# 28. Recognition Reliability

細かな指形状は使わない。

主に、

- 手位置
- 腕位置
- 手速度
- 両手距離

を利用。

Camera Input Reliability Matrix上でも比較的安定しやすい入力を優先。

---

# 29. Fallback

Pose Lost時：

演奏を即停止しない。

1〜2秒程度は現在状態を維持。

その後、

徐々に音量を下げる。

表示：

```text
🎼 戻ってきて、マエストロ！
```

再認識後：

即復帰。

---

# 30. Debug Mode

PC開発用。

Mouse / Keyboard対応。

```text
SPACE
Start

1
Strings

2
Brass

3
Percussion

↑
Intensity +

↓

Intensity -

X
Cut

F
Finale
```

---

# 31. Debug HUD

```text
POSE
FOUND

LEFT HAND
x 0.32
y 0.41

RIGHT HAND
x 0.71
y 0.38

SPREAD
0.72

INTENSITY
0.81

GESTURE
BRASS

STATE
PLAY
```

---

# 32. v0.1 Music

最初は1曲だけでよい。

長さ：

約30〜45秒。

Loop可能。

構成：

- Strings
- Brass
- Percussion

テンポ：

100〜130 BPM程度。

明るく、分かりやすく、フィナーレが気持ちいい曲。

---

# 33. MVP

v0.1 Playable Prototypeでは以下だけ実装。

### Camera

Front Camera

### Tracking

Pose / Hands

### Orchestra

3 Sections

### Gestures

- Raise → Start
- Spread → Intensity
- Left → Strings
- Right → Brass
- Down → Percussion
- Stop → Cut
- Big Down → Finale

### Music

1曲 / 3 Stems

### Modes

Free Modeのみ

---

# 34. Success Criteria

A401OP実機で確認。

## Recognition

腕を大きく動かせばほぼ確実に反応。

## Latency

身体と音楽がつながって感じる。

## Discoverability

説明なしでも腕を振って試したくなる。

## Fun

30秒以上、自発的に指揮を続けたくなる。

## Finale

もう一度フィナーレをやりたくなる。

## Shareability

15秒動画を見ただけで、

「何これ、指揮してる！」

と理解できる。

---

# 35. Development Order

### Phase 1

Keyboard Debug Orchestra

まずカメラなしで3Stem制御。

### Phase 2

Pose Input

手位置とSpread。

### Phase 3

Start / Intensity

基本体験完成。

### Phase 4

Section Control

Strings / Brass / Percussion。

### Phase 5

CUT

最重要演出。

### Phase 6

FINALE

最大のご褒美。

### Phase 7

Creator Mode連携。

---

# 36. Expansion

MAESTRO v0.2

Challenge Mode

↓

MAESTRO v0.3

Chaos Orchestra

↓

MAESTRO v0.4

Multiple Songs

↓

MAESTRO v0.5

Two Player Orchestra

↓

MAESTRO v0.6

Procedural Music

---

# 37. Long-Term Vision

Camera Instrument Layerは、

**世界を触って演奏する**

WORLD INSTRUMENT

と、

**身体で音楽そのものを操る**

MAESTRO MODE

の二本柱にする。

```text
CAMERA INSTRUMENT

        ┌ WORLD INSTRUMENT
        │
CAMERA ─┤
        │
        └ MAESTRO
```

ひとつは、

**世界が楽器になる。**

もうひとつは、

**自分が指揮棒になる。**