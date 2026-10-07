# EXP-058 FINGER GUN: SHOWDOWN
## 仕様書 v0.1

### 0. 一言コンセプト

**指で狙い、口で「BAN!」する30秒ガンシューティング。**

プレイヤー自身がカメラに映りながら、

**POINT → AIM → BAN → RELOAD**

を身体で行う。

ゲームを遊んでいる姿そのものが、ガンアクション映画のワンシーンになることを目指す。

---

# 1. このゲームの核

FINGER GUNの入力方式を、そのままゲームジャンルまで拡張する。

入力の役割を完全に分離する。

| 身体 | 役割 |
|---|---|
| 人差し指 | AIM |
| 腕の移動 | 照準移動 |
| 口を開く | FIRE |
| 手を下げる | RELOAD |
| プレイヤー本人 | 主人公 |

最大の特徴は、

**「手で狙いながら、別の身体部位で撃てる」**

こと。

手のジェスチャーだけで照準と発射を両方処理しないため、操作としても認識としても成立しやすい。

---

# 2. プレイヤー体験

理想の30秒。

```text
0秒

DRAW!

敵が窓から出る

👉

😮 BAN!

QUICK DRAW!
+500


次の敵

👉 😮
BAN!

×2


一般人！

撃たない！


敵2体！

BAN!
BAN!

×4


EMPTY!

手を下げる

RELOAD!


残り8秒

HIGH NOON


敵5体出現

BAN!
BAN!
BAN!
BAN!
BAN!


FINAL BOSS


👉 😮

BANG!!

💥


SHOWDOWN COMPLETE

12,840
QUICK DRAW ×7
BEST COMBO ×11
```

終了時には、

**「もう一回やったらもっと上手くできそう」**

と思わせる。

---

# 3. MVPのゲーム時間

基本ゲーム時間：

**30秒**

構成：

| 時間 | フェーズ |
|---:|---|
| 0〜3秒 | Tutorial Start |
| 3〜15秒 | NORMAL |
| 15〜23秒 | RUSH |
| 23〜27秒 | HIGH NOON |
| 27〜30秒 | FINAL |

1プレイを短くする。

失敗しても、

「もう一回」

が軽いことを優先する。

---

# 4. 基本操作

## AIM

利き手の人差し指方向を取得。

```text
手首
 ↓
人差し指付け根
 ↓
人差し指先
```

の方向ベクトルを画面まで延長。

交点を照準位置とする。

---

# 5. 照準

照準はプレイヤーの生の指方向に完全追従させない。

少量の補正を入れる。

### Aim Assist

敵のヒット領域付近に照準がある場合、

```text
RAW AIM

    +
     \
      ● ENEMY
```

内部的には、

```text
ASSISTED AIM

      +
      ●
```

へ吸着させる。

ただし照準UIそのものを急に動かさない。

プレイヤーには、

**「自分で当てた」**

と感じてもらう。

### 推奨値

敵中心から

**70〜100px程度**

をAssist Radiusとする。

スマートフォン画面サイズに応じて割合化する。

---

# 6. FIRE

口を開いた瞬間に射撃。

重要：

**開いている状態では連射しない。**

状態遷移：

```text
CLOSED
↓
OPEN
↓
FIRE
↓
LOCK
↓
CLOSED
↓
READY
```

一度閉じなければ次弾は撃てない。

### FIRE cooldown

目安：

**250ms**

目的は連射制限ではなく、

顔認識の細かな揺れによる多重発射防止。

---

# 7. 「BAN!」と言いたくなる設計

音声認識はMVPでは使わない。

実際の判定：

**口が開いたか**

だけ。

しかしUIでは、

```text
OPEN YOUR MOUTH
```

ではなく、

```text
SAY

BAN!
```

と表示する。

プレイヤーは自然に、

**「バン！」**

と言いながら口を開く。

認識技術を単純に保ちながら、体験だけ豪華にする。

---

# 8. 弾数

標準：

**6発**

```text
● ● ● ● ● ●
```

撃つたびに、

```text
● ● ● ● ● ○
```

になる。

6発撃つと、

```text
EMPTY!
```

---

# 9. RELOAD

リロードボタンは使わない。

### 動作

射撃中の手を画面下部へ移動。

判定：

```text
handY > reloadZone
```

一定時間維持。

推奨：

**250〜350ms**

成功すると、

```text
CLICK!

●●●●●●
```

復活。

---

# 10. リロード演出

手を下げる。

```text
RELOAD
↓
```

0.2秒後、

```text
カチャッ
```

再び構える。

プレイヤーの身体としては、

**腰のホルスターへ銃を戻す**

動きに見える。

ゲーム側はそれを映画的に補完する。

---

# 11. 基本ターゲット

MVPでは4種類。

## ENEMY

通常敵。

赤系アウトライン。

撃つ：

**+100**

---

## QUICK ENEMY

短時間で逃げる。

黄色。

出現時間：

約800ms。

撃つ：

**+300**

---

## CIVILIAN

撃ってはいけない。

青または白。

撃つ：

**-500**

さらにコンボリセット。

---

## GOLD

低確率ターゲット。

出現：

約500ms。

撃つ：

**+1000**

ゲーム中1〜2回程度。

---

# 12. 敵の登場方法

同じ場所からポンポン出さない。

最低6パターン。

### WINDOW

```text
▣
🤠
```

窓を開けて登場。

### DOOR

```text
🚪

BAM!

🤠
```

### CRATE

```text
📦

↓

🤠
```

### SIDE

画面端から顔を出す。

### DROP

上から降りてくる。

### DUO

2人同時。

---

# 13. 出現位置

画面をおおまかに9分割。

```text
1 2 3

4 5 6

7 8 9
```

ただし下段中央付近は、

プレイヤーの顔や手と重なるため出現率を下げる。

敵スポーンは、

```text
前回位置から離れた場所
```

を優先。

照準を大きく振らせる。

---

# 14. QUICK DRAW

敵が有効になってから撃つまでの時間を計測。

例：

| Reaction | 評価 |
|---:|---|
| < 350ms | LIGHTNING |
| < 550ms | QUICK DRAW |
| < 850ms | FAST |
| それ以上 | HIT |

ただし実機テスト後に調整。

最重要なのは、

**精密射撃より早撃ちを褒める**

こと。

---

# 15. COMBO

連続撃破：

```text
×2
×3
×4
```

コンボ継続条件：

- ENEMY命中
- GOLD命中

コンボ解除：

- MISS
- CIVILIAN射撃
- 敵の逃亡

---

# 16. スコア

基本：

```text
Enemy 100
```

Quick Draw：

```text
FAST       +50
QUICK      +150
LIGHTNING  +300
```

Combo：

```text
base × comboMultiplier
```

ただし指数的に増やしすぎない。

例：

```text
1〜3 combo   ×1.0
4〜6         ×1.2
7〜9         ×1.5
10+          ×2.0
```

---

# 17. MISS判定

口を開いた時点の照準に対象がなければ、

```text
MISS
```

ただしAim Assist範囲内なら命中。

MISS時：

- コンボリセット
- 弾は消費
- スコア減点なし

プレイヤーを必要以上に罰しない。

---

# 18. 敵の反撃

敵が一定時間残ると、

```text
!
```

が表示される。

さらに残ると、

```text
BANG!
```

敵が射撃。

プレイヤーHPはMVPでは使用しない。

代わりに、

```text
-200
COMBO LOST
```

程度。

死んでゲーム終了すると30秒体験が途切れるため。

---

# 19. HIGH NOON

本作の最大演出。

条件：

残り7秒。

画面の彩度が落ちる。

BGMが止まる。

時計音。

```text
TICK

TICK

TICK
```

画面中央：

```text
HIGH NOON
```

敵5体が配置される。

約1秒間静止。

```text
DRAW
```

時間再開。

プレイヤーは順番に、

```text
BAN!
BAN!
BAN!
BAN!
BAN!
```

する。

ここだけ通常よりAim Assistを少し強くする。

---

# 20. HIGH NOONの目的

難しいステージではない。

**撮れ高ステージ。**

理想：

プレイヤーが高速で腕を振り、

次々と敵を倒す。

画面には、

```text
QUICK!
×7

QUICK!
×8

LIGHTNING!
×9
```

最後に爆発。

SNS動画でこの5秒だけ見てもゲームが伝わるようにする。

---

# 21. FINAL SHOT

最後の敵だけ特殊。

巨大ロボ、賞金首など。

画面中央へ登場。

```text
FINAL SHOT
```

弱点が点灯。

プレイヤーが狙う。

少しだけ時間が遅くなる。

```text
👉
```

口を開く。

```text
BAN!!!
```

通常より派手な射撃。

```text
FLASH

SHAKE

💥
```

30秒終了。

---

# 22. FINALで失敗した場合

失敗してもゲームオーバーにしない。

例えば、

```text
SO CLOSE!
```

敵が逃げる。

結果画面に、

```text
FINAL SHOT
MISSED
```

表示。

再挑戦動機にする。

---

# 23. 初回チュートリアル

説明画面を長くしない。

プレイ開始後に覚える。

### STEP 1

ターゲット出現。

```text
POINT 👉
```

照準が乗ると、

```text
LOCKED
```

### STEP 2

```text
SAY "BAN!"
```

射撃。

### STEP 3

6発撃ったあと、

```text
LOWER YOUR HAND
TO RELOAD
```

これだけ。

---

# 24. 認識失敗対策

最重要項目。

FINGER GUN入力が認識できなくなった場合、

即失敗にしない。

### Pointer Lost

0〜300ms：

最後のAim位置を保持。

300〜800ms：

照準を半透明化。

800ms以上：

```text
SHOW YOUR HAND
```

表示。

---

# 25. FIRE補助

mouth判定にもヒステリシスを入れる。

例：

```text
OPEN threshold
0.55

CLOSE threshold
0.35
```

OPENとCLOSEを別値にする。

境界付近の振動を防止。

---

# 26. FINGER GUN姿勢

理想は、

```text
👉
```

だが、

完全な銃型ジェスチャーを要求しない。

人差し指方向が取れれば照準可能。

つまり、

親指が立っていなくても撃てる。

**見た目より遊びやすさを優先する。**

---

# 27. カメラ画面構成

縦9:16を基本。

```text
┌─────────────────┐
│ SCORE       ×8  │
│                 │
│ 🤠         🤠   │
│                 │
│       +         │
│                 │
│                 │
│        😎       │
│      👉         │
│                 │
│ ●●●●○○          │
└─────────────────┘
```

プレイヤー本人を画面中央下に置く。

敵は周辺へ配置。

---

# 28. Visual Layer

Three.js導入時には、

ゲームロジックとVisual Layerを分離。

Logic：

```text
spawn
hit
miss
reload
combo
score
```

Visual：

```text
enemy model
bullet trail
impact
smoke
debris
camera shake
lighting
slow motion
```

---

# 29. 撃った瞬間の「気持ちよさ」

一発の射撃に最低5要素。

1. マズルフラッシュ
2. 弾道
3. ヒットフラッシュ
4. 敵リアクション
5. SE

理想：

```text
BAN!

FLASH
──────>
💥

+300
```

画面揺れは小さく。

連射しても酔わない程度。

---

# 30. 敵撃破

血表現は使わない。

撃たれると、

- 吹き飛ぶ
- 紙吹雪
- ロボなら火花
- 西部劇なら煙
- シルエット化

など。

全年齢寄りにする。

---

# 31. 世界観

v0.1：

## TOY WESTERN

本物の銃ではなく、

**おもちゃ箱みたいな西部劇。**

敵も少しコミカル。

理由：

- 指鉄砲との相性
- 暴力感を抑えられる
- 色を明るくできる
- 海外でも一目で分かる
- CREATOR MODEに向く

---

# 32. カラーパレット

暗い西部劇ではなく、

明るいゲームセンター。

青空。

オレンジの岩山。

黄色い看板。

ターコイズ。

赤い敵マーカー。

**「楽しいガンシューティング」**

を最初の1画面で伝える。

---

# 33. 音

重要度が非常に高い。

射撃：

```text
BAN!
```

普通の実銃SEより、

少しコミカルで強い音。

ヒット：

```text
PING!
```

Quick Draw：

```text
TING!
```

Reload：

```text
CLICK-CLACK
```

HIGH NOON：

時計音＋心拍。

---

# 34. BGM

テンポ：

**130〜150 BPM**

通常：

軽快な西部劇。

RUSH：

パーカッション追加。

HIGH NOON：

一度BGM停止。

FINAL：

一発の強いコード。

音楽そのものが30秒の展開を作る。

---

# 35. CREATOR MODE

PLAY MODEとは別入口。

```text
PLAY

CREATOR
```

CREATORでは画面構図をSNS向けに調整。

---

# 36. Face Mode

既存基盤を流用。

```text
ORIGINAL
EFFECT
HIDE
```

### ORIGINAL

本人をそのまま表示。

### EFFECT

帽子、サングラスなど。

### HIDE

顔をキャラクター化。

---

# 37. AUTO DIRECTOR

自動で撮れ高イベントを記録。

候補：

```text
LIGHTNING
COMBO 10+
GOLD HIT
HIGH NOON
FINAL SHOT
```

終了時にもっとも盛り上がった約7秒を選ぶ。

---

# 38. リプレイ

ゲーム終了後：

```text
BEST MOMENT
▶
```

再生。

HUDは簡略化。

スコア、

```text
QUICK DRAW ×5
```

などだけ残す。

---

# 39. 結果画面

```text
SHOWDOWN COMPLETE

12,840

BEST COMBO
11

QUICK DRAW
7

ACCURACY
82%

FINAL SHOT
PERFECT
```

下部：

```text
AGAIN

REPLAY

SHARE
```

---

# 40. ランク

結果を一文字評価にしない。

西部劇称号。

例：

```text
NEW HAND

SHARPSHOOTER

QUICK DRAW

OUTLAW LEGEND
```

最高評価が分かりやすい。

---

# 41. 難易度カーブ

30秒内で自然に上がる。

### 0〜10秒

敵1体。

出現間隔長め。

### 10〜20秒

2体同時。

CIVILIAN登場。

### 20〜23秒

高速敵。

### 23〜27秒

HIGH NOON。

### 27〜30秒

FINAL。

---

# 42. 動的難易度補正

初心者が何もできず終わらないようにする。

命中率が低い場合：

- 敵サイズ +10%
- Aim Assist +10%
- 出現時間 +15%

命中率が高い場合：

- 出現時間短縮
- 同時出現増加

ゲーム中にUIでは見せない。

---

# 43. タップ代替入力

開発・アクセシビリティ用。

### AIM

タップ位置。

### FIRE

画面タップ。

またはSpace。

### RELOAD

Rキー。

CAMERAなしでもゲームロジックを検証可能にする。

---

# 44. 入力状態表示

デバッグモードのみ。

```text
HAND ✓
AIM ✓
MOUTH CLOSED
READY
```

通常プレイヤーには出さない。

---

# 45. 状態機械

ゲーム：

```text
BOOT
↓
CALIBRATION
↓
READY
↓
NORMAL
↓
RUSH
↓
HIGH_NOON
↓
FINAL
↓
RESULT
↓
REPLAY
```

武器：

```text
READY
↓
FIRE
↓
COOLDOWN
↓
READY

または

EMPTY
↓
RELOAD
↓
READY
```

---

# 46. Enemy State

```text
SPAWN
↓
ENTER
↓
ACTIVE
↓
WARNING
↓
ATTACK
↓
EXIT
```

撃たれた場合：

```text
ACTIVE
↓
HIT
↓
DEFEATED
```

---

# 47. 推奨モジュール構成

```text
FingerGunShowdownGame

Input
├ FingerAimTracker
├ MouthTrigger
└ ReloadDetector

Combat
├ Weapon
├ HitResolver
├ AimAssist
└ ComboSystem

Enemy
├ EnemyManager
├ SpawnDirector
└ EnemyTypes

Flow
├ GameDirector
├ HighNoonDirector
└ FinalDirector

Visual
├ ShotFX
├ HitFX
├ EnemyFX
└ ScreenFX

Audio
├ MusicDirector
└ SFX

Creator
├ HighlightRecorder
└ AutoDirector
```

---

# 48. SpawnDirector

完全ランダムにしない。

Director方式。

例：

```text
EASY

enemy


enemy


enemy + enemy


civilian + enemy


quick enemy


gold


RUSH
```

30秒のドラマを事前設計。

その中で位置のみランダム化する。

---

# 49. FAIR SPAWN

禁止：

敵が出現した瞬間に射撃。

最低React Time：

**約500ms**

敵登場アニメ中は攻撃しない。

CIVILIANと敵の見た目は明確に区別。

---

# 50. MVP敵数

30秒：

約20〜30体。

平均：

1秒前後に1イベント。

初心者：

15〜20撃破。

上級者：

25以上。

---

# 51. MVPでやらないこと

v0.1では以下を入れない。

- 武器選択
- 武器強化
- ステージ選択
- HP制
- ストーリー
- オンラインランキング
- ガチャ
- 複数武器
- しゃがみ回避
- 音声認識
- ボイスコマンド

まず、

**AIM → BAN**

だけで面白いかを検証する。

---

# 52. 成功判定

EXP-058成功条件。

### GATE A

初見プレイヤーが説明なしでも、

**10秒以内に敵を撃てる。**

### GATE B

30秒プレイ中、

認識失敗による不発が

**体感5%以下。**

### GATE C

プレイヤーが自然に、

**「BAN!」**

と言う。

### GATE D

HIGH NOONで腕を素早く振る。

### GATE E

終了後、

**もう一度押したくなる。**

---

# 53. Human Playtest観察項目

最低5プレイ。

観察：

1. 指を自然に構えたか
2. 照準方向を理解したか
3. BAN操作を理解したか
4. 不発があったか
5. 誤射があったか
6. リロードを理解したか
7. CIVILIANを認識したか
8. HIGH NOONで盛り上がったか
9. FINALを理解したか
10. もう一度遊んだか

---

# 54. 最優先検証

ゲーム内容より先に確認する。

### TEST 1

指を画面端へ向けてもAimが安定するか。

### TEST 2

BAN連続入力が安定するか。

### TEST 3

手を下げるリロードが誤爆しないか。

### TEST 4

スマートフォンを片手で持った状態でも遊べるか。

### TEST 5

顔と手が同時に認識できる距離が自然か。

---

# 55. FINGER GUNとの差別化

FINGER GUN：

**入力技術を楽しむ。**

SHOWDOWN：

**ゲーム展開を楽しむ。**

つまり、

```text
FINGER GUN
↓
CONTROL PROTOTYPE

SHOWDOWN
↓
GAME
```

という関係。

元EXPを置き換えない。

FINGER GUNは入力研究として残す。

---

# 56. 将来展開

同じコアシステムでテーマ変更可能。

## SPACE

宇宙人を撃つ。

## GHOST

幽霊を除霊。

## ZOMBIE

ゾンビシューティング。

## SPY

スパイ映画。

## MAGIC

指から魔法弾。

## PIRATE

海賊決闘。

ゲームロジックは共通。

---

# 57. DUO派生

将来的には二人プレイ可能。

二人が並び、

```text
PLAYER 1 👉

PLAYER 2 👈
```

同時に敵を撃つ。

協力：

**DUO SHOWDOWN**

対戦：

敵を奪い合う。

ただしv0.1には入れない。

---

# 58. 技術レイヤー

推奨：

```text
Camera
↓
MediaPipe

Finger Aim
+
Face / Mouth

↓

Game Logic

↓

Phaser
ゲーム進行・敵・当たり判定

↓

Three.js
必要なら3D演出

↓

Motion Graphics Layer
UI・文字・爆発・演出
```

Phaserは敵管理、スコア、スポーン、衝突などのゲーム部分と特に相性がよい。

Three.jsは、

**「必要になった場面だけ」**

使用。

最初から全3Dにはしない。

---

# 59. v0.1画面構成

HOME：

```text
FINGER GUN
SHOWDOWN

👉 + 😮

POINT.
SAY BAN.

[ DRAW ]
```

PLAY：

カメラ映像＋ゲーム。

RESULT：

```text
SHOWDOWN COMPLETE

SCORE

BEST MOMENT

[ AGAIN ]
[ REPLAY ]
```

最小3画面。

---

# 60. 最終目標

このゲームで証明したいことは、

**カメラ入力は「普通のゲームの代替操作」ではなく、新しいゲームジャンルの入力になれる**

ということ。

マウスなら、

クリックして撃つ。

タッチなら、

タップして撃つ。

FINGER GUN: SHOWDOWNでは、

**自分自身が拳銃になる。**

それがEXP-058の存在理由。

---

# MVP Implementation Priority

## P0

- Finger Aim
- Mouth FIRE
- Aim Assist
- Enemy spawn
- Hit判定
- 6発弾倉
- Reload
- Score
- 30秒ゲーム

## P1

- CIVILIAN
- QUICK DRAW
- Combo
- RUSH
- HIGH NOON
- FINAL SHOT

## P2

- 演出
- BGM
- Motion Graphics
- Creator Mode
- Auto Director
- Replay

---

# EXP-058 v0.1 完成定義

**次の瞬間が成立すれば完成。**

画面端の窓が開く。

敵が飛び出す。

プレイヤーが反射的に指を向ける。

照準が敵に吸い付く。

プレイヤーが、

**「BAN！」**

と言う。

画面が光る。

敵が吹き飛ぶ。

```text
⚡ QUICK DRAW
```

が出る。

そしてプレイヤーが、

**次の敵を探している。**

この瞬間が気持ちよければ、EXP-058は当たり。