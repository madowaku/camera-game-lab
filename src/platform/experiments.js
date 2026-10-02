// Display numbers belong to a collection. Identity and routing never depend on them.
const loadSolo = () => import("../solo/soloExperience.js").then((m) => m.createSoloExperience);
const define = (entry) => Object.freeze({
  status: "playable", featured: false, orientation: "portrait", players: 1,
  duration: 30, previewType: "poster", previewAsset: null,
  requiresCamera: true, requiresMicrophone: false, tags: [], aliases: [],
  ...entry, route: `#/game/${entry.slug ?? entry.id}`, slug: entry.slug ?? entry.id,
});

export const experiments = Object.freeze([
  define({ id: "solo-hand-beat", exp: "EXP-001", collection: "SOLO", category: "SOLO",
    titleJa: "HAND BEAT", titleEn: "HAND BEAT", subtitleJa: "ビートに合わせて、手のカタチを変えよう。", subtitleEn: "Match the beat. Change the shape of your hand.",
    input: ["HAND", "PINCH"], duration: 15, featured: true, accent: "#d7ff3f", tags: ["rhythm"], previewType: "image", previewAsset: "/previews/hand-beat.webp",
    aliases: ["#hand-beat", "#handBeat"], module: "solo", mode: "handBeat", motif: "hand", load: loadSolo }),
  define({ id: "solo-finger-gun", exp: "EXP-002", collection: "SOLO", category: "SOLO",
    titleJa: "FINGER GUN", titleEn: "FINGER GUN", subtitleJa: "指でねらって、親指を折ると発射。", subtitleEn: "Aim your finger. Fold your thumb. Fire.",
    input: ["HAND"], duration: 15, accent: "#ff855f", tags: ["aim", "action"],
    aliases: ["#finger-gun", "#fingerGun"], module: "solo", mode: "fingerGun", motif: "target", load: loadSolo }),
  define({ id: "solo-eat-dont-eat", exp: "EXP-003", collection: "SOLO", category: "SOLO",
    titleJa: "EAT / DON'T EAT", titleEn: "EAT / DON'T EAT", subtitleJa: "食べ物だけ、口を開けてパクッ。", subtitleEn: "Open wide for food. Keep the rest out.",
    input: ["FACE", "MOUTH"], duration: 15, accent: "#ffacd2", tags: ["reaction"],
    aliases: ["#eat-dont-eat", "#eatDontEat"], module: "solo", mode: "eatDontEat", motif: "mouth", load: loadSolo }),
  define({ id: "solo-blink-horror", exp: "EXP-004", collection: "SOLO", category: "SOLO",
    titleJa: "BLINK HORROR", titleEn: "BLINK HORROR", subtitleJa: "見れば近づく。目を閉じて、闇に隠れろ。", subtitleEn: "It comes closer while you look. Close your eyes to hide.",
    input: ["FACE", "BLINK"], duration: 26, accent: "#edaa8c", tags: ["horror", "eyes", "まばたき"],
    aliases: ["#blink-horror"], module: "blink", demo: true, motif: "blink",
    load: () => import("../blink/view.js").then((m) => m.createView) }),
  define({ id: "solo-pinch-world", exp: "EXP-005", collection: "SOLO", category: "SOLO",
    titleJa: "PINCH WORLD", titleEn: "PINCH WORLD", subtitleJa: "小さな世界を、ふたつの指でつまもう。", subtitleEn: "Two real fingers. One tiny world to pick up.",
    input: ["HAND", "PINCH"], duration: 30, accent: "#b7d6ab", tags: ["manipulation", "physics", "つまむ"],
    aliases: ["#pinch-world"], module: "pinch", demo: true, motif: "pinch",
    load: () => import("../pinch/view.js").then((m) => m.createView) }),
  define({ id: "voice-note-blaster", exp: "EXP-019", collection: "VOICE", category: "VOICE",
    titleJa: "NOTE BLASTER", titleEn: "NOTE BLASTER", subtitleJa: "ド・レ・ミを歌って、音符を撃ち出そう。", subtitleEn: "Sing Do, Re, Mi. Turn your voice into ammo.",
    input: ["VOICE", "MOUTH"], featured: true, requiresMicrophone: true, accent: "#a7ebcc", tags: ["music", "shooter"],
    aliases: ["#note-blaster"], module: "blaster", demo: true, motif: "voice",
    load: () => import("../blaster/noteBlasterArcade.js").then((m) => (root, locale) => new m.NoteBlasterArcade(root, locale)) }),
  define({ id: "duo-tiny-bot-duel", exp: "EXP-020", collection: "DUO", category: "DUO",
    titleJa: "TINY BOT DUEL", titleEn: "TINY BOT DUEL", subtitleJa: "顔でよけて、口で撃つ。ふたりで対決。", subtitleEn: "Two faces. Two bots. Open your mouth to fire.",
    input: ["FACE", "MOUTH"], players: 2, orientation: "landscape", featured: true, accent: "#79d9ff", tags: ["versus"],
    aliases: ["#duo"], module: "duo", demo: true, motif: "duo",
    load: () => import("../duo/duoArcade.js").then((m) => (root, locale, options) => new m.DuoArcade(root, locale, options)) }),
  define({ id: "guardian-spirit", exp: "EXP-020", collection: "PHOTO / AR", category: "PHOTO / AR",
    titleJa: "GUARDIAN SPIRIT", titleEn: "GUARDIAN SPIRIT", subtitleJa: "そのポーズで、背後の守護霊が動き出す。", subtitleEn: "Strike a pose. Your guardian strikes back.",
    input: ["BODY"], accent: "#b6a4ff", tags: ["photo", "AR", "action"],
    aliases: ["#guardian"], module: "guardian", demo: true, motif: "body",
    load: () => import("../guardian/guardianExperience.js").then((m) => (root, locale) => new m.GuardianExperience(root, locale)) }),
  define({ id: "outcam-watermelon-guide", exp: "EXP-021", collection: "OUTCAM", category: "OUTCAM",
    titleJa: "WATERMELON GUIDE", titleEn: "WATERMELON GUIDE", subtitleJa: "見えるのは相方だけ。声を頼りにスイカ割り。", subtitleEn: "Only your partner sees it. Listen, swing, smash.",
    input: ["HAND"], players: 2, accent: "#75ec9b", tags: ["rear camera", "AR", "co-op"],
    aliases: ["#watermelon"], module: "watermelon", demo: true, motif: "melon",
    load: () => import("../outcam/watermelonGuide.js").then((m) => (root, locale, options) => new m.WatermelonGuide(root, locale, options)) }),
  define({ id: "solo-daitai-hero", exp: "EXP-018", collection: "SOLO", category: "SOLO",
    titleJa: "だいたい勇者", titleEn: "DAITAI HERO", subtitleJa: "顔を左右に動かして、だいたいの答えを選べ。", subtitleEn: "Lean left or right. Your best guess is your weapon.",
    input: ["FACE"], accent: "#efca7b", tags: ["quiz"], aliases: ["#daitai"], module: "daitai", demo: true, motif: "hero",
    load: () => import("../daitai/daitaiHeroView.js").then((m) => (root, locale) => new m.DaitaiHeroView(root, locale)) }),
]);

export const categories = ["SOLO", "DUO", "OUTCAM", "VOICE", "PHOTO / AR"];
export const inputs = ["HAND", "FACE", "BODY", "VOICE", "BLINK", "MOUTH", "PINCH"];
export const titleOf = (game, locale) => game[locale === "ja" ? "titleJa" : "titleEn"];
export const subtitleOf = (game, locale) => game[locale === "ja" ? "subtitleJa" : "subtitleEn"];

export function validateRegistry(list) {
  const errors = [], ids = new Set(), routes = new Set(), slugs = new Set();
  const required = ["id", "slug", "titleJa", "titleEn", "subtitleJa", "subtitleEn", "route", "category", "input", "players", "orientation", "duration", "status", "featured", "tags", "previewType", "previewAsset", "accent", "requiresCamera", "requiresMicrophone"];
  for (const game of list) {
    for (const field of required) if (!(field in game)) errors.push(`${game.id}: missing ${field}`);
    if (ids.has(game.id)) errors.push(`Duplicate canonical id: ${game.id}`);
    if (slugs.has(game.slug)) errors.push(`Duplicate slug: ${game.slug}`);
    ids.add(game.id); slugs.add(game.slug);
    if (!/^[a-z][a-z0-9-]+$/.test(game.id) || /^exp-\d+$/i.test(game.id)) errors.push(`Invalid canonical id: ${game.id}`);
    if (game.route !== `#/game/${game.slug}`) errors.push(`Invalid route: ${game.route}`);
    for (const route of [game.route, ...(game.aliases ?? [])]) {
      if (routes.has(route)) errors.push(`Duplicate route: ${route}`);
      routes.add(route);
    }
    if (!categories.includes(game.category) || !Array.isArray(game.input) || !game.input.length || game.input.some((input) => !inputs.includes(input))) errors.push(`${game.id}: invalid category/input`);
    if (!Number.isInteger(game.players) || game.players < 1 || !(game.duration > 0)) errors.push(`${game.id}: invalid players/duration`);
    if (!["portrait", "landscape", "any"].includes(game.orientation)) errors.push(`${game.id}: invalid orientation`);
    if (!["poster", "image", "video"].includes(game.previewType)) errors.push(`${game.id}: invalid previewType`);
    if (!/^#[0-9a-f]{6}$/i.test(game.accent)) errors.push(`${game.id}: invalid accent`);
    for (const field of ["featured", "requiresCamera", "requiresMicrophone"]) if (typeof game[field] !== "boolean") errors.push(`${game.id}: invalid ${field}`);
    if (!Array.isArray(game.tags)) errors.push(`${game.id}: invalid tags`);
    if (game.status === "playable" && typeof game.load !== "function") errors.push(`${game.id}: missing lazy loader`);
  }
  return errors;
}
