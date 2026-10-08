# EXP-062 MARU MAGIC / まる召喚 — SOLO MVP v0.1

2026-10-08. The user's specification is the starting point. MARU DUEL is future work.

「空中に円を描くと、魔法で何かが生まれる」。きれいに描く喜びと、
失敗しても誇らしげな精霊が生まれる笑いを両立する。

## Rules

1. 前面カメラで人差し指先端（MediaPipe landmark 8）を映す。
2. 0.3秒止める。進行リングと「指をここで止めて」を表示。
3. 大きな「準備OK！」と短い音で知らせる。指を動かすと描画開始。
4. 約一周して始点の近くに戻ると自動採点・召喚。時計は描画開始から8秒。
5. 召喚画面内の「もう一度」で即再挑戦。指先を合わせて0.7秒止めてもOK。
   進行バーを表示し、通過・大きな移動・認識中断で解除。回数や全体時間の制限はない。
   再挑戦後はボタンから指を離し、描き始めたい場所で改めて0.3秒静止して準備する。

タッチ練習は pointerdown を開始意思として扱い、静止準備を省略する。
同じ採点関数を使い、始点復帰または指を離すと採点する。

| Score | Summon | Personality |
| --- | --- | --- |
| 0–49 | じゃがいも精霊 / Potato spirit | 本人は完璧な魔法陣だと思っている |
| 50–79 | カエル精霊 / Frog spirit | 少し歪んでいてもご機嫌 |
| 80–94 | 星の精霊 / Star spirit | 光の輪と回転するきらめき |
| 95–100 | 光の精霊 / Light spirit | 特別な光と和音のファンファーレ |

## Fair scoring

固定の600×600の正方形座標。動画は正方形へ cover crop、鏡像変換は一度だけ。
画面の縦横比で円が楕円に変わることを避ける。

- Reliability: 非有限点、重複、孤立した大きな往復ジャンプを除去。
- Truth: 残った未整形軌跡を弧長で128点へ再標本化。端末FPSや途中の静止で
  一部の点だけ重く評価しない。円フィットと相対半径誤差を使う。
- Feel: 共通 `smoothVec2`、28ms時定数の光の軌跡。採点へは戻さない。
- 重み: 丸さ75%・閉じ具合15%・滑らかさ10%。速度の加点はゼロ。
- 丸さ: 相対半径誤差のRMS。1%以内を許容し、以後指数的に減点する。
- 閉じ具合: 始終点距離 / フィット半径。自動終了には一周角度も必要。
- 滑らかさ: 等間隔点での局所的な向きの変化。カメラのフレーム数に依存しない。
- 最低半径42、周回率・角度のカバー86%以上。逆走、複数周、未完成は49点以下。
- 結果には3成分、時間、形に応じた改善ヒントを表示する。

0.55秒以内の認識中断は軌跡を保持し、中断時間を時計から除外する。
大きな復帰ジャンプまたは長い中断は**採点せず**描き直し。見えなかった場所を
理想円として補完しない。手動停止・背景化も未完成の線を採点せずリセットする。

## Deliberate additions to the draft

- 最速記録は **80点以上、始点復帰で完成した円**だけ。低精度の速描きが
  速度記録を独占するのを防ぐ。最高得点と速度は独立に端末保存。
- A401OPで「準備のために止まることと準備OKがわかりにくい」との実機
  フィードバックを受け、明示的な案内・進行リング・READY音を追加。
- スクロールせず再挑戦できるよう、キャンバス内にも再挑戦ボタンを置く。
- 改良後の準備案内はユーザーが実機で「わかりやすくなった」と確認。
  追加希望により、指先の0.7秒待機でスマホに触れず再挑戦できる操作を追加。
- 指先リトライの実機フィードバックを反映し、リトライ位置で自動的に描画を
  準備せず、選び直した場所で改めて静止してから開始する。
- `?debug=1` は採点内訳と最大20試行の座標JSONを手動エクスポートできる。
  カメラ映像は含まない。試行はメモリ内だけで、退出時に消去する。

## Assets and architecture

Shared PhaserRuntime / CameraGameScene / CameraInputBridge / GameEventBus.
Existing BodyInput owns front camera acquisition, GPU/CPU model fallback and disposal.
The pure core owns all scoring, start/end decisions and timeouts. One Phaser loop.
DOM owns controls, locale, accessibility and results. No Three dependency needed.

Built-in Imagegen: one transparent 2×2 spirit atlas. Kenney RPG Audio CC0 accents.
OpenTracks「The maze of aqua」/ 蒲鉾さちこの既存ゲーム用音源を共有する。
READY音と4種類の召喚音はオリジナルWeb Audio。BGMは召喚・停止・退出で静かになる。
Exact source links, hashes and generation prompt: [asset manifest](../maru-magic-assets.json).

## Acceptance and verification

- [x] LAB Registry / canonical `#/game/solo-maru-magic`, aliases `#maru-magic`, `#maru`
- [x] 実際の前面カメラと人差し指先端の追跡
- [x] 軌跡、自動開始、自動終了、8秒入力タイムアウト
- [x] 純粋な採点関数と形・周回の安全条件
- [x] 4段階の召喚、Imagegen精霊、SE・BGM
- [x] タッチ、JA/EN、独立した最高得点/最速記録
- [x] 自動テスト、ブラウザQA、A401OPの実カメラで8回の自動終了を確認

実装・検証の詳細と実機の制約: [MARU_MAGIC_PROGRESS.md](../MARU_MAGIC_PROGRESS.md).
採点帯は仮のまま。自然さと点数の納得感は少人数の初回確認だけでは確定しない。
指先での再挑戦の使い心地と採点の分布を継続して確認する。
