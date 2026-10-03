# EXP-044 SOFT SERVE — visual / CREATOR v0.1

仕様: [EXP-044 Specification v0.1](specs/EXP-044_SOFT_SERVE_SPEC_v0.1.md)
追加: [CREATOR MODE v0.1の実装・検証](SOFT_SERVE_CREATOR_MODE.md)

`#/game/solo-soft-serve` / `#soft-serve`。Feed / Exploreへ登録した独立lazy module。
2026-10-03に、ユーザー提供のvisual implementation packと、続いて明示されたCREATOR MODE依頼を実装。
この追加依頼により、通常PLAYの映像非保存と、CREATORの端末内一時リプレイを分けた。

## 初見の導線と画面

- クリーム色、コーラル、ココア、ピスタチオの専用テーマと立体SOFT SERVEロゴ。
- 「ソフトクリーム、何段いける？」「手で巻いて、口で食べる。」「コーンは画面の中！」。
  「巻く → 離す → 食べる」、PLAY / CREATOR、無料チャレンジ、遊び方、カメラなしの練習。
- 片手をノズル下で0.9秒保持すると開始。手の中心で動かす。pinchは使わない。
- SERVEは中央のガイドで左右に巻く。3段以降は「もう一巻き、いける？」。
  横へ離すとEAT。追跡不足、口閉じ、先端までの距離、再接触待ちを区別する。
- EATは接触時の実際の量を減らす。0–80msの縮み、80–220msの引き込み、220–500msの消失・反応。
- 最後の一口は通常PLAYで750ms、CREATORで1.8秒の表示を経て、結果／リプレイへ1回だけ進む。
  音ON/OFFで遷移時刻は変わらず、manual pauseとbackgroundで表示の時計も止まる。
- 通常の結果は専用パネル1つ。「ごちそうさま！」「{実測}段 完食！」と、自分が作った形。
  倒壊・溶解・空の結果は別の文面。スコアは開く補助情報。
- 「もう一回つくる」「友達に挑戦状」「ほかのゲームへ」。カメラ／練習を引き継ぐ。
  共有は実結果に合う文と環境のcanonical URL。ネイティブ共有・コピー・手動コピー・キャンセルを維持。

## 実装

- `src/games/softServe.js`: 既存の形成・安定・溶解・接触・得点ルール。
  約14節／段の手の軌跡を記録。静止は細い塔、左右移動は広い巻きになる。
  SERVE→EATで形を深くコピーし、失敗時は作成途中の形をコピー。食べきっても結果に残す。
  一口イベントに消費量、元の形、接触前の先端とコーン位置を渡す。
- `src/input/softServeInput.js`: BodyInputのカメラ所有権・開始キャンセル・GPU→CPU fallbackを再利用。
  同じstreamへ手と顔の推論、最大20Hz。Creator用に顔領域と目・口の位置を付加する。
  口の比率、ヒステリシス、二人の顔の拒否、手の中心計算は維持。
- `src/softServe/renderer.js`: 実際の各段の広がり・中心・傾きを持つクリーム、
  ワッフルの陰影と格子、中央ノズル、口接触円、一口の一時形状。Canvas DPR上限2。
- `src/softServe/animation.js`: ゲーム時計とは独立した表示の時計、1回の終了通知。
- `src/softServe/presentation.js`: 専用の入口、遊び方、単一結果、Creatorリプレイ。
- 共通shellはoptional presentation / configure / mountResult / discardResult hookだけ。
  `launcher.js`はoptionsをretryへ保持。他EXPの入口・結果・入力は同じ。
- `src/creator/`: 共通のCameraLayout、FaceMode、HighlightEvent、Replay、Export / Shareの接続点。
  詳細は[CREATORの資料](SOFT_SERVE_CREATOR_MODE.md)。SOFT SERVE固有の顔・得点表示はprofile側。
- 得点、倍率、巻く最大20秒、round最大39秒は既存定数。
  追跡喪失・manual pause・非表示・focus喪失はゲーム時間停止。再追跡は0.45秒。
- カメラ開始は明示操作から。マイク不要。終了・離脱・遅い許可でstream / 両モデルを解放。
  通常の履歴は最新50件の数値。Creatorフレームは端末メモリ内だけで、retry / exit / pagehideで破棄。
- サウンドはWeb Audioで生成。外部音声なし。JA / ENとreduced motionに対応。

## 参照画像との意図的な差分

- 参照の人物写真は固定表示せず、実カメラを使う。QA画像の顔は合成図形。
- ノズルを右に移さず、既存の中央判定と同じ場所に置く。
- 7段を目標に固定しない。3段など安全な低い高さでも完食できる。
- 結果のコーンは固定の理想形ではなく、実際に巻いた形。
- 通常PLAYは映像を保存しない。後から追加されたCREATORは明示選択時だけ一時リプレイを作る。
- SAVE／SNS動画直接共有はv0.2。v0.1は7秒Canvasリプレイとテキストの挑戦状。
- ロゴは新規生成し、動く食べ物はCanvas描画。[素材の由来](../src/softServe/assets/README.md)。

## 検証

`npm test`: 213 / 213。`npm run build`: Vite / PWA成功。
devとproduction previewで通常のマウス・タッチ・キーによるPLAYを検証。
Creatorの3顔モード・3撮れ高・リプレイ・再挑戦は合成状態と、ビルド版の実マウス操作の両方で検証。
カメラのstream・両モデル・許可拒否・遅い許可・終了はbrowser-owned track + 合成landmarkで検証。
各スクリプトの件数・測定値は[CREATOR資料](SOFT_SERVE_CREATOR_MODE.md#ローカル検証)を参照。

390×844、360×800、720×1280、360×500、1440×900を確認。
短い画面はスクロールで主操作へ到達できる。デスクトップも縦の遊び場を保つ。
画像は `output/playwright/soft-serve-*.png` / `creator-*.png`（gitignore）。
生成画像を実装の検証画像として扱っていない。

使用skills: frontend-design、hiro-frontend-qa、playwright、imagegen。
追加の依存パッケージやプラグインのインストールは不要だった。

## 実機・人の検証（未実施）

Android Chrome / iOS Safariで各5ラウンドを行い、実顔・片手への追従、初回モデルload、
低照度、入力遅延、口の個人差、HIDEの遮蔽範囲、safe-area、音、発熱を確認する。
実カメラ推論速度と「失敗も投稿したい」「自然に欲張りたい」という感触はまだ確認していない。

| 回 | 段数 | もう一巻き | 説明なしで巻く | 倒れて再挑戦 | 自然に食べる | 投稿したい | 顔モード・メモ |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | | | | | | | |
| 2 | | | | | | | |
| 3 | | | | | | | |
| 4 | | | | | | | |
| 5 | | | | | | | |

上記はローカル検証の記録。公開版の動作確認はデプロイ時に別途行う。
