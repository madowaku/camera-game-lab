# Quality alignment — first pass, 2026-10-03

SOFT SERVEを基準に、ほかの14ゲームの入口・遊び方・結果の品質を揃えた。
今回の完了範囲は初見の理解、画面の構成、再挑戦・共有の導線。
全ゲームのプレイ演出や実カメラの遊び心地が同等になったという評価ではない。

## 実装

- 全14ゲームに固有のSVGイラスト、チャレンジ文、3つの操作、PLAYを用意。
  JA / ENの遊び方は共通sheetで開き、閉じると操作元へfocusを戻す。
  前後カメラ、基準の声、口の開閉の再準備など、実際の操作条件を説明する。
- Feed / Exploreの13個の記号プレビューも同じ場面イラストに更新。
  HAND BEATは既存画像を使い、入口には新しいイラストを用意した。
  プレビューに推論モデル、ゲームimport、センサー開始、描画loopを追加していない。
- 共通結果はゲーム画面より前に出し、重複した成績を整理。
  実際の勝敗・失敗・時間切れ、実測値、練習の区別を表示する。
  主操作はRETRY、その次に友達への挑戦状とNEXT GAME。
  0と未測定を区別し、カメラの向きで道を作るゲームに架空の得点を出さない。
- TINY BOT DUELの各プレイヤーの命中数と時間を結果adapterに保持。
  DUOのfallbackとだいたい勇者のTAPをdemoへ正規化し、再挑戦と共有に引き継ぐ。
- GUARDIAN SPIRITのPHOTO MODE / 写真保存、FRAME SMUGGLERの役割交代 / 調査票、
  DUOのplaytest / JSON exportは元のcontrollerが引き続き所有する。
- HAND BEATの4ジェスチャー、EAT / DON'T EATの12品をSVGで描画。
  イラストの更新は対象が変わったときだけ。品名と元の判定ルールは維持する。
- FINGER GUNはプレイ中の大きな中央アイコンを消し、説明を射撃領域の下へ移動。
  初期3ゲームの縦画面、得点表示、プレイ中の不要な開始ボタンも整理。
- SOFT SERVEの専用画面、Creator、形成・口接触・リプレイには変更を加えていない。

主要な所有者:
`src/platform/gameArtwork.js`, `gamePresentation.js`, `gamePresentation.css`,
`shell.js`, `launcher.js`, `share.js`, `src/solo/illustrations.js`, `soloPolish.css`。
新規依存、外部素材、外部フォントなし。

## 検証

- `npm test`: 217 / 217。新規に失敗・時間切れ・中断、0と未測定、勝敗と実測値、
  practiceの引き継ぎ・共有を検証。
- `npm run build`: Vite / PWA成功。
- `scripts/qa/quality-alignment.js`: production previewで653項目成功。
  14ゲーム × JA / EN × 390×844 / 360×500 / 1440×900の84入口。
  イラスト、横幅、PLAYへの到達、3手順、sheetのfocus復帰、明示操作前のセンサー未開始。
- 同scriptで9ゲームの実controllerによる練習ラウンド、実結果、source付き共有、RETRY、
  PHOTO MODE、役割交代ボタン、DUOの記録導線を確認。リソース失敗・pageerrorは0。
- `scripts/qa/platform-camera.js`: 390×844で13項目成功。
  初期3ゲームの合成カメラ入力、描画、完走、モデル・trackの解放、カメラ再取得、
  NOTE BLASTERのカメラ・マイクの離脱時解放を確認。
  既存の言語依存のstatus照合をdata-state照合へ直した。
- `scripts/qa/platform-demos.js`: 720×1280で既存4ゲームの完走 / RETRY成功。
- 実画面の証拠は `output/playwright/quality-*.png`（gitignore）。
  生成した理想画像を検証の証拠として扱っていない。

## 残る品質確認

Android / iOSの実カメラ、発熱、追従速度、入力の公平さ、音、
ふたりの位置関係や声の個人差は今回の合成入力チェックでは確認していない。
各ゲームの既存playtest gateも未達のまま。
次のゲーム個別の仕上げでは、実機の入力感触と成功・失敗時の動きや音を基準に評価する。
