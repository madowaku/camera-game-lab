# CAMERA GAME LAB — Expansion Blitz v0.1

実施: 2026-10-03 (Asia/Tokyo)。基準はローカル Platform v0.1 の `e4ff96c`。本作業では既存8本とPlatformを維持し、2本を追加。この2コミットのRegistryは10本。着手時のローカルspecでは、下記以外に未ゲート・仕様十分な未実装experimentは見つからなかった。

完了整理中、同一working treeへ別作業のGHOST TRAIL / FRAME SMUGGLER / FALSE BRIDGE等が追加されていることを検出した。それらの実装・Registry・preview・replay変更は保存し、本コミットへ取り込まない。以下の10本・138 testsは今回のコミット対象の検証値であり、進行中の共有working tree全体の件数や他作業の完成宣言ではない。

| Experiment | Before | After | Tests | Platform | Remaining |
|---|---|---|---|---|---|
| EXP-004 BLINK HORROR | specのみ | 26秒の進行/危険度、閉眼、rush、顔ロスト停止、音、JA/EN、デモ | 14 unit + 50 browser checks | Feed/Explore/INFO/route/RESULT/RETRY/NEXT/SHARE | 実機の閉眼認識・5回の体感評価 |
| EXP-005 PINCH WORLD | specのみ | 3課題、fresh pinch、指先2点、壁/すき間、ソケット、追跡猶予、JA/EN、デモ | 16 unit + 70 browser checks | 同上 | 実機の位置合わせ・pinch認識・5回の体感評価 |
| DUO後続9本 | human gate待ち | `BLOCKED_BY_HUMAN_GATE` | syntheticを実機合格に代用しない | playable登録なし | TINY BOT DUELの実機2人・連続5round |
| NOTE EATER / AIR SHIRITORI / CRANE TACTICS | 独立した実装仕様が不足 | `SPEC_INSUFFICIENT` | 実装なし | 登録なし | 下記の仕様/研究条件 |

## 検証

- 新規完成ゲーム: **2**。Registry: **10**。
- `npm test`: **138 / 138**。既存107を維持、追加31。削除/skipなし。
- `npm run build`: 成功。初期shell JS約62.7kB、gzip約23.7kB。BLINK約17kB、PINCH約23kBの独立lazy JS。MediaPipeをFeedで読み込まない。
- `git diff --check`: 成功。
- 新規ゲームのブラウザーQA: **120項目**。360×800 / 720×1280 / 1440×900。デモ完走、JA/EN、結果共有、再挑戦、次ゲーム、横はみ出し、raw synthetic入力とresource解放を確認。
- pause/recovery QA: 8項目。PINCHのpause中のrelease・pointer capture復帰、BLINKの非表示時の即時音量減衰と進行停止・復帰。
- 既存discovery QA: 35項目。お気に入り・スワイプ・keyboard・検索・空状態・reduced motion・だいたい勇者の完走を再確認。BLINK filterは新作1件を検出し、DUO+BLINKを空状態の検証に使用。非同期のmedia-query変更を待ってからmotion判定するようQAを安定化。
- 既存DUO / GUARDIAN / NOTE BLASTER / WATERMELONのdemo QA: 8項目成功。
- 既存SOLO3本とVOICEのsynthetic camera QA: 10項目成功。入力開始、結果、再試行、camera/microphoneの解放を確認。
- production PWA: 8項目成功。10本のFeedをofflineで再表示、ゲーム/MediaPipe JSのprecache除外、センサー未開始、既存lazy起動。
- productionの新規ゲーム: 5項目成功。dev用module importを使わず、BLINKの結果、PINCHの3課題CLEARとretry、Feed復帰を確認。
- スクリーンショットは `output/playwright/` に保存。通常UI/デモで未処理のpage errorなし。カメラ拒否は明示的な負の検証。

再現スクリプトは `scripts/qa/expansion-*.js`。Playwright CLIの破棄可能なプロフィールで実行する。discovery QAはそのプロフィールのplatform設定を初期化する。production用は `npm run build` 後の `npm run preview` に対して実行し、synthetic camera用はVite devへ接続する。

## 棚卸しと停止理由

| Experiment | 根拠 | 結論 |
|---|---|---|
| EXP-016 NOTE EATER | `specs/EXP-019_NOTE_BLASTER_SPEC_v0.1.md` §35の「音符→口」「INPUT GAME」のみ | `SPEC_INSUFFICIENT`。ラウンド/採点/失敗/入力の独立仕様なし |
| EXP-017 AIR SHIRITORI RELAY | ローカルのdocs/specs、docs、src、README、ROADMAPに独立仕様なし | `SPEC_INSUFFICIENT` |
| EXP-006 CRANE TACTICS CAM | ROADMAPの短い構想、PINCH WORLD spec §20–22の将来関係 | `SPEC_INSUFFICIENT`。PINCH WORLDの実機研究後、正式仕様が必要 |
| EXP-021 FACE RACER | 個別specとDUO implementation task、DUO_ARCADE_PROGRESS | `BLOCKED_BY_HUMAN_GATE` |
| EXP-022 ZOMBIE DUO | 同上 | `BLOCKED_BY_HUMAN_GATE` |
| EXP-023 SKY DUEL | 同上 | `BLOCKED_BY_HUMAN_GATE` |
| EXP-024 HUMAN JOYSTICK | DUO_RELATION_LAB_SPEC / IMPLEMENTATION_TASK | `BLOCKED_BY_HUMAN_GATE` |
| EXP-025 HUMAN BRIDGE | 同上 | `BLOCKED_BY_HUMAN_GATE` |
| EXP-026 LIGHT & SHADOW | 同上 | `BLOCKED_BY_HUMAN_GATE` |
| EXP-027 PARALLEL WORLD | 同上 | `BLOCKED_BY_HUMAN_GATE` |
| EXP-028 FACE CHICKEN | 同上 | `BLOCKED_BY_HUMAN_GATE` |
| EXP-029 HOT POTATO CROWN | 同上 | `BLOCKED_BY_HUMAN_GATE` |

DUO RELATION LAB全体が同じgate待ち。`DUO_ARCADE_PROGRESS.md`には「template is still blank; it is not a passed test receipt」と記載され、TASK-009/017およびTASK-018 acceptanceは未通過。今回も `TINY_BOT_DUEL_HUMAN_PLAYTEST_PASS_v0.1.md` のチェック欄やGO判定を変更していない。

EXP-003、018、019、既存GUARDIAN/OUTCAM/TINY BOT DUELは既に実装済み。仕様の冒頭がReadyでも実装有無をsrcとRegistryで照合し、重複実装していない。

次に実装する3本は、既存指定順に **FACE RACER → ZOMBIE DUO → SKY DUEL**。前提は実機2人・5連続camera roundのgate記録。未ゲートのSOLOを先に進めるにはNOTE EATER等の正式仕様が必要。

## コミットと境界

- `dec83f4` — `Implement EXP-004 Blink Horror`
- `Implement EXP-005 Pinch World` — PINCH WORLD、対応QA、棚卸し文書、共通retryの実source引継ぎとpause時の入力/音声整理を含む。
- remoteへpush / Cloudflareへのdeployは今回実施していない。
- 新規外部素材は採用していない。2本ともoriginal inline SVG/CSSとWeb Audio合成音。無料・商用利用可の外部素材を利用してよいという許可は受領したが、今回の表現に追加ダウンロードは不要だった。
- 実機camera game feel、実機iOS/Android、Web Share OSシート、モバイルHTTPSでの認識率・音声挙動は未検証。ソフトウェア検証からhuman gate合格を推定しない。

詳細: [BLINK HORROR](BLINK_HORROR_PROGRESS.md)、[PINCH WORLD](PINCH_WORLD_PROGRESS.md)。
