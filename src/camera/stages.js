const floor = (x, y, width, jump = false) => ({ x, y, width, height: 24, jump });
export const stages = [
  { title: "LOOK AHEAD", hint: "ahead", start: { x: 120, y: 980 }, camera: { x: 400, y: 870 },
    platforms: [floor(0, 1000, 430), floor(430, 1000, 420), floor(850, 1000, 400), floor(1250, 1000, 420), floor(1670, 1000, 400), floor(2070, 1000, 500)] },
  { title: "DON'T FORGET BEHIND", hint: "both", start: { x: 120, y: 980 }, camera: { x: 400, y: 870 },
    platforms: [floor(0, 1000, 400, true), floor(560, 1000, 300, true), floor(1040, 1000, 300, true), floor(1520, 1000, 300, true), floor(2000, 1000, 520)] },
  { title: "LOOK UP", hint: "up", start: { x: 120, y: 980 }, camera: { x: 400, y: 1000 },
    platforms: [floor(0, 1000, 400, true), floor(540, 360, 330, true), floor(1010, 260, 330), floor(1340, 260, 370, true), floor(1860, 680, 640)] },
  { title: "TWO WORLDS", hint: "frame", start: { x: 120, y: 980 }, camera: { x: 400, y: 870 },
    platforms: [floor(0, 1000, 380, true), floor(530, 420, 240, true), floor(1020, 1110, 240, true), floor(1510, 460, 240, true), floor(2020, 1020, 480)] },
  { title: "THE CAMERA IS IT", hint: "choose", start: { x: 120, y: 980 }, camera: { x: 400, y: 870 },
    platforms: [floor(0, 1000, 370, true), floor(510, 720, 290, true), floor(940, 450, 280, true), floor(1390, 1100, 280, true), floor(1810, 760, 240, true), floor(2170, 480, 380)] },
];

export const VIEW = Object.freeze({ width: 800, height: 1000, margin: .1 });
export const WORLD = Object.freeze({ width: 3000, height: 1800 });
