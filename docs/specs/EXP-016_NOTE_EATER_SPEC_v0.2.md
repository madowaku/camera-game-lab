# EXP-016 NOTE EATER — SPEC v0.2

Status: Ready for implementation\
Target: Mobile Web / PWA\
Primary device: Android Chrome / iPhone Safari\
Play time: 30 seconds\
Input: Front camera / FACE XY / MOUTH OPEN-CLOSE\
Core principle: **S/Aランク入力だけで成立させる**

---

## 1. ONE-LINE CONCEPT

**飛んでくる音符をパクッ。食べた音が、そのまま曲になる。**

四方から近づいてくる音符の中から好きなものを顔で選び、口を開けて食べる。

音符にはペンタトニックスケールの音だけを割り当てる。

どの音をどの順番で食べても、大きく濁らず気持ちよい即興演奏になる。

---

# 2. DESIGN GOAL

NOTE EATERは「正しい音符を取る音ゲー」ではない。

目標は、

> **遊んでいるだけで音楽になること。**

プレイヤーに要求するのは、

- 音楽知識
- 正確なリズム
- 譜面暗記
- 高精度なジェスチャー

ではない。

必要なのは、

**見る → 選ぶ → パクッ**

だけ。

---

# 3. CORE INPUT

使用するカメラ入力は2種類だけ。

## AIM

顔中心位置。

```text
faceX
faceY
```

顔を動かすと、口の位置も画面上で移動する。

細かな首角度や視線は使用しない。

## EAT

口のOPEN / CLOSE。

```text
CLOSED
OPEN
UNKNOWN
```

一度食べると、口を閉じるまで次の音符は食べられない。

```text
CLOSED
↓
OPEN
↓
EAT
↓
WAIT_FOR_CLOSE
↓
CLOSED
↓
READY
```

口を開けっぱなしにするだけでは連続取得できない。

---

# 4. RELIABILITY RULE

NOTE EATERでは、

**「口と音符を正確に重ねる」ことを要求しない。**

口の周囲に見えないEAT ZONEを持つ。

初期値：

```text
EAT_RADIUS = mouthWidth × 2.0〜2.5
```

音符がEAT ZONEに入っていれば取得候補になる。

さらに吸着補助を使用する。

```text
MAGNET_RADIUS > EAT_RADIUS
```

音符がMAGNET_RADIUSへ入ると、

- 少し口方向へ軌道補正
- 少し発光
- 少し大きくなる

ことで、

**「もう食べられる」**

ことを視覚的に伝える。

---

# 5. FIRST 3 SECONDS

文章チュートリアルは禁止。

開始時に音符を1個だけ出す。

画面中央付近へゆっくり接近。

表示：

**OPEN YOUR MOUTH**

または

**パクッとしてみよう**

プレイヤーが口を開く。

↓

音符が吸い込まれる。

↓

音が鳴る。

↓

小さな演出。

↓

即座に

**3 / 2 / 1**

↓

本編開始。

最初の3秒で、

**「口を開ければ食べられる」**

ことを体験で理解させる。

---

# 6. NOTE SPAWN

全音符が同時に口へ向かってこないようにする。

常に2〜4個程度の選択肢を提示。

例：

```text
左上 → 中央付近
右 → 左下
下 → 上
右上 → 中央
```

全音符を取得することは要求しない。

## Important

音符は、

**ノーツではなく選択肢。**

プレイヤーは毎回、

> どれを食べよう？

を選ぶ。

---

# 7. MUSIC SYSTEM

MVPはメジャー・ペンタトニック。

例：

```text
C
D
E
G
A
```

必要なら上下1オクターブ追加。

```text
C4 D4 E4 G4 A4
C5 D5 E5 G5 A5
```

音名はゲーム画面に表示しない。

---

# 8. VISUAL NOTE TYPES

音高は形・色・サイズで区別する。

音楽知識は不要。

例：

```text
●
◆
★
♥
✦
```

サイズによってオクターブ感を表現してもよい。

```text
small = high
large = low
```

ただしv0.2では情報量を増やしすぎない。

最初は5種類。

---

# 9. EAT FEEDBACK

NOTE EATERで最重要の演出。

入力判定後、可能な限り即時に音を鳴らす。

理想：

```text
OPEN
↓
EAT confirmed
↓
sound
```

知覚できる遅延を極力減らす。

演出：

1. 音符が口へ急加速
2. 一瞬縮小
3. 消える
4. 同時に音が鳴る
5. 口から小さな音波
6. 色の粒が外へ散る

表示候補：

```text
PAK!
POP!
♪!
```

文字は必須ではない。

---

# 10. NO PUNISHMENT

取り逃した音符をMISS扱いしない。

音符が通過した場合、

遠くで小さく鳴って消える。

ゲームを止めない。

スコア減点なし。

コンボリセットなし。

NOTE EATERには、

**「失敗したから音楽が壊れる」**

状態を作らない。

---

# 11. GROOVE

COMBOではなく、

**GROOVE**

を使用。

テンポよく食べると上昇。

時間が空くとゆっくり低下。

```text
0–100
```

GROOVEによって伴奏が育つ。

例：

```text
0–19
kick only

20–39
+ bass

40–59
+ hi-hat

60–79
+ chord pad

80–100
+ sparkle / harmony
```

GROOVEはミスでゼロにならない。

---

# 12. BACKING MUSIC

固定された完成曲に合わせるのではなく、

プレイによって曲が育つ。

BPM初期値：

```text
100〜110
```

プレイヤーが食べた音を量子化してもよいが、

入力から音が鳴る瞬間そのものは量子化しない。

つまり、

**口を開けた瞬間には即音が鳴る。**

必要ならバックグラウンド側だけビートへ自然に合わせる。

---

# 13. SOUND DESIGN

MVPの音色：

**マリンバ / ベル / 柔らかいシンセ**

など短く明瞭な音。

最優先条件：

- 発音が速い
- 音程が分かりやすい
- 連打して濁りすぎない
- スマホスピーカーでも気持ちよい

低音を厚くしすぎない。

---

# 14. ROUND

本編：

```text
30 seconds
```

ゲームオーバーなし。

HPなし。

失敗条件なし。

終了まで必ず遊べる。

計測：

```text
notes eaten
max groove
unique notes
melody sequence
```

---

# 15. YOUR MELODY

ラウンド中に取得した音列を保存。

例：

```text
C E G A G E D C
```

結果画面で、

**YOUR MELODY**

として短く再生。

必要に応じて、

- リズム整形
- オクターブ調整
- 簡単な伴奏追加

をしてもよい。

ただし、

**食べた音の順番自体は変えない。**

「自分が作った」感覚を守る。

---

# 16. RESULT SCREEN

表示：

```text
23 NOTES EATEN
MAX GROOVE 84

YOUR MELODY
▶ PLAY

RETRY
NEXT
SHARE
```

順位・評価ランクは不要。

「上手い / 下手」を作りすぎない。

---

# 17. CREATOR MODE

NOTE EATERはCREATOR MODEとの相性が高い。

9:16縦動画。

映す要素：

- プレイヤー
- 顔周辺の音符
- EAT演出
- GROOVE演出

顔モード：

```text
ORIGINAL
EFFECT
HIDE
```

SOFT SERVEと共通基盤を使用。

---

# 18. CREATOR HIGHLIGHT EVENTS

候補：

```text
FIRST_EAT
FAST_3_EATS
GROOVE_50
GROOVE_80
BIG_NOTE
FINAL_EAT
```

7秒リプレイ候補：

```text
2秒前
↓
HIGHLIGHT
↓
4〜5秒後
```

最優先ハイライト：

**GROOVE 80以上で連続3音を食べた場面。**

---

# 19. SHAREABILITY

プレイ動画を見た人が、

**説明なしでルールを理解できる**

ことを目標にする。

理想的な動画：

プレイヤーの顔

↓

音符が接近

↓

😮

↓

音符が口へ吸い込まれる

↓

♪ ポーン

これだけで成立。

---

# 20. CAMERA FAILURE UX

認識できない場合もゲーム画面を止めすぎない。

例：

```text
顔を少しカメラへ
```

```text
もう少し明るい場所へ
```

```text
口まで映る距離へ
```

単純な

```text
TRACKING LOST
```

だけにしない。

---

# 21. INPUT GATE

実機試験。

## Mouth detection

意図的なOPEN / CLOSEを10回。

目標：

```text
9 / 10成功以上
```

## False eat

口を閉じた状態で30秒。

目標：

```text
誤EAT 0回
```

## Cold start

説明文なし。

最初の音符を提示。

目標：

```text
5人中4人以上が5秒以内に最初のEAT成功
```

## Tracking recovery

一度画面外へ出る。

戻る。

目標：

```text
追加操作なしで自動復帰
```

---

# 22. HUMAN PLAYTEST

5ラウンド。

見る項目：

1. 最初の一口でルールが理解できるか
2. 顔を動かして音を選ぶ行為が自然か
3. 口の判定にイライラしないか
4. 音が鳴る瞬間が気持ちよいか
5. 好きな音を選んでいる感覚があるか
6. 「もう一回違う曲を作りたい」と思うか
7. プレイ中の顔が見ていて面白いか
8. 動画を人に見せたくなるか

特に、

**1 / 3 / 4 / 6**

を重要評価項目とする。

---

# 23. MVP SCOPE

実装する：

- Face Landmarker
- 顔XY
- Mouth OPEN / CLOSE
- EAT ZONE
- Magnet assist
- 5音ペンタトニック
- 2〜4音選択
- 30秒
- GROOVE
- 段階的伴奏
- YOUR MELODY
- RETRY
- Camera-free practice
- JA / EN
- CREATOR highlight hooks

実装しない：

- 譜面
- 音程判定
- マイク
- ランキング
- オンラインスコア
- 曲選択
- 失敗演出
- 複雑なジェスチャー
- PINCH
- 指入力

---

# 24. SUCCESS CONDITION

NOTE EATER v0.2は、

**高得点が取れること**

ではなく、

> 初見の人が最初の音符をパクッと食べた瞬間、少し笑う。

これが起きれば成功。

その後30秒遊び、

> 「今度は違う音を食べてみよう」

と思えば、MVPとして十分に成立している。
