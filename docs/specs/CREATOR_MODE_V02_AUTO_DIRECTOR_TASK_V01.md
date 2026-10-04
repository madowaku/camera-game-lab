# CREATOR MODE v0.2 / AUTO DIRECTOR
## Implementation Task v0.1

### 0. PURPOSE

camera-game-lab のプレイを、

**遊ぶ → 面白い瞬間が起きる → 自動で切り抜く → 15秒動画になる → 共有できる**

ところまで一続きにする。

ユーザーに動画編集をさせない。

Creator Mode の役割は「録画機能」ではなく、

**ゲーム内容を理解している自動ディレクター**

になること。

---

# 1. TARGET

基準実装:

**EXP-044 SOFT SERVE**

v0.2ではまずSOFT SERVEだけ完全対応させる。

その後、

- NOTE EATER
- FINGER GUN
- GUARDIAN SPIRIT
- HAND DANCE
- BODY WINGS

などへ横展開できる共通APIにする。

---

# 2. CREATOR MODE ENTRY

ゲーム開始前に、

## PLAY
通常プレイ。

## CREATOR
共有動画生成を前提にしたプレイ。

CREATORを選択した場合のみAuto Directorを起動する。

---

# 3. FACE MODE

Creator Mode開始時に選択。

### ORIGINAL
カメラ映像をそのまま使用。

### EFFECT
ゲーム共通またはゲーム固有のフェイスエフェクトを使用。

### HIDE
顔の特定につながる映像を隠しながら、身体の動きは残す。

既存仕様を維持する。

Auto DirectorはFace Modeに依存せず動作すること。

---

# 4. VIDEO FORMAT

基本フォーマット:

- 9:16
- 最大15秒
- 縦動画
- カメラ映像
- ゲーム描画
- HUD
- 演出
- ブランド表示

を1つの共有映像として扱う。

ターゲット表示サイズ:

1080 × 1920相当を理想とする。

端末負荷が高い場合は内部解像度を落としてよい。

---

# 5. EVENT SYSTEM

各ゲームはAuto Directorへイベントを通知する。

共通イベント型:

```ts
type DirectorEvent =
  | "GAME_START"
  | "FIRST_ACTION"
  | "FIRST_SUCCESS"
  | "NEAR_MISS"
  | "FAIL"
  | "COMBO"
  | "BIG_SUCCESS"
  | "HERO"
  | "REACTION_WINDOW"
  | "GAME_END";
```

イベントは最低限、

```ts
interface DirectorEventPayload {
  type: DirectorEvent;
  timestamp: number;
  score?: number;
  priority?: number;
  metadata?: Record<string, unknown>;
}
```

を持つ。

---

# 6. GAME-SPECIFIC EVENT

SOFT SERVEでは以下を実装する。

### GAME_START
プレイ開始。

### FIRST_ACTION
コーンを認識して操作開始。

### FIRST_SUCCESS
最初のクリーム積層成功。

### NEAR_MISS
クリームが大きく傾いたが復帰可能。

### FAIL
クリーム落下・崩壊。

### COMBO
一定量連続して綺麗に積層。

### BIG_SUCCESS
高評価のソフトクリーム完成。

### HERO
食べる判定成功。

SOFT SERVEにおける最重要イベントは

# HERO = EAT

とする。

---

# 7. RING BUFFER

Creator Mode中は直近映像を常時保持する。

最低:

**直近8秒**

推奨:

**直近12秒**

HERO発生時、

```text
HERO - 5 sec
↓
HERO
↓
HERO + 3 sec
```

程度を候補クリップとして確保する。

目的は、

**成功そのものだけではなく、その直前と本人のリアクションまで残すこと。**

---

# 8. HERO CAPTURE

HERO発生時、

Auto Directorは即座に

```ts
markHero(timestamp)
```

を記録する。

HERO後も録画を3秒程度継続。

これにより、

```text
準備
↓
成功
↓
本人の反応
```

を一続きで保持する。

---

# 9. AUTO DIRECTOR

ゲーム終了時にイベントログを解析する。

理想的な15秒構成:

```text
0.0 - 1.0
HOOK

1.0 - 3.0
UNDERSTAND

3.0 - 8.0
PLAY

8.0 - 12.0
HERO

12.0 - 13.5
REACTION

13.5 - 15.0
END CARD
```

ただし厳密な固定編集にはしない。

イベント位置によって柔軟に伸縮する。

---

# 10. CLIP PRIORITY

候補イベントには重要度を持たせる。

基本:

```text
HERO            100
BIG_SUCCESS      80
REACTION_WINDOW  75
NEAR_MISS        60
COMBO            50
FIRST_SUCCESS    40
FIRST_ACTION     20
GAME_START       10
```

Auto Directorは、

**HEROを必ず含める。**

HEROが存在しない場合のみ、

BIG_SUCCESS → COMBO → NEAR_MISS

の順で代替する。

---

# 11. HOOK SELECTION

動画冒頭にタイトル画面を置かない。

候補:

1. 一番視覚変化の大きい瞬間
2. NEAR_MISS
3. HERO直前
4. FIRST_SUCCESS

SOFT SERVEの場合、

理想HOOKは

**クリームがすでに落ちてきている状態**

から始める。

禁止:

```text
CAMERA GAME LAB
EXP-044
SOFT SERVE
START
```

から始まる動画。

---

# 12. GAMEPLAY TEXT

15秒中に表示する説明文字は最小限。

SOFT SERVE:

```text
TWIST!
```

または

```text
巻いて！
```

程度。

文章によるルール説明は入れない。

---

# 13. HERO MOMENT EFFECT

HEROイベント発生時のみ、通常より強い撮れ高演出を許可する。

SOFT SERVE:

- 軽い画面ズーム
- PERFECT / DELICIOUS等の短い表示
- 粒子
- SE
- ごく短いスローモーション

過剰な演出で顔や操作を隠さない。

---

# 14. REACTION WINDOW

HERO直後、

**1.5〜3秒**

はゲームUIを少し静かにする。

目的:

プレイヤーの

- 笑う
- 驚く
- 喜ぶ
- 失敗して崩れる

などの反応を映像に残す。

Auto Directorはこの区間を原則カットしない。

---

# 15. END CARD

最後の約1.5秒。

SOFT SERVE:

```text
SOFT SERVE 🍦

CAMERA GAME #044

PLAY
```

ブランド表示は簡潔にする。

使用可能候補:

```text
CAMERA GAME
```

```text
100 CAMERA GAMES
```

または

```text
CAMERA GAME #044
```

広告コピーを大量に入れない。

---

# 16. BRAND OVERLAY

プレイ中、

画面上部の安全領域に小さく

```text
◉ CAMERA GAME #044
```

を表示可能にする。

TikTok / Reels / Shorts側UIと重ならない位置を使用する。

ブランドロゴをゲーム画面より目立たせない。

---

# 17. OUTPUT TYPES

Creator Mode終了後、

以下を生成可能にする。

## 15 SEC

標準版。

HOOK → PLAY → HERO → REACTION → END CARD。

最重要。

---

## 7 SEC

HERO中心。

```text
Setup
↓
HERO
↓
Reaction
```

共有しやすい短縮版。

---

## LOOP

約2〜4秒。

視覚的にループ可能な箇所がある場合のみ。

v0.2では必須ではない。

内部設計のみ対応できる構造にしておく。

---

# 18. RESULT SCREEN

Creator Mode終了後:

```text
YOUR CLIP IS READY
```

または日本語:

```text
いい瞬間、撮れました
```

表示。

以下を設置:

- Replay
- 15 SEC
- 7 SEC
- Share
- Retry

Face Modeも表示する。

---

# 19. REPLAY

生成動画は共有前に必ず確認可能にする。

自動再生。

ユーザーが編集作業をする必要はない。

v0.2では、

- トリミング
- テロップ編集
- BGM編集

などの動画編集UIは実装しない。

---

# 20. FALLBACK

HEROが発生しなかった場合でもクリップを生成する。

例:

SOFT SERVEで途中失敗。

```text
HOOK
↓
クリームを巻く
↓
大崩壊
↓
本人リアクション
↓
END CARD
```

失敗も撮れ高として扱う。

「成功動画しか生成できない」設計にしない。

---

# 21. DIRECTOR PROFILE

ゲームごとに設定ファイルを持つ。

例:

```ts
const softServeDirectorProfile = {
  gameId: "soft-serve",
  gameNumber: 44,

  heroEvent: "HERO",

  hookCandidates: [
    "NEAR_MISS",
    "BIG_SUCCESS",
    "FIRST_SUCCESS"
  ],

  eventPriority: {
    HERO: 100,
    BIG_SUCCESS: 80,
    NEAR_MISS: 60,
    COMBO: 50
  },

  reactionDuration: 2500,

  endCardDuration: 1500
};
```

ゲーム本体に動画編集ロジックを書かない。

---

# 22. ARCHITECTURE

推奨構成:

```text
src/
  creator/
    CreatorMode.ts
    DirectorEventBus.ts
    DirectorRecorder.ts
    AutoDirector.ts
    ClipComposer.ts
    CreatorResult.ts

    profiles/
      softServeDirector.ts
```

既存platform構成と整合する形へ調整してよい。

---

# 23. RESPONSIBILITY

### GAME

「何が起きたか」を通知する。

### RECORDER

映像を保持する。

### AUTO DIRECTOR

「どこが面白いか」を選ぶ。

### CLIP COMPOSER

15秒へまとめる。

### CREATOR RESULT

再生・共有を担当する。

責務を混ぜない。

---

# 24. PERFORMANCE

Creator Modeによってゲーム認識精度を悪化させてはいけない。

優先順位:

1. 入力認識
2. ゲームFPS
3. 録画
4. 動画品質

録画によってMediaPipe等の推論FPSが大きく落ちる場合、

録画解像度・fpsを下げる。

---

# 25. MOBILE FIRST

最低検証幅:

- 360 × 800
- 720 × 1280

Android Chromeを主要ターゲットとする。

可能ならiOS Safariも壊れない構造にする。

---

# 26. PRIVACY

Creator Mode開始前に、

「カメラ映像をクリップ生成に使用する」

ことが分かるUIを表示する。

動画を外部送信しない設計なら、その旨も明示できる。

Face Mode変更はいつでも可能にする。

---

# 27. METRICS

ローカル計測可能なら以下を残す。

```text
creator_mode_started
creator_mode_completed
hero_detected
clip_generated
clip_replayed
share_pressed
retry_pressed
face_mode_selected
```

個人情報や顔特徴量を保存しない。

---

# 28. ACCEPTANCE TEST

SOFT SERVEで以下を満たすこと。

### Gate A
Creator Modeでゲーム開始可能。

### Gate B
ゲームイベントがDirectorへ届く。

### Gate C
HERO発生時刻を正しく取得。

### Gate D
HERO前後の映像を保持。

### Gate E
プレイ終了後、15秒以内のクリップを自動生成。

### Gate F
HEROとリアクションが両方映っている。

### Gate G
15 SEC版を再生可能。

### Gate H
7 SEC版を再生可能。

### Gate I
通常PLAYには録画負荷を与えない。

### Gate J
360×800でUI破綻なし。

---

# 29. HUMAN PLAYTEST

最低5プレイ。

観察項目:

1. Creator Modeの意味が分かるか
2. 録画開始が自然か
3. ゲームの操作感が悪化しないか
4. 生成動画だけでルールが伝わるか
5. 最初の1秒に見る理由があるか
6. HEROが最も気持ちいい瞬間になっているか
7. 本人のリアクションが残っているか
8. 15秒が長く感じないか
9. 投稿したくなるか
10. 再挑戦したくなるか

特に

> 「これ、そのまま誰かに送りたい？」

を確認する。

---

# 30. DEFINITION OF DONE

v0.2完成条件:

**SOFT SERVEをCreator Modeで1回遊ぶだけで、手作業編集なしに「他人が見てもゲーム内容が分かる15秒クリップ」が生成される。**

これを最重要条件とする。

単に録画ファイルが生成されるだけでは完成扱いにしない。

---

# 31. NEXT

v0.2成功後、

## v0.3

Director Profileを他ゲームへ横展開。

目標:

**1ゲーム30分以内でAuto Director対応可能**

にする。

最終的には、

```text
GAME
↓
EVENT
↓
AUTO DIRECTOR
↓
15 SEC
↓
SHARE
```

をcamera-game-lab全体の共通規格にする。

---

# CORE PRINCIPLE

Auto Directorが探すのは、

**一番上手なプレイではない。**

探すのは、

# 一番「人に見せたくなる瞬間」。

camera-game-labではゲーム画面だけでなく、

**プレイヤー自身もゲーム映像の一部である。**