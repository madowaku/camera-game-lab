# Generated media pass v0.1

2026-10-03。Camera Input Reliability Matrixの対象15本へ、画像生成モデルの素材とOpenTracksのゲーム用BGMを導入。

## 画像

- 15本それぞれに新しい看板絵を生成。粘土・紙・陶器・布のミニチュアを共通の質感にし、FEED、EXPLORE、開始画面、共通結果画面へ実装。
- HAND BEATの4ジェスチャー、EAT / DON'T EATの12アイテム、TINY BOT DUELの2体、だいたい勇者のキャラクターも生成素材へ変更。透過を保った4ファイルのアトラス／スプライトから描画する。
- SOFT SERVEの看板絵は「手のひらの中央で支える」構図。実プレイのクリームと結果の作った形はゲーム状態からCanvasで描く。
- 看板絵は各768×768 WebP。15枚で1,552,740 bytes。プレイ素材を含めた19画像で2,458,734 bytes。FEEDは表示範囲だけ読み込み、プレイ素材は各ゲームのロード後に取得。
- 各生成プロンプト、元ファイル、生成日、変換設定、SHA-256は [看板絵](generated-artwork.json) と [プレイ素材](generated-sprites.json) に保存。元PNGは生成ツールの保存先と、ローカルの `output/imagegen/originals/` に保持。公開用WebPは `public/artwork/`。
- 今回の対象は当初の15本。別途追加されたNOTE EATERの既存素材と、自分で曲を作る音の設計は維持。

カメラ上に重なる図形、動的な形状、その他のゲーム内素材には既存のCanvas／SVG描画も残っている。全ゲームの全素材を生成画像へ置き換えたものではない。

## BGM

| 曲 / 作者 | 使用ゲーム |
| --- | --- |
| [8-bit Aggressive1](https://opentracks.com/bgm/detail/1978) / もっぴーさうんど | FINGER GUN（既存音源を共通プレイヤーへ移行） |
| [8-bit Stage1](https://opentracks.com/bgm/detail/1982) / もっぴーさうんど | TINY BOT DUEL、GUARDIAN SPIRIT、WATERMELON GUIDE、だいたい勇者、NOTE BLASTERの練習 |
| [みるくぷりん](https://opentracks.com/bgm/detail/16072) / キュス | EAT / DON'T EAT、PINCH WORLD、FALSE BRIDGE、THE CAMERA IS IT、SOFT SERVE |
| [不穏ROOM](https://opentracks.com/bgm/detail/9957) / MAKOOTO | BLINK HORROR、GHOST TRAIL、FRAME SMUGGLER |

2026-10-03に [OpenTracksの音源利用ライセンス](https://opentracks.com/help/articles/license/) と各作者の利用条件を確認。商用ゲームの背景音楽と加工が許可されているサイト準拠の曲を選定。作者・配布元はゲーム情報と遊び方に表示。[ライセンス記録](../src/assets/music/LICENSE.md) と [原音／加工後のハッシュ・加工設定](opentracks-music.json) を保存。

音源はゲーム開始のタップで遅延読み込み。Viteの `?inline` でゲーム用JSに同梱し、productionの `dist/` に単体MP3を出力しない。音源だけのダウンロード、鑑賞機能、CREATOR録画へのBGM書き出しは提供しない。

共通BGM ON/OFFは端末内に保存。ゲームの一時停止、追跡ロストによるゲーム停止、背景化、結果、退出では停止し、再開時は曲の続き、RETRYは曲の先頭から始める。遅いロードが退出後に再生を始めることも防ぐ。

HAND BEATは別テンポの曲が誘導を邪魔しないよう既存のビート音を使用。NOTE BLASTERの歌うモードはマイクへの回り込みを避けてBGMを停止。NOTE EATERは既存のprocedural音楽を使用。

## 検証

- 全249ユニットテスト成功。production build成功。単体MP3の出力がないことも確認。
- `scripts/qa/generated-media.js`: 69項目成功。実WebPのdecode、スマホ／PC幅、PLAY前の無音、実MP3のdecodeと音のサンプル、BGM ON/OFF、pause、結果、RETRY、退出、歌うモード／練習の切替、実ゲームの生成スプライト描画を確認。
- `scripts/qa/quality-alignment.js`: 84入口と9ゲームの練習ラウンド、結果、共有、RETRYなど653項目をproduction previewで確認。
- `scripts/qa/input-reliability.js`: 合成モデル出力によるP0入力の90項目を再確認。
- 実画面はローカル `output/playwright/generated-*.png`。入力の人間テスト、実機のカメラ・音量・スピーカー特性の評価は別途必要。

長い音源を単体配信しない構成のため、BGMの遅延JSには通常の500kB chunk警告が出る。初期画面には読み込まず、1ラウンドで選ばれた曲だけを取得する。
