# EXP-030 GHOST TRAIL — implementation / QA

実装日: 2026-10-03 (JST)。Prototype Spec v0.1 のMVP。

## 起動

`#/game/solo-ghost-trail`（短縮 `#ghost-trail`）、Feed / Explore から開始。
カメラ開始を押してから共通の前面カメラ／MediaPipe Face Landmarkerを起動。
白いリングが現在の鼻の中心。身体や頭をゆっくり動かして色つきの過去のリングを避ける。
デモはタッチ・マウス・矢印キー / WASD。カメラ入力の結果と区別する。

## MVPの決定事項

- 合計30秒に冒頭の記録3秒を含む。LIFE 3、ゼロで敗北、30秒で生存。
- 3秒時点に3秒前、6秒時点に6秒前、12秒時点に9秒前、20秒時点に12秒前のゴーストを追加。
- 青／紫／白／ミントの半透明の頭・肩と、遅延時間ラベル・短い軌跡。身体シルエットの記録ではない。
- 判定は鼻の1点。前面映像を左右反転し、object-fit:coverの切り抜きと同じ座標へ投影。
- 距離は画面幅基準、縦方向は3:4の比率を補正。見た目のリング半径の合計0.095に対して接触距離0.07。フレーム間の横切りも判定。
- 出現後800msは接触なし。被弾後1,200msは全ゴーストに無敵。
- スコアは生存100msにつき1点（最大300）＋ニアミス1回50点。
- 0.15以内へ接近後、接触せず0.18より外へ抜けるとニアミス。本人の移動量0.035以上が必要。同じ接近中に連続加点しない。
- 顔なし／複数顔／表示範囲外／250msを超える入力停止では時刻・履歴・採点を凍結。安定した顔を600ms確認して復帰する。
- 手動停止、非表示タブ、ウィンドウのフォーカス喪失にも対応。追跡が途切れた座標間は補間しない。
- 履歴は座標だけのリングバッファ。16msごとに最新点を残し、約13秒を保持（上限2,048点）。高リフレッシュレートでも12秒前を失わない。
- 撮影画像や過去映像の保存・アップロードなし。結果時・離脱時・再試行時にストリーム・モデル・RAF・イベントを解放。
- 縮小SAFE ZONEや中央倍率は加えず、端待ちの有効性を観察する。

## ファイル

- `src/games/ghostTrail.js`: ラウンド・出現・判定・採点。
- `src/ghost/history.js`: 過去座標。
- `src/input/ghostInput.js`, `ghostPosition.js`: 共通FaceInputを再利用した鼻入力。
- `src/ghost/view.js`, `draw.js`, `messages.js`, `ghost.css`: ライフサイクル・描画・JA/EN。
- `src/platform/experiments.js`, `preview.js`: 遅延登録・軽量SVGプレビュー。
- `test/ghostTrail.test.js`: 再現可能なルールテスト。
- `scripts/qa/ghost-trail.js`, `ghost-trail-camera.js`, `ghost-trail-controls.js`: ブラウザー検証。

## 検証

`node --test test/ghostTrail.test.js`: 11件。履歴補間／保持上限／高Hz、正確な遅延と出現、生存／敗北、端待ち、無敵、ニアミス、追跡切れ／復帰、画角投影、再試行を確認。

Windows ChromeのブラウザーQA：

| 検証 | 結果 |
| --- | --- |
| 360×800 / 720×1280 / 1440×900 | ポインター操作で30秒生存・4体出現、静止で敗北、停止・再開、RETRY / NEXT / SHARE、JA/EN、横はみ出しなし |
| Feedの遅延ロード | ゲーム・モデル・センサーを起動しない |
| デモ | 全操作でカメラ要求ゼロ、結果はDemo表記 |
| 合成カメラ | 鼻の生入力、顔なし・2人・範囲外で停止、安定復帰、結果／再試行／離脱の解放、遅延許可の解放、拒否からデモ復帰 |
| 未処理JS例外 | なし |

デモ31項目、合成カメラ15項目、操作6項目。矢印キー／タッチによるリングの位置をCanvasのピクセルから確認し、フォーカス喪失・復帰と日本語のプレイ画面も確認した。
画像証跡は `output/playwright/ghost-*.png`（gitignore）。
並行編集中のVite HMRによる検証中断を避けるため、同じソースの確認用コピーを `output/playwright/ghost-site` に作り5179番で検証した。
合成カメラは実MediaStreamTrackと偽のMediaPipe出力でライフサイクルを検証し、実際の推論精度や身体操作の面白さは評価していない。

最終確認で `npm test` は187/187成功、`npm run build` と `git diff --check` は成功。
履歴保持の調整後、本番用ビルド（4173番）でもデモ31項目を再実行して成功。
コミット時には、並行作業中の別ゲームを除いたGHOST TRAIL単独の変更構成でも149/149テストとビルドが成功。

通常の再現:

```powershell
npm test
npm run build
npm run dev -- --host 127.0.0.1
npx --yes @playwright/cli -s=ghost-qa open http://127.0.0.1:5173/#/game/solo-ghost-trail
npx --yes @playwright/cli -s=ghost-qa run-code --filename=scripts/qa/ghost-trail.js
npx --yes @playwright/cli -s=ghost-qa run-code --filename=scripts/qa/ghost-trail-camera.js
npx --yes @playwright/cli -s=ghost-qa run-code --filename=scripts/qa/ghost-trail-controls.js
```

TASK-001〜009: 実装・自動検証済み。TASK-010: ブラウザー360×800検証済み（物理スマホは未実施）。
TASK-011: **5ラウンドHuman Playtest未実施**。[記録シート](GHOST_TRAIL_PLAYTEST.md)を使用する。
本番デプロイは行っていない。

## ローカル結果

`camera-game-lab-ghost-trail-rounds` に最新50ラウンド。source、score、seconds、lives、hits、nearMisses、maxGhosts、trackingLosses、edgeRatioを保持。
edgeRatioは端（左右15%、上下12%）にいた有効時間の比率。自動的に人間の成功判定へ換算しない。
raw画像・座標履歴はlocalStorageに保存しない。保存が拒否されてもプレイできる。
