# Camera Input Feel Layer v0.1

実装日: 2026-10-07。元の[Draft仕様](specs/CAMERA_INPUT_FEEL_SPEC_v0.1.md)を保存。
STEP 1〜5を実装。A401OPの実機評価、パラメーターの採用判断、SOFT SERVE実験は未実施。

## 共通API

`src/inputFeel/index.js`からimportする。外部依存、DOM、MediaPipe、描画依存はない。
時間はすべて**秒**。座標・速度の単位は呼び出し側が統一する。

| API | 契約 |
| --- | --- |
| `exponentialSmooth(current, target, dt, tau)` | 時定数tauの指数平滑。tau=0で即時追従 |
| `smoothVec2(current, target, dt, tau, out?)` | XYを平滑化。out指定で保存先を再利用できる |
| `applyDeadZone(value, zone)` | [-1,1]入力。外側を再正規化。zone=1は全域ニュートラル |
| `responseCurve(value, exponent)` | 符号を保持する累乗。入力を[-1,1]へ制限 |
| `createSpring1D/2D(options)` | `update(target, dt)`、`reset(value?, velocity?)`、`state: {value, velocity}` |
| `createInertia1D/2D(options)` | `push(impulse)`、`update(dt)`、`reset(position?, velocity?)`、`state: {position, velocity}` |
| `magneticSnap(position, target, options, out?)` | `{x,y,state}`。空間マッピングであり時間フィルターではない |

Springはfrequency（Hz、既定12）、damping（減衰比、既定1）、maxVelocity、
初期valueを受け取る。1D/2Dのupdateは同じstateを返す。2Dのvalue/velocityも
再利用する。減衰系は解析解で進め、過減衰・臨界減衰・不足減衰を扱う。
速度上限を指定した場合は速度と1回の移動距離を制限するため、その区間は近似になる。
既定ではオーバーシュートせず、処理停止による長いdtを短いdtへ切り捨てない。

Inertiaはfriction（1/秒、既定5）、maxVelocity、stopThreshold（既定.001）、
初期positionを受け取る。impulseは速度への加算。速度だけでなく移動距離も
指数減衰の解析解で求め、停止閾値へ到達した時点の距離まで積分する。
friction=0も扱う。2Dの速度上限・停止閾値はベクトルの大きさへ適用する。

時間関数にdt<=0、NaN、Infinityを渡すと状態を保持する。
無効なtargetは無視する。無効な物理設定はRangeError。
座標の信頼性、手の所有者、校正、追跡ロストの判断はゲームのReliability側に残す。

### Snapの状態と復帰

radius内でATTRACTED、snapRadius（既定radius×.15）内でSNAPPED。
strengthは0〜1で、0なら吸着しない。radiusの境界で吸引量が0になる。
次の**未補正入力**を使い、前回のstateをoptions.stateで渡す。
一度捕捉するとreleaseRadius（既定radius×1.4）を超えるまで捕捉状態を保つ。
追跡ロストやターゲット変更時はゲーム側でstateをFREEに戻す。
前回の吸着座標を入力すると解放できなくなるため、必ず生の位置から距離を測る。

```js
import { createSpring2D, magneticSnap, SNAP_STATES, FEEL_PRESETS } from '../src/inputFeel/index.js';

const follower = createSpring2D(FEEL_PRESETS.softFollow);
follower.reset({ x: .5, y: .5 });
const { value } = follower.update(stableHand, dtSeconds);

let snapState = SNAP_STATES.FREE;
const snapped = magneticSnap(stableHand, nozzle, { radius: .1, state: snapState });
snapState = snapped.state;
// On loss: snapState = SNAP_STATES.FREE; follower.reset(reacquiredHand).
```

Presetはfreeze済みの少数の設定。`direct`（tau=0）、`steering`（tau=.07、
zone=.2、exponent=.85）、`softFollow`（7Hz、damping=1）、`sport`（tau=.012、
maxOffset=.08）、`inertial`（friction=5）。用途に必要な関数だけを選ぶ。
sportのmaxOffsetはPALM PONGでcourt単位。他のゲームでは適切な単位へ調整する。
設定は実機で調整する出発点であり、快適さを実測した数値ではない。

## ゲーム統合と多重平滑化の扱い

### TILT TURBO

Reliability: カメラ画素からの頭部roll、650msの安定校正、フレーム鮮度、ロスト。
Feel: 既存の70ms平滑を`exponentialSmooth`へ置換し、±5°のdead zone、
25°full scale、exponent=.85を共通関数へ移行。
既存の16ms最小サンプル間隔、ロスト後のfiltered保持、車体110ms追従、
ロスト時の450msセンタリングは維持。追加フィルターはない。

`?debug=1#tilt-turbo`でRAW=検出roll（度）、STABLE=校正・平滑後roll（度）、
FEEL=最終steering（-1〜1）を表示。単位が違うことを明示する。
デモはカメラ認識を通らないのでRAW/STABLEは同じ。
stale/lost時は3値をLOST表示にし、以前の数字を最新値として見せない。

重さのあるsteering + springの比較は次段階。
既存の車体追従の上に無条件でspringを足すと遅延が重なるため、
実機で従来版を確認してから、車体追従を置き換える実験として設計する。

### PALM PONG

Reliability: PalmTrackerの所有者、jump rejection、60ms平滑、40ms遅延補間を維持。
Truth: 従来と同じTracker → CameraInputBridge → 固定120Hz判定へ渡す。
Visual A: 従来の描画位置を維持。既定。
Visual B: sportの12ms追従。入力とのズレを.08court単位以内に制限する。
追加の平滑は表示だけの明示的な実験。判定位置・速度・スコアへ戻さない。
同じ目的の処理を標準で重ねないため、Bを自動採用しない。

手ロスト/reliable=false時は非表示扱いにし、追いかけ続けない。
再検出、不連続入力、初回は入力位置へresetする。
pause中はBの追従を停止し、再起動・退場・再整列・画面回転で状態を消す。

`?debug=1&feel=A#/game/duo-palm-pong` / `?debug=1&feel=B#/game/duo-palm-pong`。
APIからは`configure({feelVariant:'B'})`、`paddleFeel.options`で調整可能。
Debug HUDは同じcourt座標のRAW（橙）、STABLE（水色）、FEEL（ピンク）と数値を表示。
RAWは所有者候補の観測位置で、判定へ渡す信頼済み入力ではない。
失効時にRAWの古い位置を表示しない。ロストの扱いは両variantで同じ。

## 自動検証

- `test/inputFeel.test.js`: 30/60/120fps、収束、dead zoneと曲線、全減衰型、
  速度/移動上限、慣性の停止距離、.1/1/10秒dt、無効dt、reset、
  snapの進入/解放/hysteresis、合成jitter、表示ズレ上限、A/B判定一致。
- `test/tiltTurbo.test.js`: 変更前に記録した18フレームの校正・ロスト・
  不規則/逆行時間と、共通化後のroll/steeringが1e-12以内で一致する。
- `scripts/qa/input-feel.js`: A/Bが実際のSpriteへ接続されること、Truthとの分離、
  RAW/STABLE/FEEL、pause、ロストと復帰、画面幅、入力・状態の解放を確認する。
- 合成jitterの低下やブラウザーの練習は、人間の快適さ・端末認識率の測定ではない。

検証結果: `npm test` **575件成功**、`npm run build`成功。
Chromiumのbrowser QAは**45項目成功**、browser exceptionは0。
PALM PONGは1280×720 / 390×844、TILT TURBOは1440×900 / 390×844で確認。
PALM PONGの合成カメラ結果は実際の`processResult` → Tracker → Bridge →
Truth / Visualを通り、座標のmirror、ロスト後の表示停止まで確認した。
画面と実行記録は`output/playwright/input-feel-*`（ローカル検証成果物）。

コミット準備時は、他の作業中ゲームを含まないコピーでも確認した。
今回のPALM PONG統合が必要とするPhaser描画基盤・入力Bridge・CSSと、
その既存のPhaser / eventemitter3依存だけを合わせ、**548件のテストとビルドが成功**。
Feel Layer自体には外部依存を追加していない。

## A401OPでの5プレイ比較（未実施）

同じ照明・距離・カメラ設定でA/B各5プレイ。順番はA/Bを交互にし、
操作への慣れによる偏りを減らす。PALM PONGは横向き、TILT TURBOは縦向き。
まずTILT TURBOの従来の操作感が保たれていることを確認し、spring実験はその後。

日付 / ブラウザー / 照明 / カメラ距離 / プレイヤー: 未記入。

| ゲーム / variant / play | 動きと一致 1–5 | 遅れて感じる 1–5 | ガタつく 1–5 | 予測できる 1–5 | また触りたい 1–5 | 意図しないmiss / 感想 |
| --- | --- | --- | --- | --- | --- | --- |
| PALM A 1〜5 | 未実施 | 未実施 | 未実施 | 未実施 | 未実施 | |
| PALM B 1〜5 | 未実施 | 未実施 | 未実施 | 未実施 | 未実施 | |
| TILT 共通化後 1〜5 | 未実施 | 未実施 | 未実施 | 未実施 | 未実施 | |

「遅れて感じる」「意図しないmiss」が増えるならBを採用しない。
数値の滑らかさより手と画面のつながりを優先する。
実機比較後にパラメーターを調整し、SOFT SERVEのsoftFollow / nozzle snap実験へ進む。
