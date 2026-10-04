# CREATOR MODE v0.2 / AUTO DIRECTOR

2026-10-04。対象はEXP-044 SOFT SERVE。添付された
[実装仕様](specs/CREATOR_MODE_V02_AUTO_DIRECTOR_TASK_V01.md)に基づくローカル実装。
Android/iOSの実機カメラと5プレイの人間観察は未完了。

## 遊びから共有まで

- 入口のPLAY / CREATORとORIGINAL / EFFECT / HIDEを維持。カメラ映像から共有動画を作ること、端末内で処理することを開始前に表示。
- 最後の一口成立がHERO。成功時刻を即記録し、その後もカメラと顔追跡を約3秒継続する。
- 12秒のリングバッファと、最初のクリーム・フック・主要イベント・失敗の保存区間を組み合わせる。HEROの約5秒前から3秒後を保持。
- 終了時に映像を自動編集。15 SECは最大15秒で、映像の量によって短くなる。7 SECは準備・一口・リアクションを実時間でつなぐ。
- 冒頭はプレイ映像と短いTWIST!。通常より強い演出はHEROの短いズーム・DELICIOUS!・粒子・生成SEに限定。リアクション中はHUDと大型の終了演出を静かにする。
- 最後に約1.5秒のSOFT SERVE / CAMERA GAME #044 / PLAY。練習動画は練習の表示を残す。
- 結果で自動リプレイ、15 SEC / 7 SEC切替、REPLAY、SHARE、保存、RETRY。編集UIは設けない。
- ネイティブエンコードはゲーム終了後。生成中もCanvasリプレイで確認でき、完成後は実際の動画ファイルを再生する。
- ファイル共有に対応する環境ではWeb Share、それ以外では動画ダウンロード。動画非対応環境には明示した上でCanvasリプレイを残す。
- HEROがなくてもBIG_SUCCESS → COMBO → NEAR_MISSの順で選び、最終的な失敗がある場合は崩壊とリアクションも残す。

## 責務と共通API

| 所有者 | ファイル | 役割 |
| --- | --- | --- |
| GAME | `src/softServe/directorEvents.js` | 操作・積層・完成・傾き・一口・失敗という事実だけを通知 |
| EVENT | `src/creator/DirectorEventBus.js` | 共通10イベント、購読、時刻・優先度・スコア・metadata |
| RECORDER | `src/creator/DirectorRecorder.js` | 12秒バッファ、重要区間の保持、圧縮と負荷調整 |
| DIRECTOR | `src/creator/AutoDirector.js` | HERO優先、フック、前後の区間選択、15/7秒の構成 |
| PROFILE | `src/creator/profiles/softServeDirector.js` | ゲーム番号、優先順位、反応時間、短い文言 |
| COMPOSER | `src/creator/ClipComposer.js` | 実フレームの再生、軽いHERO演出、エンドカード |
| EXPORT | `src/creator/Export.js` | Canvas streamとMediaRecorderで動画Fileを生成 |
| RESULT | `src/creator/CreatorResult.js` | 自動生成、実ファイル再生、共有、取消・破棄 |

```js
creator.event({
  type: "HERO",
  timestamp: activePresentationMilliseconds,
  score,
  metadata: { outcome: "clean" },
});
// event() はHERO時に markHero(timestamp) も実行する。
```

時刻とprofileのdurationはミリ秒。動画の編集ロジックはゲームのルールに置かない。
既存NOTE EATER / BODY WINGSは従来のhighlight / Replayを利用し続ける。
`profile.director`を持つゲームだけがv0.2の録画と編集経路を使用する。
LOOPはゲームが`metadata.loopable=true`で通知した場合に2〜4秒のplanを作れる。
SOFT SERVEの結果にはLOOPボタンを出していない。

## 保存・負荷・プライバシー

- カメラは1ストリーム。MediaPipeの入力モデル、20Hzの推論上限、判定・得点ルールは従来どおり。
- 通常PLAYではCreatorMode / Recorder / MediaRecorderのインスタンスを作らない。
- 標準内部映像は540×960、保存フレームは最大12fps。圧縮呼出しが8msを超えたり、完了が55msを超えたりした場合は270×480・8fpsに落とす。保存区間は時間を維持して間引く。
- 圧縮フレームは24MiBを目安に上限管理。圧迫時は時間範囲を削らずサンプリングを減らす。
- 顔モードを適用した共有用フレームだけをメモリに保存。動画・生画像・顔特徴量はlocalStorage/IndexedDB/外部サーバーへ保存しない。
- 顔モードはプレイ中に変更可能。変更後に収録するフレームに反映する。途中変更時の結果は使用した全モードを表示し、共有前に映像を確認できる。
- HIDEは追跡不明・古い顔・複数顔の場合にカメラを表示しない。実顔の遮蔽範囲は実機で検証する必要がある。
- localStorageのCreator metricsは8種類の回数と固定のモード・尺・入力元だけ。イベントmetadataや映像は保存しない。
- 再挑戦・退出・pagehideでエンコード、ストリーム、RAF、Blob URL、復号bitmap、保存フレームを破棄。言語変更時は生成済みファイルを再利用できる。
- MP4(H.264/AAC)を優先し、非対応時はWebMなどへfeature detectionで切り替える。音声はHERO用の生成SEのみで、カメラのマイクとBGMは録音しない。
- バックグラウンド中はエンコードと時計を停止。音声トラックは冒頭から連続した時計を持たせ、遅れて音が始まることで先頭映像の時刻が落ちる問題を修正。

APIの根拠: [Canvas captureStream](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream)、
[MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)、
[Web Share](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share)。

## 検証記録

- `npm test`: 285件成功。新しい11件でイベント通知、一口の一回性、12秒とHERO前後の保持、上限時の間引き、HERO強制採用、15/7秒の反応保持、失敗fallback、LOOPのopt-in、codecと共有可否を確認。
- `npm run build`: Vite / PWA成功。既存の音楽chunkにサイズ警告が残る。
- `scripts/qa/soft-serve-auto-director.js`: Chromeの実MediaRecorder + 合成カメラで23項目。HERO前約5秒と後約3秒、カメラの反応中の継続、実ファイル再生・保存、RETRY、退出、通常PLAYを確認。360×800 / 720×1280 / 1440×900で横あふれなし、画像を目視確認。
- ネイティブ動画の計測: 標準版12.427秒 / 約1.0MB、短縮版6.921秒 / 約382KB、いずれも540×960のMP4。ffprobeでH.264/AACと時間を確認。動画の連続サンプルでTWIST! → 巻く → 食べる → 反応 → END CARDを確認。
- `scripts/qa/soft-serve-director-edges.js`: 9項目。失敗クリップ、15/7のFile共有（共有APIはstub）、非対応エンコーダー、生成中の退出を確認。ブラウザエラーなし。
- `soft-serve-creator.js`: ORIGINAL / EFFECT / HIDEの3モードで41項目成功。顔処理・9:16・リプレイ・モード保持・再挑戦を確認。Native動画は別の実時計のQAが担当。
- `soft-serve-creator-production.js`: ビルド版の公開マウス操作で8項目成功。4段以上を巻き、完食、標準版・7秒動画の実再生、RETRYと退出を確認。
- `soft-serve.js`: ビルド版の通常PLAYで31項目成功。マウス・タッチ・キー、pause、結果・RETRY、JA/EN、360×500を含むスクロールを再確認。

成果物は`output/playwright/autodirector-*`。合成顔は図形であり実カメラ品質の証拠ではない。

## 残っている人間・実機の確認

最低5プレイを[プレイテスト表](CREATOR_MODE_V02_PLAYTEST.md)に記録する。
Android Chromeの入力FPS・発熱・顔の遮蔽・実際の共有先、iOS Safariのcodec/共有を確認する。
「動画だけで操作が伝わる」「冒頭に見る理由がある」「そのまま送りたい」は人間の観察項目であり、自動QAの成功から合格と扱わない。
