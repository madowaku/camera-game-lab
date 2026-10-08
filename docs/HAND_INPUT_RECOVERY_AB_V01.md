# Hand Input Recovery / Stabilization Lab v0.1

2026-10-09。参考研究: [barehands](https://github.com/jaredrhod/barehands) / [TROUBLESHOOTING](https://github.com/jaredrhod/barehands/blob/main/TROUBLESHOOTING.md)。
**実装は独自。barehands (AGPL-3.0-or-later) のコード、係数、文面は取り込んでいない。**
数値は実験の暫定値で、認識率や操作感の実機検証済み数値ではない。

## 目的と変更

- SOFT SERVE (EXP-044): 準備段階に限り、手が短く消えても最大150msまで装着保持の進捗を保持する。
  消えた時間は450msの装着進捗に**加算しない**。150msを超えたら0からやり直す。
  画面外に移ったままの手を装着したことにはしない。提供中・食事中のロスト/復帰/停止は従来どおり。
  認識が戻ったあと、ノズル外にいれば保持はリセット。推論設定やモデルは変更しない。
- MARU MAGIC (EXP-062): `src/input/handPointStabilizer.js` を独自実装。
  動きが3px以内なら前回の位置を保持、それ以外は動作速度に応じ8〜24msの時定数で追従。
  無効点、手のロスト、180ms超の古い標本、時刻の逆行では即リセット。
  デモ・タッチ操作、ゲームの採点規則、召喚後のリトライ操作は変更しない。
  **A（従来版）が標準**で、Bだけカメラの描画中・準備中の標本を補正する。
  補正でスコアが上がることを品質向上と混同しない。

## A/Bの操作

- A（既定）: `?debug=1&handFeel=A#/game/solo-maru-magic`
- B（実験）: `?debug=1&handFeel=B#/game/solo-maru-magic`
- `?debug=1` の SCORE LAB 表示に `handFeel`, `handInput.raw`, `handInput.stable`, `handInput.correctionPx` を出力。
- 片方のゲームを離れる／一時停止／リトライ／手の検出不能／標本ギャップで補正履歴をリセット。
- SOFT SERVEの救済は両バージョン共通。必要なら今後比較フラグを追加する。

## A401OP実機ゲート (未実施)

同じ照明・距離・画角でA/B各5プレイ、ABBAの順を交えて学習効果を抑える。
各プレイ: (1) 指を0.3秒止めて正しくREADYになったか、
(2) 大きな円を描いて最後まで追従できたか、
(3) 予期しない開始・途切れ・キャンセル数、
(4) 手と描画のズレの自覚（1〜5）、
(5) スコアと楽しさ（1〜5）。意図的に手を外へ出して回復も確認。

SOFT SERVEは装着開始前に意図的な短い遮蔽と長い遮蔽を各10回行い、
**短い遮蔽で成功が増え、長い遮蔽による誤装着が0**であることを確かめる。
顔が見えない食事フェーズでの挙動も退行していないか確認する。

| ゲーム | 端末/条件 | 入力成功/10 | 誤判定 | 反応遅延1-5 | 快適さ1-5 | 結果 |
| --- | --- | --- | --- | --- | --- | --- |
| MARU A | A401OP / 未測定 | — | — | — | — | 未実施 |
| MARU B | A401OP / 未測定 | — | — | — | — | 未実施 |
| SOFT SERVE | A401OP / 未測定 | — | — | — | — | 未実施 |

## 次の研究

barehandsに倣って正しいポーズ/誤認しやすいポーズの比率メトリクスを
短時間サンプリングするツールを別タスクで整える。ただし比率の境界を無断で真似たり
`D`/ `P` 操作を丸ごと転記したりしない。計測を先にし、手の見え方、左右、
距離、照明を記録してから製品版の閾値を決める。
`?debug=1` は開発中のみ使い、撮影動画や公開プレイ画面には識別データを重ねない。

## 検証

- `node --test test/handPointStabilizer.test.js test/softServe.test.js test/maruMagic.test.js`
- `npm test`
- `npm run build`
- GitHub Actionsの Hand input checks が緑になった後、A401OPで比較。
- 自動テストと合成入力だけでは認識精度・遊び心地の保証にならない。
