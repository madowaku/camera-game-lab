# SOFT SERVE CREATOR MODE v0.1

このページはv0.1時点の記録です。現行実装と動画出力は
[CREATOR MODE v0.2 / AUTO DIRECTOR](CREATOR_MODE_V02_PROGRESS.md)を参照してください。

2026-10-03。ユーザーの追加依頼に基づく、camera-game-labのCREATOR MODE第1号。
通常PLAYの入力・時間・得点は同じまま、撮れ高の表示と短いリプレイを追加する。

## 入口と体験

1. 入口でPLAY / CREATORを選ぶ。初期値はPLAY。
2. CREATORはORIGINAL / EFFECT / HIDEを選んだクリックからカメラ開始。設定画面を重ねない。
3. ORIGINALはカメラ映像、EFFECTはソフトクリーム眼鏡・頬のスプリンクル・開いた口のEAT!・一口の王冠。
   EFFECTは匿名化ではない。HIDEは顔領域をマスクし、未追跡・複数顔・古い入力なら映像全体をクリーム色にする。
4. ゲームは9:16のCanvas内にカメラ、中央ノズル、実測のクリーム、コーン、顔演出を合成。
5. PERFECT SWIRL、巨大化／失敗のNOOOOO!、最後の一口のDELICIOUS!が見せ場。
   0.5倍の短い表示、フリーズ、軽いズーム、紙吹雪、クリームの全画面展開を使う。
   これらは表示にだけ作用し、判定やスコアの時計を遅くしない。
6. 終了直後は1.8秒のフィナーレ、続いて7秒リプレイ。見せ場付近の実際のフレームをつなぐ。
   ライブUIは含めず、最後の1秒はSOFT SERVE / camera-game-lab。
7. REPLAY、テキストで挑戦状、PLAY AGAIN、ほかのゲームへ。再挑戦はCREATOR・顔モード・カメラ／練習を引き継ぐ。

動画ファイルの保存とSNSへの直接動画共有はv0.2。
v0.1のリプレイはCanvasで再生する映像で、音声の録画・再生は含めない。
通常のゲーム効果音と音OFFは使える。

## 共通基盤

| ファイル | 責務 |
| --- | --- |
| src/creator/CreatorMode.js | 合成、短い表示速度変更、上限付き一時フレーム収集、highlight通知 |
| src/creator/CameraLayout.js | 9:16と鏡像coverの座標・カメラ描画 |
| src/creator/FaceMode.js | ORIGINAL / EFFECT / HIDE、未追跡時のHIDE fallback |
| src/creator/HighlightEvent.js | ゲームからのイベント、重複抑制、リプレイ区間選択 |
| src/creator/Replay.js | 7秒再生、ブランド末尾、再生・退出の世代管理 |
| src/creator/Export.js | v0.2のエンコード接続点。現在available=false |
| src/creator/Share.js | 実際の動画Fileができた後の共有可否 |
| src/softServe/creatorProfile.js | SOFT SERVEの文言・時間・顔演出指定 |
| src/softServe/faceEffect.js | SOFT SERVE専用の眼鏡・スプリンクル・EAT!・王冠 |

ゲーム側は `creator.highlight(type)` / `creator.highlight(type, data)` を通知する。
明示的に表示時刻を渡す場合は `creator.highlight(type, presentationTime, data)` も使える。
profileにイベント名・label・duration・slow/freeze・kindを渡す。
次のEXPはheadshot / combo / final-shotなどのprofileと専用のfaceEffect、drawFinishStatsを渡せる。
カメラ・顔位置、合成、フレーム収集、再生の実装を複製する必要はない。
SOFT SERVEのクリーム展開はprofileのsplashColor、接近時のTHE BITEはanticipationLabel、
SCORE / SIZE / SWIRLはdrawFinishStatsに置く。イベント名と見せ場の種類を分けたkindで、別のEXPにも同じ再生区間選択を使える。

```js
const profile = {
  brand: "FINGER GUN",
  headshot: { kind: "perfect", label: "HEADSHOT!", duration: 900, slow: .5 },
  combo: { kind: "perfect", label: "COMBO!", duration: 900 },
  "final-shot": { kind: "finish", label: "FINAL SHOT!", duration: 1500 },
};
// ゲームの判定成立時だけ呼ぶ。
creator.highlight("headshot");
```

共通launcherのconfigure(options)、presentationの入口・結果・破棄hookを使う。
他EXPにはloadPresentationもCREATOR設定も追加していない。

## 保存とライフサイクル

- カメラは1ストリーム。手と顔の推論は従来どおり最大20Hz、ゲームCanvasのDPRは最大2。
- リプレイは270×480の8fps上限、WebP圧縮フレーム。最大340枚／8MiB。短い表示用Canvasも10枚上限。
- 顔モードを適用した映像から保存する。生の別ストリームや顔写真を保存しない。
- localStorageには従来の数値結果のみ。リプレイ画像はlocalStorage、IndexedDB、外部サーバーへ保存しない。
- ゲーム終了でstreamとモデルを即停止。演出終了後に1回だけ履歴・完了通知。
- リプレイ再生・言語変更は新しいラウンド結果を増やさない。
- retry、route移動、pagehideでRAF、モデル、音声、フレーム、再生Canvasを破棄する。
- HIDEはゲーム用の表示機能。動く実顔への追従精度と実機での遮蔽範囲は未確認。

## ローカル検証

- `npm test`: 213 / 213。従来201件に、形の深いコピー、一口イベント、終了時刻・1回通知、共有文、Creator座標、
  HIDEの未追跡fallback、顔の曖昧性、イベント上限、リプレイ区間、Creatorの終了時間を追加。
- `npm run build`: Vite / PWA成功。Creatorとゲームはlazy chunk。
- `scripts/qa/soft-serve.js`: dev / production previewで31項目。マウス、タッチ、キー、巻く・離す・食べる・retry。
- `soft-serve-camera.js`: 合成landmarkで28項目。GPU fallback、単一stream、顔・手の追跡不足、口接触、終了・退出・拒否・遅い許可、
  カメラCREATORのHIDE fallback、リプレイ、カメラ再挑戦と退出。
- `soft-serve-visual.js`: 合成状態で32項目。3 / 7 / 11段、音OFF、reduced motion、最後の演出のpause、各失敗、
  コピー共有、JA / EN、結果の重複防止、360×800 / 390×844 / 720×1280 / 360×500 / 1440×900。
- `soft-serve-creator.js`: 合成顔・状態で41項目。顔選択即開始、3モード、3イベント、portrait、リプレイ、再挑戦、
  モード保持、録画側バッファの解放。スクリーンショットの顔はQA図形で実カメラではない。
- `soft-serve-creator-production.js`: ビルド版で6項目。実際の公開マウス操作で巻いて完食し、リプレイ・再生・再挑戦。
- `platform-production.js`: 8項目。feedの無許可閲覧、他ゲームの入口、PWAのoffline feedとlazy load。
- `soft-serve-creator-performance.js`: 別の新規Chromeセッションで実時間計測。デスクトップのdemo合成184呼び出し、
  平均1.07ms、p95 5.4ms、最大80.5ms（起動時スパイクを含む）。19フレーム36,118 bytes、live buffer10、最短capture間隔133ms、DPR1。
  実カメラ推論やスマホのフレームレート・熱負荷を測った数値ではない。

QA画像とログは `output/playwright/`（gitignore）。
開発サーバー `http://127.0.0.1:5173/#/game/solo-soft-serve`、
ビルド確認 `http://127.0.0.1:4173/#/game/solo-soft-serve`。

Android実機・iOS Safariでの各5ラウンド、実顔への追従、低照度、口の個人差、発熱、実際の投稿したさは未確認。
上記はローカル検証の記録。公開版の動作確認はデプロイ時に別途行う。
