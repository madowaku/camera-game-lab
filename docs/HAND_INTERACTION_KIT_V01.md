# TECH-006 Hand Interaction Kit v0.1

基準日: 2026-10-06

目的は新しいジェスチャーを増やすことではなく、既存EXPの入力を
**初見で気持ちよく、ロストしても戻りやすく、描画を邪魔しない**状態へ揃えること。

## 外部リファレンスから拾うもの

### AeroPuzzle
- two-hand frame
- pinch / grab / drag のインタラクション分解
- カメラ映像をゲーム素材として使う発想

コードはライセンス表示がないため移植しない。設計だけ参考にする。

### Orb Catcher
- MediaPipe推論とゲーム描画の分離
- One Euro Filter
- gesture debounce
- requestVideoFrameCallback
- ランドマークからゲーム用ジェスチャーを薄く分類する構成

MIT。必要な考え方をcamera-game-lab側の既存設計へ合わせて独自に実装する。

### Flow Driving
- tiltを連続操舵へ変換する発想
- dynamic FOV / camera sway / bloomによる速度感

READMEはMIT表記だがリポジトリのLICENSEはGPL-3.0なのでコード移植はしない。

## 現状評価

camera-game-labには既に以下がある。

- PinchState: hand scale正規化 + enter/leaveヒステリシス + stale処理
- GripState: Open Palm / Fist + 80ms保持 + re-arm
- PalmTracker: hand identity + prediction + interpolation + lost判定
- TiltSignal: neutral calibration + dead zone +連続steering
- 各ゲーム描画はMediaPipeの推論結果を待たず独自RAFで進む

そのためTECH-006は置換ではなく、散らばった良い仕組みを共通化する。

## v0.1 第一陣

### 1. Video-frame scheduler
BodyInputは対応ブラウザで requestVideoFrameCallback を優先する。
非対応環境は requestAnimationFrame にフォールバックする。

狙い:
- 新しいカメラフレームがない時の無駄なポーリングを減らす
- MediaPipe推論と描画ループの責務をさらに明確化
- 既存ゲームロジックを変更しない

### 2. One Euro Filter
src/input/oneEuroFilter.js を共通部品として追加。

最初の適用先は FINGER GUN の照準。
固定時の細かな震えを抑え、速い照準移動ではcutoffを上げて追従する。

PinchState / GripState の状態判定には適用しない。
入力エッジへ位置フィルタを混ぜて反応を鈍らせないため。

## 改修優先順位

| 優先 | 対象 | 改修 |
| --- | --- | --- |
| P0 | FINGER GUN | One Euro aim、口トリガーは現状維持 |
| P0 | 共通BodyInput | video-frame scheduler |
| P1 | SOFT SERVE | hand cursorだけ適応平滑化。attachment判定はraw/既存座標で比較 |
| P1 | TOY DRUM | 表示位置と打撃速度を分離。速度判定を過度に平滑化しない |
| P1 | AIR SLASH | 表示用filtered path / 判定用raw velocityの二系統化 |
| P1 | TILT TURBO | 現行校正を維持しつつadaptive smoothingを比較テスト |
| P2 | PALM PONG | 現行のidentity + delayed interpolationが強いので実機比較後のみ変更 |
| P2 | HANDY PALS | TwoHandTrackerの共通identity tracker化候補 |
| P2 | PINCH WORLD | playableはGrip方式を維持。Pinchは研究モードのみ |
| P3 | BODY WINGS | dynamic FOV / camera swayをThree Visual Layerへ追加して速度感を強化 |

## 共通入力の目標形

Camera Frame
→ MediaPipe
→ Raw landmarks
→ Geometry / identity
→ optional adaptive filter
→ Gesture state / hysteresis / hold
→ Interaction event
→ Game

連続座標とイベントを分ける。

- 座標: pointer / palm / aim / tilt
- 状態: open / fist / pinch
- edge: start / move / end
- lifecycle: present / lost / reacquired

## 実機ゲート

変更ごとに最低限以下を見る。

1. deliberate input 10回で9/10以上
2. 30秒ニュートラルで誤発動0〜1
3. cold startで最初の成功が数秒以内
4. hand/face loss後に説明なしで復帰
5. 低照度・縦持ち・横持ちで破綻しない
6. tracking FPS低下時にもゲーム描画が滑らか

数値は合成テストと人間テストを分けて記録する。


## v0.1 第二陣 — 2026-10-06

### SOFT SERVE
追加フィルタは見送った。現行ですでに、
- ready判定: raw hand
- cone表示/物理: 65ms指数平滑化
に分離されており、One Euroを重ねるより遅延リスクが大きい。

### TOY DRUM
raw projected handsはそのまま DrumHitDetector へ渡す。
表示用hand cursorだけ OneEuroPointBank で平滑化する。

これにより高速スイングの swept-path 判定を変えず、停止時のカーソル震えだけ抑える。

### AIR SLASH
BladeTrackerの速度・collision segmentはrawのまま維持。
Renderer側だけ手ごとのOne Euro filterと130ms visual historyを持ち、
slash trailを滑らかに描く。

### BODY WINGS
Three Visual Layer向けに SpeedCameraRig を追加。
- speed / BOOSTに応じて最大+8° FOV
- 小さなcamera sway
- reduced-motion時は自動的にbase FOV / no swayへ戻る

リングのゲーム座標・判定・速度は変更しない。


## v0.1 第三陣 — 2026-10-06

### TwoSlotIdentity
両手・二人ゲームで重複していた「どの検出点がどちらの手か」を
src/input/twoSlotIdentity.js に共通化した。

責務はidentityだけに限定する。

- detector orderの入れ替わり
- 速度予測
- handedness label penalty（必要なゲームのみ）
- third observationの無視
- impossible jumpの拒否
- ambiguous overlapの拒否
- missing / reacquisition

平滑化・projection・gesture・collisionはゲーム側へ残す。

### HANDY PALS
handedness labelを強く使う設定でTwoSlotIdentityへ移行。
キャラクタ追従・ダンス判定は変更しない。

### TOY DRUM
handednessを信用しない純粋な幾何identity設定で移行。
raw sweep hit detectionとdisplay One Euroの分離は維持。

### PALM PONG
identity assignmentだけ共通化。
既存の40ms delayed interpolation、crop rejection、continuity、
tracking freshnessは専用ロジックとして維持する。

### TILT TURBO
Flow Drivingの「速度感を視覚で作る」発想を独自実装。

- speedに応じたpseudo-FOV
- road/worldだけのsubtle sway
- peripheral speed streaks
- reduced-motionでは全て無効

ゲーム速度、collision、steering、scoreは変更しない。

## 第三陣検証

既存のPALM PONG / HANDY PALS / TOY DRUMテストに加え、
TwoSlotIdentity専用テストとTILT TURBO visual FXテストを追加。

GitHub Actions:
- production build: success
- full npm test: success
