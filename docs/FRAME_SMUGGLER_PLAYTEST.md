# FRAME SMUGGLER — 実装と5戦プレイテスト

2026-10-03。仕様: [EXP-035](specs/EXP-035_FRAME_SMUGGLER_SPEC_v0.1.md)。

## 開く

`/#smuggler` / `/#frame-smuggler` / `/#/game/outcam-frame-smuggler`。FEED / EXPLOREにも登録。

「カメラを使ってはじめる」→ 前後カメラを選択 → 「カメラを起動」→ 運び屋が片手を中央へ → START。通常は映し、赤いHIDE中は手かカメラを動かして画面外へ隠し、BACKで戻す。30秒で4検問。

カメラアクセスにはHTTPSまたはlocalhostが必要。PCのlocalhostプレビューはスマートフォンからの接続URLではない。端末上のカメラ・MediaPipeの実挙動は実機で確認する。

## 実装範囲

- TASK-001〜008: 前後カメラ、手追跡・宝石、フレーム判定、KEEP/HIDE/RETURN、30秒、結果・役割交代、JA/EN。
- TASK-009: ブラウザーの360×800・720×1280・1440×900で表示と操作を検証。実スマートフォンの検証とは区別する。
- TASK-010: カメラ戦の結果画面で6項目の観察記録・端末内保存・JSONエクスポートを実装。**実際の二人による5戦は未実施。**

## 5戦の進め方

同じ二人をP1/P2と呼ぶ。前後カメラは利用可能な端末で選び、各戦の結果から観察を記録する。話した言葉と誤認識は以下のメモに残す。結果画面のSWAP ROLESで担当を交代する。

| 戦 | 撮影 / 運び屋 | 向き・端末 | 1 説明 | 2 ルール | 3 参加感 | 4 会話 | 5 慌て | 6 再戦 | 発言・誤認識 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | P1 / P2 | 未実施 | — | — | — | — | — | — | |
| 2 | P2 / P1 | 未実施 | — | — | — | — | — | — | |
| 3 | P1 / P2 | 未実施 | — | — | — | — | — | — | |
| 4 | P2 / P1 | 未実施 | — | — | — | — | — | — | |
| 5 | 二人で選ぶ | 未実施 | — | — | — | — | — | — | |

3 / 4 / 6に注目してGO / 調整 / 保留を判断する。境界ロスト、暗所、手を速く出す動作、スマホ側を動かす動作、背景化後の再開も確認する。結果の「観察を記録したカメラ戦」は提出件数であり、実験成功の判定ではない。

## 保守と再現

2026-10-03の確認結果：本EXP用14テスト成功。作業時点の全体 `npm test` は187件成功、`npm run build` と `git diff --check` も成功。UI練習QAは53項目、合成カメラQAは23項目成功。360×800のタッチドラッグ、3サイズのスクリーンショットを確認。模擬入力の成功を実機の認識精度やHuman Playtest Gateの通過とは扱わない。

ルールは `src/games/frameSmuggler.js`、座標とロスト判定は `src/smuggler/cargoFrame.js`、カメラは既存BodyInputを継承した `src/smuggler/input.js`、表示・記録は同フォルダーのview / messages / records。

```powershell
npm test
npm run build
npm run dev -- --host 127.0.0.1 --port 5174
# 別ターミナル。破棄可能な専用ブラウザーを使う。
npx --yes @playwright/cli -s=frame-smuggler open http://127.0.0.1:5174/#smuggler
npx --yes @playwright/cli -s=frame-smuggler run-code --filename=scripts/qa/frame-smuggler.js
npx --yes @playwright/cli -s=frame-smuggler-camera open http://127.0.0.1:5174/#smuggler
npx --yes @playwright/cli -s=frame-smuggler-camera run-code --filename=scripts/qa/frame-smuggler-camera.js
```

QAスクリプトは専用プロフィール内の本ゲームの記録を初期化する。実ユーザーのプロフィールでは実行しない。カメラQAでは合成の手ランドマークを入力し、実MediaStreamTrackの解放を確認する。合成の観察記録は実機の5戦に数えず、終了時に除去する。

スクリーンショットと合成記録JSONは `output/playwright/frame-smuggler-*`。実機カメラの公平性・ゲームの面白さ・会話の発生・iOS/Androidでの許可と前後切替は未検証。公開デプロイは実施していない。
