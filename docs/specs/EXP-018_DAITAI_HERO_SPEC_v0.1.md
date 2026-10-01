# EXP-018 DAITAI HERO / だいたい勇者 — SPEC v0.1

Status: Ready for implementation  
Target: Mobile Web / PWA  
Primary device: Android Chrome  
Target play time: 30 seconds  
Purpose: Test whether estimation questions become more engaging when answered with face movement.

## 1. One-line concept

**正確に計算するな。だいたい見抜け。**

画面に現れる「数字の攻撃」に対して、プレイヤーが顔を左・中央・右へ動かし、瞬間的に3択回答するインカメラ概算ゲーム。

The core skill is not exact arithmetic. It is **number sense**:

- magnitude
- percentage
- unit price
- probability
- discount
- rough estimation

The prototype succeeds if the player sees a problem, gets a rough sense of the answer, and moves before fully calculating.

---

## 2. Research hypothesis

A body-driven answer input may make estimation feel more immediate than tapping because:

- the answer becomes a physical reaction rather than a worksheet action;
- estimation is naturally fast and approximate;
- visible movement makes the game readable to spectators;
- response time can measure how quickly number sense turns into action.

The main validation question is:

> **Is answering with the face more fun and more intuitive than tapping?**

---

## 3. MVP

One 30-second battle.

The screen shows:

- front-camera video
- one question
- three answer zones: LEFT / CENTER / RIGHT
- timer
- score
- combo
- short correctness feedback

The player answers by moving their face toward one of the three zones.

Tap / mouse input remains available as a fallback and debugging path.

---

## 4. Core loop

1. Ask for camera permission.
2. Detect one face.
3. Ask the player to center their face.
4. Calibrate the neutral X position.
5. Start a 3–2–1 countdown.
6. Show one question with three choices.
7. Player moves LEFT / CENTER / RIGHT.
8. Hold the pose briefly to confirm.
9. Judge the answer.
10. Show a short result such as `INTUITION!`, `GOOD SENSE!`, `TOO HIGH!`, or `TOO LOW!`.
11. Lock input until the player returns to neutral / center.
12. Continue until 30 seconds end.
13. Show result summary.
14. Allow instant replay.

---

## 5. Input contract

Game logic must not depend directly on MediaPipe-specific structures.

Use or extend the shared body-input layer and expose normalized face-zone state.

Minimum logical output:

- `FACE_PRESENT`
- `FACE_LOST`
- `LEFT`
- `CENTER`
- `RIGHT`
- `NEUTRAL`
- normalized `faceX`
- calibrated `baseFaceX`

Suggested zone logic:

```text
dx = faceX - baseFaceX

dx < -threshold   => LEFT
|dx| <= threshold => CENTER / NEUTRAL
dx > threshold    => RIGHT
```

Initial threshold target:

```text
0.10–0.15 normalized X
```

All thresholds must be constants that can be tuned on-device.

---

## 6. Calibration

Before the first round:

> 顔を中央にしてください  
> Center your face

When one stable face is present, count down:

3  
2  
1

Save the current face-center X as `baseFaceX`.

If the face disappears, pause calibration.

v0.1 may keep the calibration fixed for the whole play session.

---

## 7. Answer confirmation

Do not submit an answer the instant the face crosses a zone boundary.

Initial value:

```text
ANSWER_HOLD_MS = 180
```

Suggested answer state flow:

```text
READY
CHOOSING
ANSWERED
WAITING_FOR_CENTER
NEXT
```

After one answer, ignore new answer zones until the face returns to neutral / center.

Prefer slight latency over accidental answers.

---

## 8. Question categories

v0.1 uses four categories.

### A. DISCOUNT

Example:

> 2,980円の20%OFFはだいたい？

The player should recognize roughly “80% of the original price,” not perform exact arithmetic.

### B. UNIT PRICE

Example:

> 200g / 198円  
> 500g / 428円  
> どっちがお得？

The goal is quick value comparison.

### C. ESTIMATION

Example:

> 19,800 × 4.9 ≒ ?

The intended thought is:

> 20,000 × 5 ≒ 100,000

### D. PROBABILITY

Example:

> 1%を100回。1回以上当たる確率は？

The goal is intuitive probability scale, not formal derivation during play.

---

## 9. Fixed v0.1 question set

Use 12 fixed questions first so playtests are comparable.

### DISCOUNT-001

**2,000円の20%OFFはだいたい？**

1. 1,600円
2. 1,900円
3. 1,000円

Correct: 1,600円

### DISCOUNT-002

**5,000円の30%OFFはだいたい？**

1. 3,500円
2. 4,500円
3. 2,000円

Correct: 3,500円

### DISCOUNT-003

**9,800円の半額はだいたい？**

1. 5,000円
2. 7,500円
3. 3,000円

Correct: 5,000円

### UNIT-001

**どっちがお得？**

LEFT: 200g / 198円  
CENTER: ほぼ同じ  
RIGHT: 500g / 428円

Correct: RIGHT

### UNIT-002

**どっちがお得？**

LEFT: 300g / 420円  
CENTER: ほぼ同じ  
RIGHT: 500g / 650円

Correct: RIGHT

### UNIT-003

**どっちがお得？**

LEFT: 350ml / 120円  
CENTER: ほぼ同じ  
RIGHT: 600ml / 160円

Correct: RIGHT

### ESTIMATE-001

**19,800 × 4.9 ≒ ?**

1. 10万
2. 50万
3. 100万

Correct: 10万  
Exact reference: 97,020

### ESTIMATE-002

**398 × 21 ≒ ?**

1. 8,000
2. 800
3. 80,000

Correct: 8,000  
Exact reference: 8,358

### ESTIMATE-003

**5,980 ÷ 3 ≒ ?**

1. 2,000
2. 600
3. 6,000

Correct: 2,000

### PROBABILITY-001

**1%を100回。1回以上当たる確率は？**

1. 10%くらい
2. 60%くらい
3. ほぼ100%

Correct: 60%くらい  
Reference: about 63%

### PROBABILITY-002

**50%を3回。1回以上成功する確率は？**

1. 50%
2. 90%くらい
3. 100%

Correct: 90%くらい  
Reference: 87.5%

### PROBABILITY-003

**10%の失敗を10回試す。1回以上失敗する確率は？**

1. 10%くらい
2. 30%くらい
3. 60%以上

Correct: 60%以上  
Reference: about 65%

---

## 10. Question design rule

Do not make choices so close that exact calculation is required.

Bad:

- 4,812円
- 4,927円
- 5,031円

Good:

- 3,500円
- 5,000円
- 7,000円

The player should be able to succeed using scale, ratio, rounding, and intuition.

When useful, show the precise answer briefly **after** the choice.

---

## 11. Scoring

Base score:

```text
correct = +100
```

Speed feedback:

```text
<= 800ms   INTUITION!
<= 1500ms  QUICK!
<= 3000ms  GOOD!
> 3000ms   SAFE!
```

Suggested speed bonuses:

```text
INTUITION +100
QUICK +50
GOOD +20
SAFE +0
```

Combo:

- correct => combo +1
- wrong => combo reset to 0
- optional combo bonus: `min(combo * 10, 100)`

No negative score in v0.1.

Correctness is more important than raw speed.

---

## 12. Feedback

Correct:

- emphasize selected zone
- brief slash / impact effect
- enemy reacts
- score increases
- show `GOOD SENSE!` or speed label

Wrong:

- brief shake
- reveal correct answer
- combo reset
- optionally show one very short explanation

Examples:

- `TOO HIGH!`
- `TOO LOW!`
- `500gのほうが100gあたり安い！`

Do not stop the game for long explanations.

---

## 13. Battle presentation

v0.1 uses one placeholder enemy:

**ワリビキ魔術師 / Discount Mage**

Minimum states:

- idle
- attack
- hit

CSS / SVG / emoji placeholder art is acceptable.

Do not block implementation on final character art.

Future enemies may include:

- オオモリミミック
- ガチャゴーレム
- カクリツドラゴン
- ポイント還元商人
- 実質無料魔王

---

## 14. Result screen

Show:

- SCORE
- correct answers
- total answers
- accuracy
- average response time
- fastest response
- max combo

Temporary titles:

- <50%: 計算中の旅人
- 50–69%: いい勘！
- 70–84%: 概算剣士
- 85–94%: 数感覚マスター
- 95%+: だいたい勇者

---

## 15. Camera fallback and privacy

If camera permission is denied, the game must still work by tapping the three answer areas.

Display before camera use:

> このゲームはインカメラを使います。  
> 映像は保存・送信しません。

English:

> This game uses your front camera.  
> Video is not stored or uploaded.

v0.1 policy:

- local processing only
- no photo capture
- no recording
- no video upload

---

## 16. Localization

Japanese and English must follow the existing Camera Game Lab language-switch system.

Key strings:

### JA

- だいたい勇者
- だいたい見抜け。身体で答えろ。
- 顔を中央にしてください
- 正しい答えの方向へ顔を動かそう！
- もう一度
- 正解率
- 平均回答時間
- 最大コンボ

### EN

- DAITAI HERO
- Estimate. Decide. Move.
- Center your face
- Move toward the correct answer!
- Play Again
- Accuracy
- Average Time
- Max Combo

---

## 17. Device targets

Primary baseline:

- 360 × 800
- 720 × 1280

Check:

- no clipped questions
- no horizontal scrolling
- answer zones remain easy to tap
- camera feed does not hide essential text
- safe-area handling
- desktop mouse fallback

---

## 18. Debug mode

Development-only debug display may show:

- `faceX`
- `baseFaceX`
- `dx`
- `currentZone`
- `holdTime`
- `inputLocked`
- `currentQuestion`
- `responseTime`

Never show it in normal production mode.

---

## 19. Face-lost behavior

If the face is lost during play:

> 顔が見つかりません  
> Camera lost

Recommended v0.1 behavior:

- pause the round timer
- pause answer input
- resume after stable face detection returns

If multiple faces are visible, prefer one consistent primary face or pause rather than switching unpredictably.

---

## 20. Playtest questions

After implementation, prioritize these observations:

1. Is face selection pleasant?
2. Are accidental answers rare?
3. Does the player physically react before fully calculating?
4. Does the experience avoid feeling like a school worksheet?
5. Does the player retain any rough numerical intuition after several questions?
6. Does the player want another 30-second round?
7. Is face input actually better than tapping?

---

## 21. v0.1 success criteria

A. Ten consecutive questions without a serious input error.

B. Typical response times land roughly in the 1–3 second range.

C. A 30-second round invites immediate replay.

D. At least one numerical relationship remains memorable after play.

E. Face input feels connected to fast judgment rather than being a decorative gimmick.

---

## 22. Out of scope

Do not implement yet:

- full RPG progression
- equipment
- levels
- skills
- multiple enemies
- boss fights
- daily challenges
- accounts
- ranking
- auto-generated questions
- AI-generated questions
- mouth input
- hand input
- nod / shake YES-NO
- monetization
- ads

---

## 23. Future direction

If v0.1 works, candidate expansions:

1. nod / shake YES-NO
2. eat the correct number with mouth input
3. point toward choices with finger tracking
4. expand to 30+ questions
5. category-specific enemies
6. HP battle structure
7. boss: 実質無料魔王

---

## Core principle

> 数字を見る  
> ↓  
> だいたい分かる  
> ↓  
> 身体が先に動く  
> ↓  
> 当たる  
> ↓  
> 気持ちいい

**Think less. Sense more.**

**正確に計算するな。だいたい見抜け。**
