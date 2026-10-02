# Platformization Sprint v0.1

実装・検証日: 2026-10-02。ホームを縦スクロールの LAB FEED に変更し、既存の8ゲームを共通ランチャーから起動する構成にした。Vite / Vanilla JS / MediaPipe / PWA / Cloudflare の構成を維持。ゲームの採点・入力判定・ラウンドルールは変更していない。

## 1. 変更ファイル

| ファイル | 役割 |
| --- | --- |
| `src/main.js` | PWA登録とプラットフォーム起動だけに縮小 |
| `src/solo/soloExperience.js` | 元main.jsのSOLO画面をコントローラーとして抽出。ライフサイクルと遅延BGM読み込みを追加 |
| `src/platform/experiments.js` | 8ゲームのRegistry、表示metadata、alias、lazy loader、検証 |
| `src/platform/shell.js`, `launcher.js` | 画面遷移、起動前説明、既存ゲームの互換アダプター、共通結果 |
| `src/platform/feed.js`, `preview.js`, `explore.js` | snap feed、軽量プレビュー、検索・フィルター |
| `src/platform/navigation.js`, `copy.js`, `platform.css` | route、JA/EN、デザイン・safe area・motion |
| `src/platform/storage.js`, `favorites.js`, `recent.js`, `ordering.js` | 端末内設定・履歴・フィード順序 |
| `src/platform/share.js`, `events.js` | 共有adapter、外部サービスなしのevent layer |
| `public/previews/hand-beat.webp` | 生成したHAND BEATプレビュー。720角、32,698 bytes |
| `public/previews/README.md`, `DESIGN.md`, この文書、`README.md` | 素材の出典、デザイン、保守・検証記録 |
| `index.html`, `vite.config.js` | テーマ色、PWAの遅延ゲームを先読みしないキャッシュ設定 |
| `test/platform.test.js`, `package.json` | 追加16テスト、正規の`test/*.test.js`だけを実行 |
| `scripts/qa/platform-*.js` | 再現用Playwright CLIブラウザーQA |

`src/games/`、既存のDUO / GUARDIAN / DAITAI / OUTCAM / NOTE BLASTERのゲーム実装、入力判定モジュール、Cloudflare設定は変更していない。

## 2. Architecture

```text
main.js → shell
            ├─ Registry → Feed / Explore → 軽量poster / image / silent video
            ├─ local favorites / recent → 純粋なorderFeed()
            ├─ share adapter / local events
            └─ PLAY → 選択したRegistry.load() → lazy game module
                       └─ 理由の説明 → 明示的に開始 → sensor/model → calibration → game
                                                                      └─ result adapter
                                                                         RETRY / NEXT / SHARE
```

ゲームのJSはPLAYまたはゲームのdeep linkで初めてimportする。モデルとカメラ・マイクは起動説明画面の開始ボタンまで開始しない。既存モジュールにあるセンサー初期化・キャリブレーションを利用し、準備完了後の旧STARTボタンをアダプターが押す。デモは既存のdemo / touch / keyboard経路を利用する。

コントローラーはモジュール単位で1個だけ保持し、既存のwindowリスナーを重複登録しない。非表示時はdeactivateとreleaseを呼ぶ。非同期import・カメラ許可はgenerationで無効化。結果表示時にも入力とモデルを停止し、RETRYは再取得・再キャリブレーションする。GUARDIANのPHOTO MODEだけは明示的なPHOTO操作でカメラを再取得する。

フィードのリスナーは離脱時にAbortControllerで解除する。非表示になったフィードのscrollイベントが、ゲーム中にfeed_viewを発火したり選択位置を書き換えたりしない。

PWAのprecacheはシェルJS、CSS、HTML、軽量画像。ゲームJS、MediaPipeライブラリー、BGMをprecacheしない。訪問したゲームの同一origin JSのみruntime cacheに保存する。モデルの完全オフライン利用は今回保証しない。

## 3. Feed UX

- 360×800 / 720×1280で1画面1ゲーム。CSS scroll-snap、上下スワイプ、ホイール、矢印・PageUp/Down・Home/Endに対応。
- 短い説明、入力、人数、時間、大きいPLAY。詳細はINFOのnative dialogへ。SNSやアカウント機能なし。
- ローカルのfavorite、Web Share→clipboard→選択可能なテキストの共有fallback。
- 最初のスワイプまたは案内ボタン・ゲーム操作で初回案内が消え、再表示しない。
- 現在と前後1枚だけアニメーション。非表示タブ・reduced motionでは停止。動画adapterもmuted / playsinline、非activeでpause・src解放。
- asset未指定なら入力に応じたSVG poster。現段階ではHAND BEATのみ生成画像、残りは軽量SVG/CSS。
- FEED / EXPLOREだけの小さいナビゲーション。検索、5カテゴリ・7入力フィルター。該当なし、通信失敗、不明URLにも復帰導線あり。
- 短い高さ・拡大表示では680px以上のカードを自然にスクロールでき、実際のカード位置にsnapする。モーダルのEscape・フォーカス復帰、44px以上の主要操作、safe-area、色以外の選択状態に対応。
- 共通結果のNEXT GAMEは1タップで次のカードへ戻る。並び順は滞在中に固定し、favorite操作でカードが飛ばない。

## 4. Registry schema / ゲームの追加

| フィールド | 型・用途 |
| --- | --- |
| `id`, `slug` | 意味のある一意の文字列。EXP番号を主キーにしない |
| `titleJa/En`, `subtitleJa/En` | 言語別のタイトル・短い説明 |
| `route` | `#/game/<slug>`。define()が生成 |
| `exp`, `collection` | 表示番号と名前空間。番号衝突を許容 |
| `category` | SOLO / DUO / OUTCAM / VOICE / PHOTO / AR（最後は1つのカテゴリ文字列） |
| `input` | HAND / FACE / BODY / VOICE / BLINK / MOUTH / PINCH の配列 |
| `players`, `duration`, `orientation` | 人数、秒、portrait / landscape / any |
| `status`, `featured`, `tags` | 公開状態、優先表示、検索タグ。feedはplayableのみ |
| `previewType`, `previewAsset`, `motif`, `accent` | poster / image / video、asset URLまたはnull、図形、色 |
| `requiresCamera`, `requiresMicrophone`, `demo` | 入力要件、デモの有無 |
| `aliases` | 旧hash一覧 |
| `module`, `mode`, `load` | コントローラーのキャッシュキー、SOLOモード、dynamic import factory |

新しいゲームは独立モジュールを実装し、Registryに1件追加する。Feed・Explore・検索・共有URLの追加変更は不要。

新規モジュールには次の契約を推奨する。

```js
// Registry entry
load: () => import('../newGame/view.js').then(m => m.createView)

// createView(root, locale, { onExit }) が返すcontroller
{
  activate(mode) {}, deactivate() {}, setLocale(locale) {},
  startCamera() {}, startDemo() {}, releaseInputs() {},
  snapshot() { return { phase: 'idle', source: 'camera', result: null }; },
  subscribe(onChange) {}
}
```

`snapshot()`のphaseはidle / calibration / countdown / playing / result等。resultにはscoreと任意のaccuracy、summary等を渡せる。subscribeは状態更新を通知する。既存クラスはrender・phase・game.resultを読む薄い互換adapterで対応。必要ならRegistryの`startSelector` / `demoSelector`で旧ボタンを指定できる。deactivateは遅いpermission応答も含めて入力・タイマー等を解放すること。

share adapterの`resultPayload(game, { score, summary, image }, locale)`はゲーム名・スコア・短い結果文・canonical URLを保持。任意のimageはFile。将来Canvas等で720×1280画像を先に生成し、クリック時のWeb Share user activationを保ったまま渡せる。全ゲームの画像出力は今回未実装。

イベントは`window`の`camera-lab:platform` CustomEvent、または`createEvents().subscribe()`で購読可能。`feed_view`, `feed_swipe`, `game_play`, `game_start`, `game_complete`, `game_abort`, `retry`, `next_game`, `favorite`, `share`を送る。devのみconsole logger。外部送信・ユーザーIDは追加していない。

順序付けはfeatured・favorite・未プレイを加点し、直近プレイを減点、同カテゴリの連続を抑制する純粋関数。履歴は最新50件、IDごとに重複排除。localStorageが使えなくてもそのセッション内では動作する。

## 5. Backward compatibility

| 旧リンク | canonical id |
| --- | --- |
| `#hand-beat`, `#handBeat` | `solo-hand-beat` |
| `#finger-gun`, `#fingerGun` | `solo-finger-gun` |
| `#eat-dont-eat`, `#eatDontEat` | `solo-eat-dont-eat` |
| `#note-blaster` | `voice-note-blaster` |
| `#duo` | `duo-tiny-bot-duel` |
| `#guardian` | `guardian-spirit` |
| `#watermelon` | `outcam-watermelon-guide` |
| `#daitai` | `solo-daitai-hero` |

旧URLはゲームの起動前画面へ直接入る。新しい共有URLは`#/game/<id>`。`#`, `#/`とトップはFeed、`#/feed/<id>`は選択カードのFeed。DUOとGUARDIANのEXP-020は異なるIDで共存。未実装のDUO候補ゲームはplayableとして登録していない。

言語キー`camera-game-lab-locale`と既存ゲームのmetricsキーは維持。追加データは`camera-game-lab-platform-*-v1`。PWA manifestとCloudflare deployment構成を維持し、本番へのdeployは行っていない。

## 6. Tests / 再現方法

`npm test`: **107 / 107成功**（既存91 + platform16）。Registry validation、重複ID、canonical/alias解決、favorites、壊れた/拒否されたstorage、最近の履歴、純粋な順序付け、Web Share/clipboard/manual fallback、イベント、遅延importのキャンセル、切替・再試行時の解放、DUOのsnapshot名衝突を検証。

`npm run build`: 成功。初期シェルJSは約60kB（gzip約23kB）、ゲームとMediaPipeは別chunk。`git diff --check`: 成功。

ブラウザーQAは専用の破棄可能なChromeプロフィールで実行する。discoveryスクリプトはplatform設定を初期化するため、日常利用のプロフィールでは実行しない。Chrome、Node、ネットワーク経由のPlaywright CLIが必要。

```powershell
npm ci
npm run dev -- --host 127.0.0.1
# 別ターミナル。output/playwright を用意してから実行。
New-Item -ItemType Directory -Force output/playwright
npx --yes @playwright/cli -s=camera-platform open http://127.0.0.1:5173/
npx --yes @playwright/cli -s=camera-platform run-code --filename=scripts/qa/platform-discovery.js
npx --yes @playwright/cli -s=camera-platform run-code --filename=scripts/qa/platform-camera.js
npx --yes @playwright/cli -s=camera-platform run-code --filename=scripts/qa/platform-recovery.js
npx --yes @playwright/cli -s=camera-platform run-code --filename=scripts/qa/platform-demos.js
```

`platform-camera.js` / `platform-recovery.js`はVite devのモジュールを利用してMediaPipe推論・permission応答を差し替える。カメラテストではCanvas/AudioContextの実際のMediaStreamTrackに対するstopを確認する。デモはPlaywright clockでラウンドの経過を進める。

Frontend Design Premiumのstrict静的監査は`affordance.actionless-button`を12件報告した。監査器がテンプレート内のonclick等だけを探すため、既存5件・新規7件のvanilla JS event delegationを認識できない。実際のリスナーとブラウザー操作で照合し、偽のonclick追加や抑制はしていない。静的監査自体を「全件成功」とは扱わない。DESIGN.md lintは0 errors / 3 warnings（frontmatterの未参照色token）。npm ciの依存監査は既存3件（moderate 2 / high 1）を報告。今回依存バージョンは変更していない。

## 7. Mobile / browser QA

Windows Chrome headlessを操作し、スクリーンショットも目視確認。物理スマートフォンでのテストではない。

| ケース | 結果 |
| --- | --- |
| 360×800 / 720×1280 / 1440×900 | ホーム、1画面1ゲーム、画像・PLAY、横はみ出しなし |
| 縦移動 | touch eventによるswipe、wheel、keyboard、snap、初回overlayの消去 |
| 360×500 | 短いviewportでも正しい次カードと到達可能なPLAY |
| JA / EN | 切替・位置維持・各言語の表示 |
| favorite | 変更とreload後の保持 |
| Share / INFO | canonical URL、結果score、clipboard代替、Escape、フォーカス復帰 |
| Explore | 検索・clear・入力filter・空状態 |
| DUO orientation | portraitで説明、landscapeで消去 |
| 結果 | 既存のdemoモードで完了・RETRY・NEXT。共通結果導線を追加 |
| SOLO全3本 | 合成入力で自動開始→結果。EAT / DON'T EATは合成の閉じた口でcalibrationも通過 |
| リソース | 合成カメラ/マイクでresult・back・retry時のtrack停止とモデルclose |
| エラー・遅延応答 | permission拒否からの再試行操作、離脱後の遅い許可解放、import失敗→reload復帰 |
| 遅延読込 | feedスクロールではゲームJS / MediaPipe / cameraを開始しない |
| motion | reduced motionでactive previewを停止 |
| production PWA | シェルcache登録、game JSのprecache除外、offlineでFeedと画像の再読込、lazy DUO起動 |

証跡は`output/playwright/platform-*.png`（gitignore対象）。ブラウザーQAで見つかった位置復帰、DUO snapshot衝突、非表示Feedの残存リスナーを修正済み。

production PWA確認は別プロフィールで`npm run preview -- --host 127.0.0.1 --port 4173`に接続し、`scripts/qa/platform-production.js`を実行した。discovery 34項目、camera 10項目、recovery 8項目、demo 8項目、production 8項目が成功。負のテストで意図的に発生させたfetch / permissionエラーは想定どおりで、通常のUI・デモQAに未処理のpage errorはなかった。

## 8. 未検証事項・今回の境界

- 実機iOS Safari / Android Chrome、ノッチの実safe-area、実カメラ/マイク許可UI、実MediaPipe推論・低照度・二人の追跡・音声校正・ゲームの体感。合成入力の成功から実機品質を推定しない。
- OSのWeb Shareシート、ファイル共有、TikTok等への投稿は実施していない。Web Share adapterはmockによる分岐テスト。
- インストール済み旧PWAからの更新、実機オフライン・バックグラウンド復帰の全パターン、スクリーンリーダー実機、日本語の第三者レビュー。
- HAND BEAT以外の3秒動画、全ゲームの縦長result imageは未実装。追加できるadapterを用意。
- 画像は提供された組み込みimagegenで生成。モデルを選択・確認するパラメーターがないため、指定された「imagegen2.5」であることは確認できない。

## ローカル確認

開発: `http://127.0.0.1:5173/`。production bundle: `npm run build`後に`npm run preview -- --host 127.0.0.1 --port 4173`を実行し、`http://127.0.0.1:4173/`を開く。

デザイン参照は[Frontend Design Premium](https://github.com/TryHand-Co-Ltd/frontend-design-premium)と[UI/UX Design Library](https://github.com/justinhartman/ui-ux-design-library)。後者はUI/UX関連書籍の参照インデックスとして確認し、本文や画像を製品へ転載していない。
