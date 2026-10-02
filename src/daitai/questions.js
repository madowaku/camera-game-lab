// Choice positions match the fixed v0.1 dataset; shuffle questions, not answers.
export const QUESTIONS = [
  { id: "DISCOUNT-001", category: "discount", promptJa: "2,000円の20%OFFはだいたい？", promptEn: "About how much is ¥2,000 after 20% off?", choicesJa: ["1,600円", "1,900円", "1,000円"], choicesEn: ["¥1,600", "¥1,900", "¥1,000"], correctIndex: 0 },
  { id: "DISCOUNT-002", category: "discount", promptJa: "5,000円の30%OFFはだいたい？", promptEn: "About how much is ¥5,000 after 30% off?", choicesJa: ["3,500円", "4,500円", "2,000円"], choicesEn: ["¥3,500", "¥4,500", "¥2,000"], correctIndex: 0 },
  { id: "DISCOUNT-003", category: "discount", promptJa: "9,800円の半額はだいたい？", promptEn: "About how much is half of ¥9,800?", choicesJa: ["5,000円", "7,500円", "3,000円"], choicesEn: ["¥5,000", "¥7,500", "¥3,000"], correctIndex: 0, exactAnswerJa: "正確には 4,900円", exactAnswerEn: "Exactly ¥4,900" },
  { id: "UNIT-001", category: "unit", promptJa: "どっちがお得？", promptEn: "Which is the better deal?", choicesJa: ["200g / 198円", "ほぼ同じ", "500g / 428円"], choicesEn: ["200g / ¥198", "About equal", "500g / ¥428"], correctIndex: 2, exactAnswerJa: "100gあたり 99円 vs 約86円", exactAnswerEn: "Per 100g: ¥99 vs about ¥86" },
  { id: "UNIT-002", category: "unit", promptJa: "どっちがお得？", promptEn: "Which is the better deal?", choicesJa: ["300g / 420円", "ほぼ同じ", "500g / 650円"], choicesEn: ["300g / ¥420", "About equal", "500g / ¥650"], correctIndex: 2, exactAnswerJa: "100gあたり 140円 vs 130円", exactAnswerEn: "Per 100g: ¥140 vs ¥130" },
  { id: "UNIT-003", category: "unit", promptJa: "どっちがお得？", promptEn: "Which is the better deal?", choicesJa: ["350ml / 120円", "ほぼ同じ", "600ml / 160円"], choicesEn: ["350ml / ¥120", "About equal", "600ml / ¥160"], correctIndex: 2, exactAnswerJa: "100mlあたり 約34円 vs 約27円", exactAnswerEn: "Per 100ml: about ¥34 vs ¥27" },
  { id: "ESTIMATE-001", category: "estimate", promptJa: "19,800 × 4.9 ≒ ?", promptEn: "19,800 × 4.9 ≒ ?", choicesJa: ["10万", "50万", "100万"], choicesEn: ["100,000", "500,000", "1,000,000"], correctIndex: 0, exactAnswerJa: "正確には 97,020", exactAnswerEn: "Exactly 97,020" },
  { id: "ESTIMATE-002", category: "estimate", promptJa: "398 × 21 ≒ ?", promptEn: "398 × 21 ≒ ?", choicesJa: ["8,000", "800", "80,000"], choicesEn: ["8,000", "800", "80,000"], correctIndex: 0, exactAnswerJa: "正確には 8,358", exactAnswerEn: "Exactly 8,358" },
  { id: "ESTIMATE-003", category: "estimate", promptJa: "5,980 ÷ 3 ≒ ?", promptEn: "5,980 ÷ 3 ≒ ?", choicesJa: ["2,000", "600", "6,000"], choicesEn: ["2,000", "600", "6,000"], correctIndex: 0 },
  { id: "PROBABILITY-001", category: "probability", promptJa: "1%を100回。1回以上当たる確率は？", promptEn: "100 independent tries at 1%. Chance of at least one win?", choicesJa: ["10%くらい", "60%くらい", "ほぼ100%"], choicesEn: ["About 10%", "About 60%", "Almost 100%"], correctIndex: 1, exactAnswerJa: "約63%（各回は独立）", exactAnswerEn: "About 63% (independent tries)" },
  { id: "PROBABILITY-002", category: "probability", promptJa: "50%を3回。1回以上成功する確率は？", promptEn: "3 independent tries at 50%. Chance of at least one success?", choicesJa: ["50%", "90%くらい", "100%"], choicesEn: ["50%", "About 90%", "100%"], correctIndex: 1, exactAnswerJa: "87.5%（各回は独立）", exactAnswerEn: "87.5% (independent tries)" },
  { id: "PROBABILITY-003", category: "probability", promptJa: "10%の失敗を10回試す。1回以上失敗する確率は？", promptEn: "10 independent tries with 10% failure each. Chance of any failure?", choicesJa: ["10%くらい", "30%くらい", "60%以上"], choicesEn: ["About 10%", "About 30%", "Over 60%"], correctIndex: 2, exactAnswerJa: "約65%（各回は独立）", exactAnswerEn: "About 65% (independent tries)" }
];

export function createQuestionDeck(random = Math.random, previousCategories = []) {
  const remaining = [...QUESTIONS];
  const deck = [];
  const history = [...previousCategories.slice(-2)];
  while (remaining.length) {
    const avoid = history.length >= 2 && history.at(-1) === history.at(-2) ? history.at(-1) : null;
    const eligible = remaining.filter((q) => q.category !== avoid);
    // Draw from the largest remaining category buckets, preventing a stranded
    // same-category tail without retry loops (even with deterministic random).
    const counts = Object.fromEntries(eligible.map((q) => [q.category, remaining.filter((r) => r.category === q.category).length]));
    const largest = Math.max(...Object.values(counts));
    const candidates = eligible.filter((q) => counts[q.category] === largest);
    const question = candidates[Math.floor(random() * candidates.length)];
    remaining.splice(remaining.indexOf(question), 1);
    deck.push(question);
    history.push(question.category);
  }
  return deck;
}
