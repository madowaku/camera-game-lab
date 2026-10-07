# EXP-043 THE CAMERA IS IT
## Stage Pack v0.2 Implementation Task

### 0. 目的

既存 Stage 001〜005 の

> 「カメラに映っているものだけが存在する」

という基本ルールを拡張し、プレイヤーがキャラクターを直接操作しないまま、

- 見続ける
- 一度見て覚える
- 見すぎない
- 複数を同時に見る
- 撮影して固定する

という「カメラ操作そのもの」をゲームの文法へ発展させる。

v0.2では全20面を完成させる前に、コアとなる5種類の Camera Rule を実装し、Stage 006〜010 を遊べる状態にする。

---

# 1. Core Philosophy

プレイヤーが操作するものは最後まで基本的に

**カメラだけ**

とする。

キャラクター移動は自動。

ジャンプボタン、攻撃ボタン、スティック移動などは追加しない。

ゲーム中の問いは常に、

> 「何を見るか」
> 「どれくらい見るか」
> 「いつ目を離すか」
> 「何を一緒に映すか」

で解けること。

---

# 2. Camera Rule System

各オブジェクトに `CameraRule` を設定できる共通システムを作る。

## Rule A
### VISIBLE

既存仕様。

画面内に入っている間だけ実体化。

```text
camera sees object
    ↓
solid = true
visible = true
```

画面外になると消滅。

---

## Rule B
### FOCUS_HOLD

一定時間連続で見続けると実体化。

初期値：

```text
holdMs = 500
```

進捗を視覚化する。

例：

```text
0ms      outline
200ms    faint glow
400ms    strong glow
500ms    SNAP → solid
```

画面外へ出ると進捗リセット。

---

## Rule C
### AFTERIMAGE

一度視認した足場は、画面外になっても一定時間残る。

初期値：

```text
memoryMs = 1500
```

状態：

```text
VISIBLE
↓
MEMORY
↓
FADE
↓
GONE
```

残り時間はアルファ値だけで自然に伝える。

数字タイマーは表示しない。

---

## Rule D
### OVEREXPOSE

見続けるほど不安定になる足場。

初期値：

```text
maxVisibleMs = 1200
recoveryMs = 700
```

画面内に長く入れ続けると、

```text
solid
↓
warning
↓
flicker
↓
gone
```

カメラを外すと回復。

「見るほど安全」という既存認識を反転させる。

---

## Rule E
### LINKED

指定グループの複数オブジェクトが同時に画面内にある場合だけ実体化。

例：

```text
linkedGroup = A
requiredVisible = 2
```

A1だけ見える

→ OFF

A2だけ見える

→ OFF

A1 + A2

→ ON

---

# 3. 将来用 Rule

v0.2ではデータ構造だけ用意してもよい。

```text
CENTER_ONLY
SNAPSHOT
MOVE_WHEN_VISIBLE
MOVE_WHEN_HIDDEN
NO_PHOTOBOMB
PANORAMA
```

CameraRuleを後から追加しても既存ステージを壊さない構造にする。

---

# 4. Stage 006〜010

## Stage 006
# FOCUS

### 学習テーマ

「見る」だけでは足りない。

**見続ける。**

### 構成

スタート地点から短い自動歩行。

途中に1つだけ半透明の足場。

最初は乗れない。

その足場を約0.5秒画面内に置くと、

```text
outline
→ glow
→ solid
```

になる。

### 初回演出

画面中央に短く：

**KEEP LOOKING**

日本語：

**見つづけろ**

0.8秒程度で自然消滅。

### 成功体験

足場が実体化した瞬間に

- 小さな光
- 軽いSE
- ほんの少しだけ画面振動

を入れる。

---

# Stage 007
# AFTERIMAGE

### 学習テーマ

「見たもの」は少しだけ記憶される。

### 構成

足場Aを見る。

その後、先を見るためカメラを動かす必要がある。

Aは画面外になるが約1.5秒残る。

その間にキャラクターが渡る。

### 視覚表現

画面外になった足場：

```text
100%
↓
80%
↓
50%
↓
20%
↓
0%
```

輪郭が少し残る。

### 初回テキスト

**IT REMEMBERS**

日本語：

**少しだけ残る**

---

# Stage 008
# DON'T STARE

### 学習テーマ

見ることが正解とは限らない。

### 構成

進行方向の足場をカメラに収める。

しかし約1.2秒以上見続けると崩れる。

プレイヤーは、

```text
見る
↓
足場出現
↓
キャラが乗る
↓
カメラを外す
↓
足場回復
```

を覚える。

### 足場演出

見続けると、

```text
normal
→ bright
→ white
→ flicker
→ disappear
```

「壊れる」より、

**露光しすぎて消える**

表現にする。

### 初回テキスト

**DON'T STARE**

日本語：

**見すぎるな**

---

# Stage 009
# TWO AT ONCE

### 学習テーマ

画角そのものがパズルになる。

### 使用Rule

LINKED

### 構成

離れた場所にAとB。

片方だけ見ても足場は出ない。

カメラの位置と角度を調整して、

**AとBを同時に画面へ収める**

と中央の橋が実体化。

### 重要

正解画角は一点ではなく、ある程度幅を持たせる。

精密なカメラ操作を要求しすぎない。

### 初回テキスト

**SEE BOTH**

日本語：

**ふたつ見ろ**

---

# Stage 010
# LOOK / AWAY

### 第2章ボス問題

新規ルール追加なし。

006〜009の組み合わせ。

### 使用ルール

```text
FOCUS_HOLD
AFTERIMAGE
OVEREXPOSE
LINKED
```

### 想定シーケンス

1. 足場Aを見続けて実体化
2. Aを記憶状態にする
3. カメラを右へ
4. BとCを同時に画面へ
5. 橋が出現
6. Dは見すぎると消える
7. 一度視線を外す
8. 再びDを見る
9. GOAL

直接的な説明文は出さない。

001〜009で覚えたことだけで突破できる構成にする。

クリア時：

**YOU CONTROL THE WORLD BY LOOKING**

日本語：

**見ることで 世界は変わる**

---

# 5. Camera Feedback

このゲームではUIよりも、

**世界そのものの変化でルールを説明する。**

基本表現を統一する。

### Activated

```text
small glow
scale 0.97 → 1.00
short click/chime
```

### Losing Stability

```text
brightness up
micro flicker
edge noise
```

### Memory

```text
opacity down
soft trail
```

### Linked

2地点間にごく薄いラインを一瞬だけ表示。

条件成立：

```text
A ○────○ B
      ↓
   bridge ON
```

恒常的なHUDラインにはしない。

---

# 6. Fail Design

このゲームで重要なのは、

**失敗理由が一瞬で理解できること。**

落下した場合でも即座にブラックアウトしない。

0.4〜0.6秒だけ原因となった足場を表示する。

例：

OVEREXPOSEで落下：

```text
足場が白くなる
↓
消える
↓
キャラ落下
↓
0.5秒 freeze
↓
restart
```

リトライは高速に。

目標：

```text
Fail → Restart
1.5秒以内
```

---

# 7. Difficulty Policy

カメラ入力には認識誤差があるため、

パズル難度と入力難度を混ぜない。

### 許容範囲

画面境界判定：

```text
約5〜8% margin
```

LINKED：

完全表示ではなく、

```text
anchor pointがviewport内
```

なら有効。

FOCUS：

多少のカメラ揺れでは保持時間をリセットしない。

例：

```text
graceMs = 180
```

---

# 8. Debug Mode

開発用にCamera Debug Overlayを追加。

表示項目：

```text
FPS
camera state

object id
rule
visible
focusMs
memoryMs
overexposeMs
linkedGroup
solid
```

例：

```text
PLATFORM_06_A

RULE: FOCUS_HOLD
VISIBLE: YES
FOCUS: 384 / 500 ms
SOLID: NO
```

本番ビルドではOFF。

---

# 9. Stage Data

ステージごとのロジックをハードコードしない。

例：

```json
{
  "id": "stage006",
  "objects": [
    {
      "id": "platform_a",
      "rule": "FOCUS_HOLD",
      "holdMs": 500
    }
  ]
}
```

Stage 010：

```json
{
  "id": "stage010",
  "objects": [
    {
      "id": "a",
      "rule": "FOCUS_HOLD"
    },
    {
      "id": "b",
      "rule": "AFTERIMAGE"
    },
    {
      "id": "c",
      "rule": "LINKED",
      "group": "bridge1"
    },
    {
      "id": "d",
      "rule": "OVEREXPOSE"
    }
  ]
}
```

---

# 10. Test Requirements

## Unit Test

最低限：

```text
VISIBLE enters viewport
VISIBLE exits viewport

FOCUS completes
FOCUS resets
FOCUS grace works

AFTERIMAGE starts
AFTERIMAGE expires

OVEREXPOSE accumulates
OVEREXPOSE breaks
OVEREXPOSE recovers

LINKED one visible
LINKED all visible
LINKED loses one member
```

---

# 11. Human Playtest Gate

Stage 006〜010を初見プレイヤーに説明なしでプレイ。

各Stageについて記録：

```text
理解までの時間
死亡回数
Camera Rule理解
誤認識による失敗
パズルによる失敗
クリア時間
```

目標：

### 006

10秒以内にFOCUSを理解。

### 007

2回以内の失敗でAFTERIMAGEを理解。

### 008

3回以内の失敗で「見すぎ」が原因と理解。

### 009

説明なしで「2つを同時に映す」発想に到達。

### 010

新しい説明なしでクリア可能。

---

# 12. v0.2 Completion Gate

以下を満たしたらStage Pack v0.2完成。

- Stage 001〜010を連続プレイ可能
- CameraRule共通システム完成
- FOCUS_HOLD実装
- AFTERIMAGE実装
- OVEREXPOSE実装
- LINKED実装
- Debug Overlay実装
- Fail → Retry 1.5秒以内
- PCブラウザ動作
- 360×800確認
- 720×1280確認
- Android Chromeカメラ確認
- 自動テストPASS
- Stage 006〜010 Human Playtest記録作成

---

# 13. 次フェーズ

v0.2完了後、

## Stage 011〜015
### COMPOSITION

画角・構図を操る章。

```text
CENTER_ONLY
PHOTOBOMB
WIDE SHOT
FOLLOW SHOT
```

## Stage 016〜020
### PHOTOGRAPHY

「見る」から「撮る」へ。

```text
SNAPSHOT
THREE SHOTS
SHY PLATFORM
PANORAMA
FINAL CUT
```

Stage 016で、

> 見えているものだけ存在する

から、

> **撮ったものは世界に残る**

へゲームルールを反転させる。

これをTHE CAMERA IS ITの第2のAHAとする。