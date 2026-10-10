const floor = (x, y, width, jump = false) => ({ x, y, width, height: 24, jump });
export const stages = [
  { title: "LOOK AHEAD", hint: "ahead", start: { x: 120, y: 980 }, camera: { x: 400, y: 870 },
    platforms: [floor(0, 1000, 430), floor(430, 1000, 420), floor(850, 1000, 400), floor(1250, 1000, 230)] },
  { title: "DON'T FORGET BEHIND", hint: "both", start: { x: 120, y: 980 }, camera: { x: 400, y: 870 },
    platforms: [floor(0, 1000, 400, true), floor(560, 1000, 300, true), floor(1020, 1000, 460)] },
  { title: "LOOK UP", hint: "up", start: { x: 120, y: 980 }, camera: { x: 400, y: 1000 },
    platforms: [floor(0, 1000, 400, true), floor(540, 360, 330, true), floor(1010, 260, 330), floor(1340, 260, 370, true), floor(1860, 680, 640)] },
  { title: "TWO WORLDS", hint: "frame", start: { x: 120, y: 980 }, camera: { x: 400, y: 870 },
    platforms: [floor(0, 1000, 380, true), floor(530, 420, 240, true), floor(1020, 1110, 240, true), floor(1510, 460, 240, true), floor(2020, 1020, 480)] },
  { title: "THE CAMERA IS IT", hint: "choose", start: { x: 120, y: 980 }, camera: { x: 400, y: 870 },
    platforms: [floor(0, 1000, 370, true), floor(510, 720, 290, true), floor(940, 450, 280, true), floor(1390, 1100, 280, true), floor(1810, 760, 240, true), floor(2170, 480, 380)] },
];

const ruled = (id, x, width, rule, options = {}) => ({ ...floor(x, 1000, width), objectId: id, rule, ...options });
const chapterStage = (title, hint, platforms, options = {}) => ({ title, hint,
  start: { x: 120, y: 980 }, camera: { x: 400, y: 870 }, warmupRules: false, platforms, ...options });
stages.push(
  chapterStage('FOCUS', 'focus', [floor(0, 1000, 430), ruled('PLATFORM_06_A', 430, 250, 'FOCUS_HOLD', { centerHold: true, holdRadius: 96 }), floor(680, 1000, 650)], { tutorialGate: true }),
  chapterStage('AFTERIMAGE', 'memory', [floor(0, 1000, 430), ruled('PLATFORM_07_A', 430, 260, 'AFTERIMAGE', { memoryMs: 2500 }), ruled('PLATFORM_07_EXIT', 980, 620, 'VISIBLE', { anchor: { x: 1510, y: 1000 } })], { tutorialGate: true }),
  chapterStage('OUT OF FRAME', 'exclude', [floor(0, 1000, 430), ruled('BRIDGE_08', 430, 350, 'EXCLUDE', { blocker: { x: 260, y: 610, width: 0 } }), floor(780, 1000, 650)], { tutorialGate: true }),
  chapterStage('TWO AT ONCE', 'linked', [floor(0, 1000, 430), ruled('BRIDGE_09', 430, 400, 'LINKED', { linkedGroup: 'A' }), floor(830, 1000, 550)], {
    anchors: [{ id: 'A1', linkedGroup: 'A', x: 300, y: 610, width: 0 }, { id: 'A2', linkedGroup: 'A', x: 1000, y: 610, width: 0 }],
  }),
  chapterStage('FRAME / UNFRAME', null, [floor(0, 1000, 430), ruled('A', 430, 220, 'FOCUS_HOLD', { memoryMs: 1500 }),
    ruled('MEMORY', 650, 220, 'AFTERIMAGE'), ruled('BRIDGE', 870, 300, 'LINKED', { linkedGroup: 'final' }),
    ruled('D', 1170, 100, 'EXCLUDE', { y: 1300, blocker: { x: 710, y: 610, width: 0 } }), floor(1270, 1300, 550)], {
    anchors: [{ id: 'B', linkedGroup: 'final', x: 710, y: 610, width: 0 }, { id: 'C', linkedGroup: 'final', x: 1410, y: 610, width: 0 }],
  }),
);

export const VIEW = Object.freeze({ width: 800, height: 1000, margin: .1 });
export const WORLD = Object.freeze({ width: 3000, height: 1800 });
