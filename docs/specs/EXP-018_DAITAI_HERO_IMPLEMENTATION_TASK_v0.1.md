# EXP-018 DAITAI HERO / だいたい勇者 — IMPLEMENTATION TASK v0.1

Status: Ready for implementation  
Target: Mobile Web / PWA  
Primary device: Android Chrome  
Session length: 30 seconds  
Dependency: `EXP-018_DAITAI_HERO_SPEC_v0.1.md`

## 0. Goal

Add **EXP-018 DAITAI HERO / だいたい勇者** to Camera Game Lab.

v0.1 must complete the smallest playable loop:

> show estimation question → move face LEFT / CENTER / RIGHT → submit answer → return to center → next question

The purpose is to validate:

- whether face selection feels good;
- whether accidental answers can be controlled;
- whether estimation questions pair naturally with physical movement.

Do not overbuild RPG systems before this is proven.

---

## 1. Definition of done

v0.1 is complete when:

- EXP-018 launches from the experiment list;
- front-camera video is available;
- LEFT / CENTER / RIGHT face-zone input works;
- three-choice questions can be answered by face movement;
- the next question waits for a neutral return;
- correct / wrong feedback appears;
- a 30-second round ends correctly;
- result screen shows score, accuracy, response time, and max combo;
- tap / mouse fallback works without camera;
- all 12 fixed questions are playable;
- JA / EN localization works;
- 360×800 mobile layout remains usable.

---

# TASK-001 — Register EXP-018

Follow the existing experiment-registration pattern.

Metadata:

- ID: `EXP-018`
- Name EN: `DAITAI HERO`
- Name JA: `だいたい勇者`
- Subtitle EN: `Estimate. Decide. Move.`
- Subtitle JA: `だいたい見抜け。身体で答えろ。`

Do not break HOME navigation or existing experiments.

---

# TASK-002 — Build the game screen

Mobile portrait first.

Top HUD:

- remaining time
- SCORE
- COMBO

Main area:

- camera video
- question category
- question prompt
- transient feedback

Answer area:

- LEFT choice
- CENTER choice
- RIGHT choice

Requirements:

- each answer is tappable;
- selected / active zone is visible;
- text remains readable over camera content;
- desktop mouse works.

---

# TASK-003 — Add Face Zone Input

Reuse the shared body-input layer.

Expose normalized logical states:

```text
FACE_PRESENT
FACE_LOST
LEFT
CENTER
RIGHT
NEUTRAL
```

Suggested normalized values:

```text
faceX
baseFaceX
dx = faceX - baseFaceX
```

Suggested initial zone rule:

```text
dx < -threshold   => LEFT
|dx| <= threshold => CENTER / NEUTRAL
dx > threshold    => RIGHT
```

Initial threshold target:

```text
0.10–0.15
```

Keep the threshold configurable.

Game logic must not directly depend on raw MediaPipe category names.

---

# TASK-004 — Calibration

Before the first round:

1. request / initialize camera;
2. wait for one visible face;
3. show `顔を中央にしてください / Center your face`;
4. count down 3 / 2 / 1;
5. save `baseFaceX`.

If no face is detected, do not continue the calibration countdown.

v0.1 may keep the calibration fixed throughout the session.

---

# TASK-005 — Answer hold and neutral return

Do not submit immediately when crossing a zone.

Initial constant:

```text
ANSWER_HOLD_MS = 180
```

Suggested internal states:

```text
READY
CHOOSING
ANSWERED
WAITING_FOR_CENTER
NEXT
```

After an answer:

- lock answer input;
- show feedback;
- wait until face returns to CENTER / NEUTRAL;
- then show / enable the next question.

Prioritize avoiding accidental answers over ultra-low latency.

---

# TASK-006 — Tap / mouse fallback

All three answer regions must call the same answer-submission path used by face input.

Example conceptual API:

```ts
submitAnswer(index)
```

Input source may be recorded as:

```text
FACE
TOUCH
MOUSE
```

but the game rules must not fork by input source.

Camera denial must never make the experiment unplayable.

---

# TASK-007 — Question data model

Keep question data separate from UI rendering.

Suggested shape:

```ts
type Question = {
  id: string
  category: "discount" | "unit" | "estimate" | "probability"
  promptJa: string
  promptEn: string
  choicesJa: string[]
  choicesEn: string[]
  correctIndex: number
  exactAnswerJa?: string
  exactAnswerEn?: string
  hintJa?: string
  hintEn?: string
}
```

Adjust to project conventions as needed.

---

# TASK-008 — Add 12 fixed questions

Use the following dataset.

## DISCOUNT-001

Prompt JA: `2,000円の20%OFFはだいたい？`

Choices:

1. 1,600円
2. 1,900円
3. 1,000円

Correct: 1

---

## DISCOUNT-002

Prompt JA: `5,000円の30%OFFはだいたい？`

Choices:

1. 3,500円
2. 4,500円
3. 2,000円

Correct: 1

---

## DISCOUNT-003

Prompt JA: `9,800円の半額はだいたい？`

Choices:

1. 5,000円
2. 7,500円
3. 3,000円

Correct: 1

---

## UNIT-001

Prompt JA: `どっちがお得？`

LEFT: `200g / 198円`  
CENTER: `ほぼ同じ`  
RIGHT: `500g / 428円`

Correct: RIGHT

---

## UNIT-002

Prompt JA: `どっちがお得？`

LEFT: `300g / 420円`  
CENTER: `ほぼ同じ`  
RIGHT: `500g / 650円`

Correct: RIGHT

---

## UNIT-003

Prompt JA: `どっちがお得？`

LEFT: `350ml / 120円`  
CENTER: `ほぼ同じ`  
RIGHT: `600ml / 160円`

Correct: RIGHT

---

## ESTIMATE-001

Prompt: `19,800 × 4.9 ≒ ?`

Choices:

1. 10万
2. 50万
3. 100万

Correct: 10万  
Reference: 97,020

---

## ESTIMATE-002

Prompt: `398 × 21 ≒ ?`

Choices:

1. 8,000
2. 800
3. 80,000

Correct: 8,000  
Reference: 8,358

---

## ESTIMATE-003

Prompt: `5,980 ÷ 3 ≒ ?`

Choices:

1. 2,000
2. 600
3. 6,000

Correct: 2,000

---

## PROBABILITY-001

Prompt JA: `1%を100回。1回以上当たる確率は？`

Choices:

1. 10%くらい
2. 60%くらい
3. ほぼ100%

Correct: 60%くらい  
Reference: about 63%

---

## PROBABILITY-002

Prompt JA: `50%を3回。1回以上成功する確率は？`

Choices:

1. 50%
2. 90%くらい
3. 100%

Correct: 90%くらい  
Reference: 87.5%

---

## PROBABILITY-003

Prompt JA: `10%の失敗を10回試す。1回以上失敗する確率は？`

Choices:

1. 10%くらい
2. 30%くらい
3. 60%以上

Correct: 60%以上  
Reference: about 65%

---

# TASK-009 — Shuffle questions

Rules:

- randomize question order each round;
- avoid 3+ questions of the same category in a row;
- do not repeat a question before all 12 are exhausted;
- if the player somehow reaches the end, reshuffle and continue.

---

# TASK-010 — Round state machine

Use explicit high-level states:

```text
IDLE
CALIBRATING
COUNTDOWN
PLAYING
RESULT
```

Flow:

```text
START
↓
camera / fallback ready
↓
calibration
↓
3 / 2 / 1
↓
PLAYING
↓
30 seconds
↓
RESULT
```

---

# TASK-011 — Measure response time

For each question:

```text
responseTimeMs = answerConfirmedAt - questionShownAt
```

Speed labels:

```text
<= 800ms   INTUITION!
<= 1500ms  QUICK!
<= 3000ms  GOOD!
> 3000ms   SAFE!
```

Show the label briefly after the answer.

---

# TASK-012 — Scoring

Base:

```text
correct = +100
```

Speed bonus:

```text
INTUITION +100
QUICK +50
GOOD +20
SAFE +0
```

Combo:

```text
correct => combo + 1
wrong   => combo = 0
```

Optional combo bonus:

```text
min(combo * 10, 100)
```

No negative score in v0.1.

---

# TASK-013 — Correct-answer feedback

On correct answer:

- emphasize selected answer;
- show brief hit / slash effect;
- enemy reacts;
- increase score;
- show `GOOD SENSE!` or speed label.

Target feedback duration:

```text
300–500ms
```

Do not let effects stall the round.

---

# TASK-014 — Wrong-answer feedback

On wrong answer:

- briefly shake / reject selected answer;
- reveal the correct answer;
- reset combo;
- optionally display one short explanation.

Examples:

- `TOO HIGH!`
- `TOO LOW!`
- `500gのほうが100gあたり安い！`

Avoid multi-sentence teaching popups during play.

---

# TASK-015 — Exact-answer footnote

For questions with a useful exact reference, show a small transient line.

Examples:

```text
約63%
```

```text
正確には 97,020
```

Target visibility:

```text
500–800ms
```

Gameplay tempo wins over explanation length.

---

# TASK-016 — Placeholder enemy

Use one enemy in v0.1.

Name:

`ワリビキ魔術師 / Discount Mage`

Minimum visual states:

- idle
- attack
- hit

CSS / SVG / emoji placeholder is acceptable.

Do not wait for polished art.

---

# TASK-017 — Timer

Round duration:

```text
30 seconds
```

At 0:

- reject new answers;
- stop round state updates;
- transition safely to RESULT.

---

# TASK-018 — Result screen

Show:

- SCORE
- correct answers
- total answers
- accuracy
- average response time
- fastest response time
- max combo

Temporary title thresholds:

```text
< 50%    計算中の旅人
50–69%   いい勘！
70–84%   概算剣士
85–94%   数感覚マスター
95%+     だいたい勇者
```

No ranking system yet.

---

# TASK-019 — Retry

RESULT includes:

`もう一度 / Play Again`

Retry behavior:

- reshuffle questions;
- reset score / combo / logs / timer;
- calibration may be reused;
- provide a recalibration route if needed.

---

# TASK-020 — Localization

Use the project’s existing JA / EN system.

Required JA strings:

```text
だいたい勇者
だいたい見抜け。身体で答えろ。
顔を中央にしてください
正しい答えの方向へ顔を動かそう！
もう一度
正解率
平均回答時間
最大コンボ
```

Required EN strings:

```text
DAITAI HERO
Estimate. Decide. Move.
Center your face
Move toward the correct answer!
Play Again
Accuracy
Average Time
Max Combo
```

Add English question text as part of the question dataset.

---

# TASK-021 — Camera permission and privacy copy

Before camera activation, show:

JA:

```text
このゲームはインカメラを使います。
映像は保存・送信しません。
```

EN:

```text
This game uses your front camera.
Video is not stored or uploaded.
```

If permission fails:

- display tap-play option;
- do not dead-end the user.

---

# TASK-022 — Mobile layout verification

Minimum target:

```text
360 × 800
720 × 1280
```

Verify:

- question text does not clip;
- choices remain easy to tap;
- camera feed does not hide critical HUD;
- no horizontal scrolling;
- safe-area behavior;
- readable text over dynamic camera background.

---

# TASK-023 — Desktop verification

Desktop browsers must support:

- mouse answers;
- webcam face control when available;
- responsive layout without relying on phone dimensions.

---

# TASK-024 — Debug overlay

Development-only debug values:

```text
faceX
baseFaceX
dx
currentZone
holdTime
inputLocked
currentQuestion
responseTime
```

Hide in production UI.

---

# TASK-025 — Accidental-input test cases

Explicitly test:

- old zone remains active after question change;
- CENTER submits automatically;
- returning toward center triggers another answer;
- face detection disappears for one frame;
- two faces appear;
- player moves closer / farther from camera;
- player rotates head without translating much;
- threshold oscillation near zone boundary.

Rule:

> Slightly slower but stable is better than fast and wrong.

---

# TASK-026 — Face lost

If face disappears during camera play:

```text
顔が見つかりません
Camera lost
```

Recommended behavior:

- pause timer;
- block answer input;
- resume after stable detection returns.

Avoid switching unpredictably between multiple faces.

---

# TASK-027 — Sound

If shared project sounds are available, use minimal effects:

- correct
- wrong
- INTUITION
- start
- finish

BGM is not required for v0.1.

Do not make new audio production a blocker.

---

# TASK-028 — Accessibility and fallback

Requirements:

- full round playable with touch / mouse only;
- camera is optional;
- correctness is not communicated by color alone;
- touch targets are at least about 44px;
- text remains large enough on mobile;
- reduced-motion users do not receive aggressive shake / motion effects.

---

# TASK-029 — Local play-session log

No external analytics required.

Store one round in local in-memory state.

Per answer:

```text
questionId
category
correct
selectedIndex
correctIndex
responseTimeMs
inputType
```

Use it to compute RESULT.

---

# TASK-030 — README / experiment note

Add a short EXP-018 note where existing project documentation expects experiment summaries.

Suggested text:

```text
EXP-018 DAITAI HERO

Goal:
Test whether estimation questions become more engaging when answered with body movement.

Core input:
Face left / center / right.

Session:
30 seconds.

v0.1:
12 fixed questions.
```

Do not rewrite unrelated README content.

---

## Out of scope for v0.1

Do not implement:

- full RPG progression
- equipment
- levels
- skills
- multiple enemy roster
- boss battle
- daily challenges
- user accounts
- progression history
- rankings
- automatic question generation
- AI question generation
- mouth input
- hand input
- nod / shake YES-NO
- monetization
- ads

---

## Manual playtest pass

Run at least 5 rounds and note:

### INPUT

- intended direction is selected;
- accidental selections are rare;
- neutral return does not feel annoying.

### TEMPO

- 30 seconds feels brisk;
- result feedback is not too long;
- next-question rhythm feels natural.

### QUESTION

- approximation works without precise calculation;
- choices are not needlessly close;
- the player feels they used number sense.

### FUN

Primary question:

> **タップより顔で答えるほうが面白いか？**

If the answer is no, do not solve that by adding RPG features. Revisit the input interaction.

---

## v0.1 acceptance criteria

### A
10 consecutive questions without a serious input error.

### B
Typical answer time roughly 1–3 seconds.

### C
A 30-second round makes replay feel natural.

### D
At least one numerical relationship is memorable after playing.

### E
Face movement feels causally connected to fast judgment, not like a camera gimmick.

---

## Suggested next version if successful

Priority order:

1. YES / NO nod and head shake
2. mouth-catch number mode
3. finger-point three-choice input
4. expand to 30 questions
5. polished Discount Mage
6. HP battle
7. category-specific enemies
8. boss: `実質無料魔王`

---

## Implementation principle

The desired loop is:

```text
数字を見る
↓
だいたい分かる
↓
身体が先に動く
↓
当たる
↓
気持ちいい
```

**Think less. Sense more.**

**正確に計算するな。だいたい見抜け。**
