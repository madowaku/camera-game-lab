# Camera Input Reliability Matrix v0.1

基準日: 2026-10-03。対象は現行LAB FEEDのplayable 15本。
評価するのは「検出可能か」ではなく、**初見プレイヤーが説明なしに気持ちよく成功できるか**。
以下のRankは入力選択の設計評価であり、実機・人間による認識率の測定結果ではない。

## Reliability Rank

| Rank | 意味 | 主操作への採用 |
| --- | --- | --- |
| S | 大きな位置・移動。ほぼ迷わない | 積極採用 |
| A | 大きな形・状態変化 | 採用 |
| B | 校正・保持・ヒステリシスが必要 | 条件付き |
| C | 姿勢・環境・個人差の影響が大きい | 補助操作まで |
| D | 細かな指・関節変化など | 主操作禁止 |

## 現行EXP棚卸し — v0.1の評価と対応

EXP番号はcollection内の表示番号。重複するEXP-020はcanonical IDで区別する。

| 判定 | EXP / GAME（canonical ID） | v0.1の入力 / 難易度 / リスク | 対応方針 |
| --- | --- | --- | --- |
| 🔴 | EXP-001 HAND BEAT (`solo-hand-beat`) | OPEN / FIST / PEACE / PINCH · C–D · 高 | PINCH廃止。標準分類のTHUMB UPに置換（今回実装） |
| 🟡 | EXP-002 FINGER GUN (`solo-finger-gun`) | 指方向＋口OPEN/CLOSE · B–C · 中 | 人差し指で照準、口を閉じる→開けると一発。2026-10-04更新 |
| 🟢 | EXP-003 EAT / DON'T EAT (`solo-eat-dont-eat`) | 顔＋口OPEN/CLOSE · A–B · 低～中 | 基本維持。OPEN保持とCLOSE復帰で再入力できることを検証 |
| 🟡 | EXP-004 BLINK HORROR (`solo-blink-horror`) | 両目OPEN/CLOSED · B–C · 中 | 開始時校正。短い自然瞬きを無視し、閉眼保持を使う |
| 🔴 | EXP-005 PINCH WORLD (`solo-pinch-world`) | 親指＋人差し指PINCH · D · 高 | 手中心XY＋Closed Fistで掴む / Open Palmで離す（今回実装）。磁石吸着は比較候補 |
| 🟢 | EXP-030 GHOST TRAIL (`solo-ghost-trail`) | 鼻・顔中心XY · S · 低 | 基準入力候補として維持 |
| 🟡 | EXP-019 NOTE BLASTER (`voice-note-blaster`) | 声の音高＋口位置 · A（映像） · 低 | 顔ロスト時は発射位置だけ固定へ。ゲーム判定を顔検出に依存させない。現行は顔ロストでも停止するため追加改修候補 |
| 🟡 | EXP-020 TINY BOT DUEL (`duo-tiny-bot-duel`) | 2人の顔XY＋口OPEN · B–C · 中～高 | 顔移動を主入力に。大きな口閾値＋CLOSE復帰。自動射撃モードも比較候補 |
| 🟡 | EXP-020 GUARDIAN SPIRIT (`guardian-spirit`) | 腕スイープ・伸ばし・両腕開き・両手上げ · B · 中 | 大きく異なる3～4姿勢。微妙な腕角度を主入力にしない |
| 🟡 | EXP-021 WATERMELON GUIDE (`outcam-watermelon-guide`) | 高速な下方向ハンドスイング · B · 中 | 手首または腕全体の高速な判定線通過を使う |
| 🟢 | EXP-025 FALSE BRIDGE (`outcam-false-bridge`) | カメラ構図＋LOCKタップ · S · 低 | ML認識不要の方向を維持 |
| 🟢 | EXP-035 FRAME SMUGGLER (`outcam-frame-smuggler`) | 手のフレームIN/OUT · A–B · 中 | ジェスチャー不要。端での消失に猶予を設ける |
| 🟡 | EXP-018 DAITAI HERO (`solo-daitai-hero`) | 顔LEFT / RIGHT＋うなずき · B · 中 | 中央は頭を下げて正面へ戻す一回のうなずき。2026-10-04更新 |
| 🟢 | EXP-043 THE CAMERA IS IT (`outcam-the-camera-is-it`) | スマホ姿勢・画角 · S–A · 低 | 画像認識を使わない方向を維持 |
| 🟡 | EXP-044 SOFT SERVE (`solo-soft-serve`) | 手中心XY＋口 · A–B · 中 | PINCH不要を明示。即時の薄い追従 → 保持リング → 成功確認（今回実装） |

## Camera Game Input Law v0.1

> カメラゲームの主入力は、ランドマークの精密さではなく、画面上での差の大きさで選ぶ。

**位置 ＞ 大きな移動 ＞ 大きな姿勢 ＞ 大きな状態変化 ＞ 細かなジェスチャー ＞ 指関節**

| やりたいこと | 避ける主入力 | Reliability Input |
| --- | --- | --- |
| 掴む | PINCH | 手を重ねる / FIST |
| 撃つ | 親指を曲げる | 前へ突き出す / LOCK後自動発射 |
| 選ぶ | 指先クリック | 顔・手をゾーンへ |
| 持つ | つまみ続ける | 自動吸着 |
| 離す | 指を数cm離す | OPEN PALM / 指定ゾーン |
| 殴る | 拳形状判定 | 手首速度 |
| 避ける | 身体姿勢分類 | 顔・身体XY |
| 食べる | 唇の細かな動き | 大きく口を開ける |
| 隠す | 特殊ポーズ | フレーム外へ移動 |

主力候補は顔XY / 鼻XY / 手中心XY / 腕や手の大きな移動 / 口OPEN-CLOSE /
フレームIN-OUT / スマホ姿勢。PINCH / 親指だけの曲げ伸ばし / 指同士の接触 /
微妙な関節角度は主操作から外す。

新しいEXP企画では、最初に主入力、Rank、成功までの身体動作、復帰方法を記載する。
Dを主操作に使う案は製品候補へ進めない。PINCH研究を行う場合は研究目的を明示する。
面白さテストの前に以下のInput Gateを通す。

## 初見入力ゲート v0.1

| Gate | 方法 | 合格目標 |
| --- | --- | --- |
| A: deliberate input | 同じ操作を10回行う | 9/10以上成功 |
| B: false activation | 30秒間、意図的な操作をしない | 誤発動0～1回 |
| C: cold start | 操作方法を文章で説明せず、画面の誘導だけで初回入力 | 5人中4人以上が数秒以内に最初の成功へ到達 |
| D: recovery | 手・顔を一度画面外へ出し、戻す | 特別な復旧操作を知らなくても復帰 |
| E: failure readability | 認識失敗時の画面だけを見せる | 何を直せばよいか分かる |

`HAND NOT FOUND`だけで終わらせず、例えば「もう少し手をカメラから離して 👋」
と具体的な行動を伝える。距離の診断がない場合に距離を断定しない。
現在のP0画面では「手全体を枠の中へ」「一度手を開いて、重ねてからグー」など、
検出状態に対応した復帰行動を示す。

記録テンプレート（実験・入力バージョン・端末・照明・左右の手・日付を併記）:

| プレイヤー | A 成功/10 | B 誤発動/30秒 | C 初回成功までの秒数・説明の有無 | D 復帰できたか/秒数 | E 直す動作を理解したか | つまずき |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 未実施 | 未実施 | 未実施 | 未実施 | 未実施 | |
| 2 | 未実施 | 未実施 | 未実施 | 未実施 | 未実施 | |
| 3 | 未実施 | 未実施 | 未実施 | 未実施 | 未実施 | |
| 4 | 未実施 | 未実施 | 未実施 | 未実施 | 未実施 | |
| 5 | 未実施 | 未実施 | 未実施 | 未実施 | 未実施 | |

## FINGER GUN — 2026-10-04 操作変更

現行は「指で照準、口を開けてBAN!」。以下のv0.2の自動発射方式を置き換えた。
手と顔を同じインカメラ映像から認識し、最初に口を閉じて700ms校正する。
口OPENは保持・ヒステリシスを通して確定し、CLOSE→OPENで一発だけ発射。
開けたままでは連射しない。的外れの照準で口を開ければMISSとして計上する。
手・顔ロスト、推論の長い間隔、画面離脱後は、両入力が見える状態でCLOSEに
戻るまで再発射しない。照準の色は的との重なりを示し、保持時間を要求しない。
マイクは不使用。人間のInput Gates A–Eはこの変更でも未検証。

## P0入力 v0.2 — 実装（FINGER GUNの旧方式）

- **FINGER GUN:** 親指の閾値・曲げ伸ばし発射を削除。人差し指の投影を使う。
  rawと平滑化後の照準が同じ的に連続250ms重なると一発だけ発射する。
  的の変更・画面離脱・追跡ロスト・150ms超の推論間隔で保持をリセット。
  移動直後は照準の平滑化があるため、手を動かした瞬間から250msとは限らない。
  色の変化、LOCKの進捗、保持表示で自動発射までの状態が見える。
- **PINCH WORLD:** 名前とURLは維持。5点の手のひら中心でカーソルを動かし、
  MediaPipeの`Open_Palm` / `Closed_Fist`を信頼度0.6・80ms保持で確定する。
  初回の閉じた手だけでは掴まない。Open Palm → 新しいFistで掴み、Open Palmで離す。
  未分類の姿勢は勝手に離さず、300msの追跡猶予後はその場へ落とす。
  帰ってきた手に開く動作を画面で案内。指先のピンセット表示を手カーソルへ変更。
  `PinchState` / `PinchInput`は研究用に残すが、playableの入力には使わない。
- **HAND BEAT:** `Open_Palm` / `Closed_Fist` / `Victory` / `Thumb_Up`の4分類。
  近い指先をPINCH扱いする上書きを削除。16拍のPINCHをTHUMB UPへ変更。
  イラスト、JA / ENのラベル・説明、Feedの入力情報も更新。
- **SOFT SERVE:** 元からPINCHは不使用。手が見えた時点から薄いコーンが追従し、
  ノズル下の保持リングが450msで完成。「カチッ！🍦」と任意の音で成立を確認。
  手の位置をclampする前に開始ゾーンを判定するので、画面外の手では成立しない。
  保持途中のロストはリングをリセット。入口・遊び方・プレイ中にPINCH不要を明示。

標準分類の名称は[MediaPipe公式Gesture Recognizerガイド](https://developers.google.com/edge/mediapipe/solutions/vision/gesture_recognizer)で確認。
標準分類であること自体は初見成功率の保証ではない。

## 検証と未達ゲート

- `test/inputReliability.test.js`: 10回のLOCK / Fist入力、30秒の合成ニュートラル、
  短い通過、未知の姿勢、追跡ロスト、指先に依存しない手中心、開始ゾーンを検証。
- `scripts/qa/input-reliability.js`: 実controllerを通る合成カメラ、LOCKから自動発射、
  手の復帰、THUMB UPの実描画、SOFT SERVEの保持途中と成立を確認。
  4本の入口はJA / EN、390×844 / 360×500 / 1440×900で確認。
- `scripts/qa/expansion-pinch-camera.js`: 合成Open Palm / Fistから3課題完走、
  短期・長期ロスト、復帰、壁、リトライ、カメラ・モデル解放を確認。
- `scripts/qa/expansion-pinch.js`: 360 / 720 / 1440幅でタッチ・マウス・キーの3課題を確認。
- `scripts/qa/soft-serve-camera.js`, `soft-serve.js`, `soft-serve-visual.js`:
  カメラ経路・練習・表示・食べる操作・結果・Creatorの既存経路を確認。
- 画面証拠と実行結果JSONは`output/playwright/`（gitignore）に保存。

**人間によるGate A～E、Android / iOS実機の認識率、快適さはすべて未実施。**
合成入力の10/10や誤発動0を、人間によるGate合格として扱わない。
黄色のEXPは上表の方針を追加改修・比較の候補として残し、今回のP0修正完了と区別する。
