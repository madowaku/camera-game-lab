# Camera Input Debug HUD v0.1

基準日: 2026-10-06

目的は「なんとなく反応が悪い」を、A401OPなどの実機上で
FPS・推論時間・raw/filtered軌跡・tracking event・gesture確定時間として見えるようにすること。

## 起動

### 開発サーバー
ViteのDEVビルドでは画面右下に `DBG` が出る。
タップするとHUDが有効になる。

### 公開ビルド
通常はHUD自体を表示しない。
URLへ `?inputDebug=1` を付けた時だけ表示・自動オープンする。

例:

`https://example.workers.dev/?inputDebug=1#/game/solo-finger-gun`

## 表示

共通BodyInput系:
- status
- scheduler: video-frame / animation-frame
- inference FPS
- inference time ms
- MediaPipe delegate: GPU / CPU

ゲーム別:
- FINGER GUN: raw aim / One Euro filtered aim / mouth / shot / on-target
- TOY DRUM: raw hands / display-filtered hands / hit events
- AIR SLASH: raw blade / filtered visual blade / slice / bomb
- TILT TURBO: raw roll / filtered roll / steering / neutral / calibration
- GRIP: gesture candidate / confirmation ms / GRIP_START / GRIP_END
- PINCH: pinch ratio / confirmation ms / PINCH_START / PINCH_END

## 色

- orange: raw
- cyan: filtered / display
- green: other

軌跡は約2.2秒だけ保持する。

## Privacy / performance

HUDはデバッグ用の一時メモリだけを使う。

- camera frameを保存しない
- localStorageへ座標を書かない
- network送信しない
- page reload / HUD OFFで履歴を破棄
- eventsは直近16件
- trailは1系列120点まで
- HUD描画はrequestAnimationFrame単位にまとめる

HUD自身が入力性能を大きく変えないことを優先する。

## A401OP推奨チェック

1. FINGER GUNで静止し、rawの揺れとfilteredの揺れを比較
2. 左右へ素早く振り、filteredが遅れすぎないか確認
3. TOY DRUMを速く叩き、raw判定のHITがdisplay handより遅れないことを確認
4. AIR SLASHで速い斬撃がrawでは十分速く、visual trailだけ滑らかなことを確認
5. TILT TURBOで正面校正、±5°付近、最大傾きまでのroll/steeringを見る
6. 手や顔を画面外へ出し、TRACK_LOST / FOUNDの復帰を見る
7. GRIP / PINCH利用ゲームではgesture確定時間を確認

目安としてHUD ON/OFF双方で操作感も比較する。
