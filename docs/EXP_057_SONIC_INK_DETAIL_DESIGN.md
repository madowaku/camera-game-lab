# EXP-057 SONIC INK
**3D空間に描く、触れる、奏でる。**

## 1. コンセプト

インカメラに映る自分の前へ、指先で光る3Dラインを描く。

描画中は指の動きに合わせて音が鳴り、完成後は描いた線を光の粒が走って、その軌跡を「曲」として再演する。

プレイヤーは絵を描いているつもりなのに、いつの間にか音楽も作っている。

**DRAW = COMPOSE**

を一発で理解できるゲーム／トイを目指す。

---

# 2. 15秒で伝わる完成イメージ

1. プレイヤーが人差し指と親指をつまむ
2. 指先から光る線が空中へ伸びる
3. 指を上下左右へ動かすたびに心地よい音が鳴る
4. ぐるっと円を描く
5. 指を離す
6. 光の粒が描いた線を走り始める
7. 線をなぞりながらメロディが再生される
8. プレイヤーが完成した「音の彫刻」と一緒にポーズ

ゲーム説明を読まなくても、この流れだけで

**「空中に絵を描いたら音楽になるゲームだ」**

と分かる状態が理想。

---

# 3. 基本操作

### 描き始める

人差し指＋親指の **PINCH**

一定時間つまむ必要はなく、安定判定後すぐ描画開始。

### 描く

PINCHしたまま手を動かす。

指先の位置に3Dラインを生成。

### 描き終える

PINCH解除。

線はその空間に残る。

### 再生

描画終了後、自動的にPLAYBACKへ。

光の粒「PLAY HEAD」が線の始点から終点まで走る。

### 消す

左手で「握る」または画面ボタン。

MVPでは誤認識防止のため、

**UNDOボタン**

を標準にする。

---

# 4. 3Dライン

Three.js側では線ではなく、少し太さのある

**Tube Geometry / Stroke Mesh**

として描画する。

ただの細い線よりも、

「空中に存在している物体」

に見えることを優先。

### ラインの特徴

- 発光
- 半透明
- 軽い残光
- 曲線補間
- 描画速度によって太さが少し変化
- 曲率によって色が変化
- 描画終了時に微細な粒子を放出

目標は、

**レーザーポインターではなく、光る飴細工。**

---

# 5. 音楽システム

自由に描いても不協和音にならないことを最優先する。

基本音階：

**Major Pentatonic**

C / D / E / G / A

必要ならオクターブ違いを追加。

## Y座標 → 音程

画面下

C

↓

D

↓

E

↓

G

↓

A

画面上

という5～10段階。

細かく連続変化させず、音階へ量子化する。

そのため適当に描いても旋律になる。

---

# 6. X座標

MVPでは音程に使わない。

Xは主に

**ステレオ定位**

へ使用。

左側に描く<br>
→ 左から音が聞こえる

右側<br>
→ 右

中央<br>
→ CENTER

視覚位置と音位置が一致する。

---

# 7. Z座標

MediaPipe推定の奥行きは不安定になりやすいため、ゲームルールには強く使わない。

ただし視覚演出として、

手がカメラへ近づく<br>
→ ラインが手前へ浮く

遠ざかる<br>
→ 奥へ入る

程度に使用。

音には、

奥側 = 少し柔らかい<br>
手前 = 少し明るい

程度のフィルター変化をつける。

---

# 8. 描画速度

速度は音色へ反映。

ゆっくり描く：

**ふわっ**

速く描く：

**シュン！**

具体的には

- Volume
- Attack
- Brightness
- Particle量

を少し変化させる。

音程そのものは速度で変えない。

プレイヤーが予測できることを優先。

---

# 9. 曲率イベント

ここが気持ちよさ担当。

急な方向転換を検出すると、

**SPARK NOTE**

を鳴らす。

例：

直線<br>
→ ポーン

急カーブ<br>
→ ✨チン！

ジグザグ<br>
→ チン・チン・チン

結果として

「形を描くこと」

そのものに音楽的意味が生まれる。

---

# 10. CLOSED LOOP

線の終点が始点付近まで戻ると、

**LOOP!**

判定。

円、ハート、三角形など。

成功すると、

ライン全体が一瞬発光。

そしてPLAYBACKが

🔁 LOOP再生

になる。

これが本作の最初のAHAポイント。

プレイヤーが自然に

「じゃあ別の形ならどう鳴る？」

と思える。

---

# 11. PLAYBACK

描き終えたあとが最大の見せ場。

PLAY HEADが線を走る。

●────────────→

PLAY HEAD位置に応じて、

描画時に記録した

- 音程
- タイミング
- 強弱
- 左右位置

を再生。

重要なのは、

**形と音が完全同期して見えること。**

---

# 12. タイムラインではなく距離再生

単純に「描いたときと同じ速度」を再現すると、ゆっくり描いた部分が間延びする。

そこで標準モードでは

**線の距離を一定速度で走る**

方式を採用。

これにより完成した音楽がテンポ良くなる。

別モードとして将来的に

ORIGINAL TIME

も追加可能。

---

# 13. MVPゲームモード

## FREE DRAW

完全自由。

制限時間15秒。

好きな線を描く。

終了後：

**YOUR SOUND SCULPTURE**

として自動再生。

一番camera-game-lab向き。

---

# 14. TRACE MODE

空間に薄い半透明ラインを表示。

例：

○

△

♡

★

プレイヤーはそれをなぞる。

### 評価

Shape Accuracy<br>
Rhythm<br>
Smoothness

ただしゲームオーバーは無し。

結果：

GOOD<br>
GREAT<br>
BEAUTIFUL

程度。

競技よりも気持ち良さ優先。

---

# 15. SOUND PUZZLE

将来的なゲーム化候補。

音だけ聞かせる。

♪ C E G A G

対応する形を空間へ描く。

または逆に、

形を見て音を再現する。

ただしこれはMVPには入れない。

SONIC INKはまず

**触って5秒で楽しいトイ**

として成立させる。

---

# 16. 画面構成

縦画面 9:16。

camera-game-lab標準。

### 上部

SONIC INK

SCOREなどは表示しない。

### 中央

カメラ映像

＋

3Dライン

### 下部

小さく

PINCH TO DRAW

描画開始後は消える。

右下：

UNDO

左下：

CLEAR

FREE DRAWではUIを極力少なくする。

---

# 17. CREATOR MODE

かなり重要。

完成後：

**3**
**2**
**1**

PLAYBACK開始。

同時にプレイヤーがポーズ。

光のラインと本人を一緒に撮る。

7秒程度のリプレイを生成。

構成：

0秒<br>
完成した彫刻

1秒<br>
PLAY HEADスタート

2～5秒<br>
音楽再生

6秒<br>
FINISH FLASH

7秒<br>
タイトル

**MADE WITH SONIC INK**

これだけでSNS動画になる。

---

# 18. 見た目

世界観は

**DIGITAL TOY × LIGHT SCULPTURE**

リアルな3Dではなく、

少し玩具っぽい。

ラインは

ネオン管 + ゼリー

の中間。

背景はカメラ映像なので、3D側を複雑にしすぎない。

---

# 19. 色

音程ごとに色を固定してもよい。

C<br>
→ 1色

D<br>
→ 2色

E<br>
→ 3色

G<br>
→ 4色

A<br>
→ 5色

これにより

**色 = 音**

として学習できる。

PLAYBACK時も同じ色が発光。

---

# 20. 音色

MVPでは1種類だけ。

候補：

**Glass Marimba + Soft Synth**

短く、

透明感があり、

連打してもうるさくない。

NOTE EATERとの差別化として、

より

「空間的」

な音にする。

軽いDelay/Reverbあり。

---

# 21. Audio Layer

Web Audio API。

Tone.jsも候補だが、最初はWeb Audio APIだけでも成立。

音階：

C4
D4
E4
G4
A4

上半分：

C5
D5
E5
G5
A5

最大10音。

---

# 22. Camera Input

MediaPipe Hand Landmarker。

使用点：

INDEX_FINGER_TIP

PINCH：

distance(
INDEX_FINGER_TIP,
THUMB_TIP
)

一定閾値以下。

### Stability

3～5 frame平均。

瞬間的な誤検出で描画開始／終了しないようヒステリシスを入れる。

---

# 23. 認識失敗時

これは重要。

手を一瞬見失っても即座に線を終了しない。

LOST

< 250ms

なら線を保持。

再認識したら接続。

500ms以上なら描画終了。

---

# 24. 代替操作

camera-game-labのReliability方針として、

マウス／タッチでも遊べるようにする。

タッチ：

押して描く。

PC：

左クリック。

これにより開発時も簡単に検証可能。

---

# 25. Three.js Visual Layer

SONIC INKはThree.js共通基盤のテストベッドにする。

必要機能：

Camera coordinate → Three coordinate

Stroke Mesh生成

Spline smoothing

Glow

Particle emitter

Playback cursor

Depth sorting

Responsive resize

dispose

このEXPで作ったものを、

GUARDIAN SPIRIT<br>
MAGIC系EXP<br>
NOTE EATER<br>
AIR SLASH

などへ転用する。

---

# 26. Phaserとの役割分担

Three.js：

3Dライン
Particles
Glow
Camera-space objects

Phaser：

不要。

SONIC INKはThree.js単体の方がシンプル。

HUDはHTML/CSS。

つまり：

MediaPipe
↓
Input Layer
↓
SONIC INK Logic
↓
Three.js Visual
＋
Web Audio
＋
HTML HUD

---

# 27. 最初のプロトタイプ

最初からゲーム化しない。

## Prototype A

指で線が描ける

↓

## Prototype B

Y位置で音が鳴る

↓

## Prototype C

描いた線を保存

↓

## Prototype D

PLAY HEADが走る

↓

## Prototype E

音が再生される

ここまでで、

**「これは楽しいか？」**

を判定。

---

# 28. MVPクリア条件

次の瞬間が気持ちよければ成功。

プレイヤー：

ぐるぐるっと線を描く

↓

指を離す

↓

ライン：

✨FLASH

↓

PLAY HEAD：

●━━━━━━━→

↓

音：

♪ ポロロン ポロロン ポロロン

↓

プレイヤー：

「もう一個描いてみよう」

この

**「もう一個」**

が出れば勝ち。

---

# 29. 初期実装範囲 v0.1

FREE DRAWのみ。

15秒。

最大3本のStroke。

Pentatonic。

PINCH描画。

Glow Tube。

Playback。

Stereo Pan。

UNDO。

CLEAR。

Camera / Mouse fallback。

JA / EN。

CREATOR MODEは次段階。

---

# 30. 発展候補

### CHORD SHAPE

三角形を閉じる

→ Major chord

四角

→ Maj7

星

→ Arpeggio

### TWO HANDS

右手：

Melody

左手：

Bass

### DUO

二人が一緒に空間へ描く。

それぞれ別楽器。

### ORCHESTRA

複数Strokeを同時再生。

空中に巨大な音楽彫刻を作る。

### MUSIC CREATURE

描いた線が生き物になり、

自分のラインを歩きながら音を鳴らす。

---

# 31. このEXPの役割

SONIC INK単体の面白さだけでなく、

camera-game-labに

**3D創作系**

という新しい鉱脈を作る。

これまでの多くのEXPは、

身体を

「コントローラー」

として使っていた。

SONIC INKでは身体を

**「制作道具」**

として使う。

そこが大きな違い。

---

# EXP-057 SONIC INK

### ONE-LINER

**Draw in the air. Hear what you made.**

### MVP

**PINCH → DRAW → SOUND → PLAYBACK**

### AHA

**描いた「形」が、そのまま曲になる。**

### 撮れ高

完成した光の彫刻の中で、自分の描いた音楽を聴く。

### 技術テーマ

**MediaPipe × Three.js × Web Audio**

### 判定基準

ゲームとして面白いか以前に、

**3本連続で何か描きたくなるか。**

そこを最初のHuman Playtest Gateとする。