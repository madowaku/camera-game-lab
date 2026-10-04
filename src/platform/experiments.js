import { artworkAssets } from "./artworkAssets.js";
// Display numbers belong to a collection. Identity and routing never depend on them.
const loadSolo = () => import("../solo/soloExperience.js").then((m) => m.createSoloExperience);
const define = (entry) => Object.freeze({
  status: "playable", featured: false, orientation: "portrait", players: 1,
  duration: 30, previewType: "poster", previewAsset: null,
  requiresCamera: true, requiresMicrophone: false, tags: [], aliases: [],
  ...entry, ...(artworkAssets[entry.id] ? { previewType: "image", previewAsset: artworkAssets[entry.id] } : {}), route: `#/game/${entry.slug ?? entry.id}`, slug: entry.slug ?? entry.id,
});

export const experiments = Object.freeze([
  define({ id: "solo-hand-beat", exp: "EXP-001", collection: "SOLO", category: "SOLO",
    titleJa: "HAND BEAT", titleEn: "HAND BEAT", subtitleJa: "ビートに合わせて、手のカタチを変えよう。", subtitleEn: "Match the beat. Change the shape of your hand.",
    input: ["HAND"], duration: 15, featured: true, accent: "#d7ff3f", tags: ["rhythm"], previewType: "image", previewAsset: "/previews/hand-beat.webp",
    aliases: ["#hand-beat", "#handBeat"], module: "solo", mode: "handBeat", motif: "hand", load: loadSolo }),
  define({ id: "solo-finger-gun", exp: "EXP-002", collection: "SOLO", category: "SOLO",
    titleJa: "FINGER GUN", titleEn: "FINGER GUN", subtitleJa: "指でねらって、口を開けてBAN!", subtitleEn: "Aim with your finger. Open your mouth: BAN!",
    input: ["HAND", "MOUTH"], duration: 15, accent: "#ff855f", tags: ["aim", "action"],
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
    titleJa: "PINCH WORLD", titleEn: "PINCH WORLD", subtitleJa: "手で重ねて、グーで掴む。開いて置こう。", subtitleEn: "Move your palm. Fist to grab. Open to drop.",
    input: ["HAND"], duration: 30, accent: "#b7d6ab", tags: ["manipulation", "physics", "掴む"],
    aliases: ["#pinch-world"], module: "pinch", demo: true, motif: "pinch",
    load: () => import("../pinch/view.js").then((m) => m.createView) }),
  define({ id: "solo-ghost-trail", exp: "EXP-030", collection: "SOLO", category: "SOLO",
    titleJa: "GHOST TRAIL", titleEn: "GHOST TRAIL", subtitleJa: "さっき通った場所に、過去の自分がやってくる。", subtitleEn: "Your last move is your next obstacle. Outrun your past.",
    input: ["FACE", "BODY"], duration: 30, accent: "#8cdfff", tags: ["ghost", "history", "dodge", "過去", "回避"],
    aliases: ["#ghost-trail"], module: "ghost", demo: true, motif: "ghost",
    load: () => import("../ghost/view.js").then((m) => m.createView) }),
  define({ id: "solo-note-eater", exp: "EXP-016", collection: "SOLO", category: "SOLO",
    titleJa: "NOTE EATER", titleEn: "NOTE EATER", subtitleJa: "飛んでくる音符をパクッ。食べた音が、そのまま曲になる。", subtitleEn: "Catch a note. Take a bite. Make a little music.",
    input: ["FACE", "MOUTH"], duration: 30, accent: "#e96f51", tags: ["music", "pentatonic", "creator", "音楽", "口"],
    aliases: ["#note-eater"], module: "noteEater", demo: true, motif: "mouth", audioStrategy: "procedural", previewType: "image", previewAsset: "/previews/note-eater.webp",
    privacyJa: "インカメラで顔と口を追跡します。マイクは使いません。PLAYは録画せず、CREATORのリプレイは端末メモリだけに一時保存し、退出時に破棄します。外部には送信しません。初回はモデルをダウンロードします。",
    privacyEn: "Front camera tracks your face and mouth. No microphone. PLAY does not record. CREATOR keeps a temporary replay in device memory, discards it on exit and never uploads it. Models download on first use.",
    loadPresentation: () => import("../noteEater/presentation.js"),
    resultShare: (r, locale) => (r.source === "demo" ? locale === "ja" ? "【カメラなしの練習】" : "[Camera-free practice] " : "") + (locale === "ja" ? `${r.notesEaten}音をパクッ。自分だけの曲ができた！ MAX GROOVE ${r.maxGroove}` : `${r.notesEaten} notes eaten. A little tune of my own! MAX GROOVE ${r.maxGroove}`),
    load: () => import("../noteEater/view.js").then(m => m.createView) }),
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
  define({ id: "outcam-false-bridge", exp: "EXP-025", collection: "OUTCAM", category: "OUTCAM",
    titleJa: "FALSE BRIDGE", titleEn: "FALSE BRIDGE", subtitleJa: "身近な形が、橋になる。カメラを動かして世界をつなごう。", subtitleEn: "An ordinary shape. An extraordinary fit. Move your camera, mend a world.",
    launchReasonJa: "アウトカメラに映る身近な形を、白いガイドへ。スマホや物の位置・角度・距離を変えて、合ったと思ったらLOCK。5つの小さな世界を完成させよう。",
    launchReasonEn: "Use the rear camera to bring an everyday shape into the white guide. Move your phone or the object, change the distance, then tap LOCK when it fits. Complete five little worlds.",
    privacyJa: "アウトカメラだけを使います。LOCKした部分の画像はプレイ中だけ端末内に保持し、終了後の離脱時に破棄します。画像の保存・送信や認識モデルのダウンロードはありません。",
    privacyEn: "Rear camera only. Locked image cutouts stay in memory during play and are discarded when you leave. No image saving, uploads or recognition model downloads.",
    input: ["CAMERA"], duration: 120, accent: "#efc584", tags: ["perspective", "puzzle", "rear camera", "遠近法", "見立て"],
    aliases: ["#false-bridge"], module: "falseBridge", demo: true, motif: "bridge",
    load: () => import("../falseBridge/view.js").then(m => m.createView) }),
  define({ id: "outcam-frame-smuggler", exp: "EXP-035", collection: "OUTCAM", category: "OUTCAM",
    titleJa: "FRAME SMUGGLER", titleEn: "FRAME SMUGGLER", subtitleJa: "映せ、隠せ、戻せ！ふたりでフレーム密輸団。", subtitleEn: "Frame it. Hide it. Bring it back. Smuggle together.",
    launchReasonJa: "ひとりが撮影、もうひとりが運び屋。前後カメラを選び、片手を映してSTART。検問の間だけ、手元の宝石を画面外に隠そう。",
    launchReasonEn: "One camera operator, one smuggler. Choose a camera, show one hand, then press START. Keep the gem in frame, except during inspections!",
    input: ["HAND"], players: 2, duration: 30, accent: "#d7ff3f", tags: ["co-op", "rear camera", "front camera", "フレーム密輸団"],
    aliases: ["#frame-smuggler", "#smuggler"], module: "smuggler", demo: true, motif: "smuggler",
    load: () => import("../smuggler/view.js").then((m) => m.createView) }),
  define({ id: "solo-daitai-hero", exp: "EXP-018", collection: "SOLO", category: "SOLO",
    titleJa: "だいたい勇者", titleEn: "DAITAI HERO", subtitleJa: "左右へ動いて答える。中央はうなずく。", subtitleEn: "Lean left or right. Nod to choose the middle answer.",
    input: ["FACE"], accent: "#efca7b", tags: ["quiz"], aliases: ["#daitai"], module: "daitai", demo: true, motif: "hero",
    load: () => import("../daitai/daitaiHeroView.js").then((m) => (root, locale) => new m.DaitaiHeroView(root, locale)) }),
  define({ id: "outcam-the-camera-is-it", exp: "EXP-043", collection: "OUTCAM", category: "OUTCAM",
    titleJa: "THE CAMERA IS IT", titleEn: "THE CAMERA IS IT", subtitleJa: "映している場所だけ、世界が存在する。", subtitleEn: "Only the world you frame exists.",
    input: ["ORIENTATION"], duration: 25, accent: "#c2de9c", tags: ["rear camera", "framing", "puzzle", "視野", "5 stages"],
    launchReasonJa: "スマホを向けた場所だけ、足場が存在します。自動で歩く彼を出口へ。1ステージ15〜30秒、全5ステージ。",
    launchReasonEn: "Point your phone to create the path for an automatic walker. Five stages, 15–30 seconds each.",
    privacyJa: "アウトカメラと姿勢センサーを使います。映像は端末内で表示し、録画・送信しません。実写背景は途中でOFFにできます。",
    privacyEn: "Uses the rear camera and orientation sensor. Video stays on your device, without recording or uploading. You can switch the live background off during play.",
    aliases: ["#camera-is-it"], module: "camera-is-it", demo: true, motif: "viewfinder",
    load: () => import("../camera/view.js").then((m) => m.createView) }),
  define({ id: "solo-soft-serve", exp: "EXP-044", collection: "SOLO", category: "SOLO",
    titleJa: "SOFT SERVE", titleEn: "SOFT SERVE", subtitleJa: "もう一巻き、いける？ 手で巻いて、口でペロッ。", subtitleEn: "One more swirl? Stack with your hand. Eat with your mouth.",
    input: ["HAND", "MOUTH"], duration: 35, accent: "#e9b896", tags: ["soft serve", "ice cream", "AR", "ソフトクリーム", "巻く", "食べる"],
    launchReasonJa: "片手がコーンに。高く巻くほどボーナスUP。倒れる・溶ける前に、全部食べきろう！",
    launchReasonEn: "Your hand is the cone. Go taller for a bigger bonus. Eat it all before it melts or falls!",
    launchStepsJa: [["手のひらを中央へ", "つままず、リングが満ちたら左右に"], ["好きな高さまで", "もう一巻き？ 今やめてもOK"], ["横へ離して食べる", "口を近づけて、離して、ペロッ"]],
    launchStepsEn: [["Palm below the nozzle", "No pinching. Fill the ring, then swirl"], ["How high will you go?", "One more swirl? Your call"], ["Move sideways. Eat!", "Open wide, approach, pull away"]],
    privacyJa: "片手と口をインカメラで追跡します。PLAYは録画しません。CREATORはカメラ映像から共有動画を端末内で作り、退出時に破棄します。共有を選ぶまで外部へ送信しません。初回はモデルをダウンロードします。",
    privacyEn: "Front camera tracks your hand and mouth. PLAY does not record. CREATOR makes clips on your device and discards them on exit. Video is not sent until you choose Share. Models download on first use.",
    aliases: ["#soft-serve"], module: "softServe", demo: true, motif: "softServe",
    loadPresentation: () => import("../softServe/presentation.js"),
    resultShare: (r, locale) => {
      const practice = r.source === "demo" ? locale === "ja" ? "【カメラなしの練習】" : "[Camera-free practice] " : "";
      return practice + (locale === "ja" ? `${r.maxSwirls}段${r.outcome === "clean" ? "完食" : "つくった"}！君は何段いける？` : `${r.maxSwirls} swirls ${r.outcome === "clean" ? "eaten" : "made"}! How high can you go?`);
    },
    load: () => import("../softServe/view.js").then(m => m.createView) }),
  define({ id: "solo-handy-pals", exp: "EXP-045", collection: "SOLO", category: "SOLO",
    titleJa: "HANDY PALS", titleEn: "HANDY PALS", subtitleJa: "両手が、ふたりのダンサーになる。", subtitleEn: "Your hands become two tiny dancers.",
    input: ["HAND"], duration: 30, accent: "#e4bd88", tags: ["dance", "toy", "bear", "bunny", "ハイタッチ", "くま", "うさぎ"],
    aliases: ["#handy-pals"], module: "handyPals", demo: true, motif: "hand", previewType: "image", previewAsset: "/previews/handy-pals.webp",
    privacyJa: "両手をインカメラで追跡します。マイク・録画・外部送信はありません。最後の写真は端末メモリだけに保持し、保存・共有は自分で選べます。退出時に破棄します。初回は認識モデルをダウンロードします。",
    privacyEn: "Front camera tracks both hands. No microphone, recording or uploads. The final photo stays in device memory; saving and sharing are your choice. It is discarded on exit. Models download on first use.",
    loadPresentation: () => import("../handy/presentation.js"),
    resultShare: (r, locale) => (r.source === "demo" ? locale === "ja" ? "【カメラなしの練習】" : "[Camera-free practice] " : "") + (locale === "ja" ? `今日のふたり：${r.titleJa}。両手が、小さなダンサーになった！` : `Today's duo: ${r.titleEn}. My hands became two tiny dancers!`),
    load: () => import("../handy/view.js").then(m => m.createView) }),
  define({ id: "solo-body-wings", exp: "EXP-046", collection: "SOLO", category: "SOLO",
    titleJa: "BODY WINGS", titleEn: "BODY WINGS", subtitleJa: "腕をひろげる。かたむく。あなたが飛行機。", subtitleEn: "Spread your wings. Lean. You are the plane.",
    input: ["BODY"], duration: 30, accent: "#74d2f3", tags: ["flight", "AR", "creator", "翼", "飛行", "肩"],
    aliases: ["#body-wings", "#wings"], module: "bodyWings", demo: true, motif: "body", previewType: "image", previewAsset: "/previews/body-wings.webp",
    privacyJa: "インカメラで肩と腕を追跡します。マイクは使いません。PLAYは録画せず、CREATORのリプレイは端末メモリだけに一時保存し、退出時に破棄します。映像は外部送信しません。初回は認識モデルをダウンロードします。",
    privacyEn: "Front camera tracks shoulders and arms. No microphone. PLAY does not record. CREATOR keeps a temporary replay in device memory and discards it on exit. Video is never uploaded. Models download on first use.",
    loadPresentation: () => import("../wings/presentation.js"),
    resultShare: (r, locale) => (r.source === "demo" ? locale === "ja" ? "【カメラなしの練習】" : "[Camera-free practice] " : "") + (locale === "ja" ? `${r.rings}/${r.totalRings}リング、${r.distance}m飛んだ！ 最大コンボ ×${r.bestCombo}` : `${r.rings}/${r.totalRings} rings. ${r.distance}m flown! Best combo ×${r.bestCombo}`),
    load: () => import("../wings/view.js").then(m => m.createView) }),
  define({ id: "duo-palm-pong", exp: "EXP-048", collection: "DUO", category: "DUO",
    launchReadyJa: "PLAYで手の準備、STARTでラリー。", launchReadyEn: "PLAY to line up your hands. START to rally.",
    titleJa: "PALM PONG", titleEn: "PALM PONG", subtitleJa: "ふたりの手で、ラリーをつなごう。", subtitleEn: "Two hands. One little rally.",
    input: ["HAND"], players: 2, orientation: "landscape", duration: 30, accent: "#67c5a2", tags: ["co-op", "rally", "卓球", "協力", "二手"],
    aliases: ["#palm-pong"], module: "palmPong", demo: true, motif: "duo", previewType: "image", previewAsset: "/previews/palm-pong.webp",
    privacyJa: "二つの手をインカメラで追跡します。映像と手の位置は端末内で処理し、外部へ送信しません。マイク・録画・写真保存は使いません。初回は認識モデルをダウンロードします。練習ではカメラとモデルは不要です。",
    privacyEn: "Front camera tracks two hands. Video and hand positions stay on your device, without uploads. No microphone, recording or photos. Models download on first use. Practice needs neither camera nor models.",
    loadPresentation: () => import("../palmPong/presentation.js"),
    resultShare: (r, locale) => (r.source === "demo" ? locale === "ja" ? "【カメラなしの練習】" : "[Camera-free practice] " : "") + (locale === "ja" ? `ふたりの手で${r.bestRally}ラリー！君たちは何回つなげる？ PALM PONG` : `${r.bestRally} rallies with two hands! How far can you go together? PALM PONG`),
    load: () => import("../palmPong/view.js").then(m => m.createView) }),
  define({ id: "solo-toy-drum", exp: "EXP-047", collection: "SOLO", category: "SOLO",
    titleJa: "TOY DRUM", titleEn: "TOY DRUM", subtitleJa: "手を振り下ろす。ポコン！色が弾ける。", subtitleEn: "Hands down. Sounds up. Make some colorful noise!",
    input: ["HAND"], duration: 30, accent: "#f36651", tags: ["rhythm", "toy", "music", "両手", "ドラム"],
    aliases: ["#toy-drum", "#drum"], module: "toyDrum", demo: true, motif: "hand", previewType: "image", previewAsset: "/previews/toy-drum.webp",
    privacyJa: "インカメラで両手の中心と動きを追跡します。マイク・録画・外部送信はありません。初回は認識モデルをダウンロードします。",
    privacyEn: "Front camera tracks both palm centers and motion. No microphone, recording or uploads. The tracking model downloads on first use.",
    loadPresentation: () => import("../toyDrum/presentation.js"),
    resultShare: (r, locale) => (r.source === "demo" ? locale === "ja" ? "【カメラなしの練習】" : "[Camera-free practice] " : "") + (locale === "ja" ? `${r.hits}回ポコン！ ${r.score}点、最大コンボ×${r.bestCombo}${r.finishSuccess ? "。最後はBAAAN!!" : ""}` : `${r.hits} pops! ${r.score} points. Best combo ×${r.bestCombo}${r.finishSuccess ? ". BAAAN!!" : ""}`),
    load: () => import("../toyDrum/view.js").then(m => m.createView) }),
  define({ id: "solo-human-clock", exp: "EXP-050", collection: "SOLO", category: "SOLO",
    titleJa: "HUMAN CLOCK", titleEn: "HUMAN CLOCK", subtitleJa: "左は短針、右は長針。その指で時間をつくろう。", subtitleEn: "Left is hour. Right is minute. Make time with your hands.",
    input: ["HAND", "BODY"], duration: 30, orientation: "portrait", accent: "#98e4bb", tags: ["clock", "time", "puzzle", "時計", "両手", "上半身"],
    aliases: ["#human-clock", "#clock"], module: "humanClock", demo: true, motif: "hand", previewType: "image", previewAsset: "/previews/human-clock.webp",
    privacyJa: "インカメラで顔・肩・手首と両人差し指を追跡します。映像と位置は端末内で処理し、録画・外部送信はありません。マイクは使いません。初回は手と姿勢のモデルをダウンロードします。カメラなしの練習ではモデルも不要です。",
    privacyEn: "Front camera tracks your face, shoulders, wrists and both index fingertips. Video and positions stay on your device, without recording or uploads. No microphone. Hand and pose models download on first use. Camera-free practice needs no models.",
    loadPresentation: () => import("../humanClock/presentation.js"),
    resultShare: (r, locale) => (r.source === "demo" ? locale === "ja" ? "【カメラなしの練習】" : "[Camera-free practice] " : "") + (locale === "ja" ? `30秒で${r.score}個の時計をつくった！ ${r.difficulty.toUpperCase()} · 最大コンボ×${r.bestCombo} HUMAN CLOCK` : `${r.score} clocks made in 30 seconds! ${r.difficulty.toUpperCase()} · Best combo ×${r.bestCombo} HUMAN CLOCK`),
    load: () => import("../humanClock/view.js").then(m => m.createView) }),
]);

export const categories = ["SOLO", "DUO", "OUTCAM", "VOICE", "PHOTO / AR"];
export const inputs = ["HAND", "FACE", "BODY", "VOICE", "BLINK", "MOUTH", "PINCH", "CAMERA", "ORIENTATION"];
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
