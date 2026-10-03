// Same illustrated material language in play, independent of OS emoji fonts.
const drawings = {
  OPEN: '<path d="M34 95 16 66q-5-10 5-12l14 12V31q0-11 10-9v34-39q0-11 10-9v46-32q0-11 10-9v44-23q0-10 10-8v41q0 18-15 29v12H34Z" fill="#f1c6a0"/><path d="M38 72q22-12 31 4" fill="none"/>',
  FIST: '<path d="M31 94q-16-18-12-42l6-21q3-10 13-5 5-11 16-5 9-7 18 0 11-3 16 8l2 34q0 17-20 28v14H31Z" fill="#f1c6a0"/><path d="M37 30v23m18-30v29m17-28v28M22 56q13-16 26 0l12 19" fill="none"/>',
  PEACE: '<path d="M36 97q-16-13-17-34-1-13 13-8l11 12-15-46q-4-12 6-14 8-1 11 9l12 35 10-36q4-13 13-9 8 3 4 15L73 58q20-8 20 7-1 19-24 31v12H36Z" fill="#f1c6a0"/><path d="m40 66 21 14m12-22-7 15" fill="none"/>',
  THUMB_UP: '<path d="M43 105V57l17-22V16q0-12 10-9 10 4 6 24l-5 19h25q13 0 10 15l-8 29q-3 11-19 11Z" fill="#f1c6a0"/><path d="M16 58h27v47H16Z" fill="#accdc0"/><path d="M78 64h25m-28 15h23m-26 15h22" fill="none"/>',
  camera: '<rect x="13" y="30" width="94" height="67" rx="14" fill="#accdc0"/><path d="m35 30 8-13h31l9 13" fill="#accdc0"/><circle cx="60" cy="62" r="23" fill="#f8e7bc"/><circle cx="60" cy="62" r="12" fill="#638d80"/><circle cx="94" cy="43" r="3" fill="#eb9b7c"/>',
  mouth: '<path d="M17 57q41-42 86 0-43 67-86 0Z" fill="#dd958d"/><path d="M28 59q31-16 64 0-33 42-64 0Z" fill="#593f3b"/><path d="M36 58h47v13H36Z" fill="#fff5dc"/>',
  apple: '<path d="M59 39Q32 20 19 48 5 86 35 102q15 8 25-1 11 9 27 0 26-24 12-52-13-24-40-10Z" fill="#ee8972"/><path d="M60 39q-2-21 14-29m-9 14q11-19 28-11-7 18-28 11" fill="#80a879"/><path d="M33 49q-8 10-5 23" fill="none" stroke="#ffedc9" stroke-width="6"/>',
  pizza: '<path d="m21 19 83 31-67 61Z" fill="#f1d18b"/><path d="m21 19 83 31" stroke="#c28b59" stroke-width="13"/><path d="m26 29 63 24" stroke="#ee9277" stroke-width="5"/><circle cx="40" cy="49" r="8" fill="#d97d65"/><circle cx="56" cy="68" r="8" fill="#d97d65"/><circle cx="38" cy="91" r="6" fill="#d97d65"/>',
  broccoli: '<path d="m42 66 7 41h26l-1-45Z" fill="#a5b976"/><path d="M24 73Q4 68 17 48 10 25 35 27 43 4 64 22 87 8 96 31 118 41 104 60 112 84 87 81 71 96 58 79 35 92 24 73Z" fill="#80a77a"/><path d="m49 75 13 21 15-22M32 48q9-13 20-4m23-4q11-11 19 1" fill="none"/>',
  cake: '<path d="M21 50 76 24l26 28v52H21Z" fill="#f2c99b"/><path d="M21 69h81v14H21Z" fill="#eab1af"/><path d="M21 50 76 24l26 28q-19 20-31 7-17 19-29 4-17 15-21-13Z" fill="#fff1d1"/><path d="M57 27q-9-16 2-21 13-3 14 15Z" fill="#e68972"/>',
  sushi: '<rect x="17" y="45" width="86" height="57" rx="19" fill="#fff0d2"/><path d="M14 54q-3-35 36-35h36q26 4 21 31L71 72Z" fill="#ea9c7c"/><path d="m34 27 12 27m13-31 13 29m12-26 11 19" stroke="#f8cca4" stroke-width="5"/><path d="M51 25h18v76H51Z" fill="#5a7860"/>',
  watermelon: '<path d="M13 37h94q-4 68-47 72-43-4-47-72Z" fill="#83ac7d"/><path d="M22 40h76q-4 55-38 60-34-5-38-60Z" fill="#fff1c9"/><path d="M30 45h60q-4 40-30 48-26-8-30-48Z" fill="#eb8b77"/><path d="m43 57 2 4m26-4 2 4m-16 16 2 4"/>',
  sock: '<path d="M41 13h44v55l22 19q7 20-18 20H41q-16-1-16-18V45Z" fill="#b4bdcf"/><path d="M41 29h44M26 87q19-3 23 19m36-38-19 20" fill="none"/><path d="M42 49h43v14H42Z" fill="#e8b8a4"/>',
  soap: '<rect x="19" y="40" width="82" height="61" rx="19" fill="#d3bfd0"/><path d="M29 53h61" stroke="#f5e7d3" stroke-width="7"/><path d="M46 69q15-8 29 0v16H46Z" fill="#f5e7d3"/><circle cx="28" cy="24" r="10" fill="#f5e7d3"/><circle cx="64" cy="15" r="6" fill="#f5e7d3"/><circle cx="99" cy="27" r="8" fill="#f5e7d3"/>',
  battery: '<rect x="42" y="12" width="35" height="13" rx="4" fill="#f3d0a1"/><rect x="29" y="25" width="60" height="82" rx="11" fill="#88b3aa"/><path d="M29 43h60m-33 11-14 22h15l-3 18 23-30H62l3-10Z" fill="#fff0c8"/>',
  cactus: '<path d="M43 81V25q0-23 26-18 12 3 12 18v21h11V27q0-12 10-10 10 0 10 14v22q-1 15-31 16v12H43ZM43 65Q9 71 8 48V36q0-13 11-12 10 1 10 14v10h14" fill="#8eac7e"/><path d="m58 22 4 5m2 18-4 7m-5 11 7 2m34-28 6 3"/><path d="M30 80h62l-9 29H38Z" fill="#e2b78d"/>',
  shoe: '<path d="M13 74q0-19 20-34l16-19 26 10 4 24 30 23v23H13Z" fill="#b3bbcd"/><path d="m39 35 33 18m-38-2 32 17m-39-1 28 16" stroke="#fff0cc" stroke-width="5"/><path d="M13 91h96v13H13Z" fill="#fff0cc"/>',
  scissors: '<path d="M49 67 93 11 67 72 97 45 58 79" fill="#ccd0c3"/><circle cx="35" cy="81" r="19" fill="#eaa786"/><circle cx="83" cy="96" r="16" fill="#eaa786"/><circle cx="35" cy="81" r="10" fill="#fff0cc"/><circle cx="83" cy="96" r="8" fill="#fff0cc"/><circle cx="57" cy="69" r="6" fill="#fff0cc"/>',
};
const handFrames = { OPEN:[0,0,635,619], FIST:[635,0,636,619], PEACE:[0,619,635,619], THUMB_UP:[635,619,636,619] };
const foodFrames = Object.fromEntries(["apple","pizza","broccoli","cake","sushi","watermelon","sock","soap","battery","cactus","shoe","scissors"].map((key,index)=>[key,[index%4*362,index<4?0:index<8?375:705,362,index<4?375:index<8?330:381]]));
foodFrames.shoe=[710,705,380,381];foodFrames.scissors=[1090,705,358,381];
export function illustrationMarkup(kind) {
  const frame = handFrames[kind] ?? foodFrames[kind];
  if (frame) {
    const [x,y,w,h] = frame, hand = !!handFrames[kind];
    return `<svg class="solo-illustration solo-illustration--generated" viewBox="0 0 ${w} ${h}" aria-hidden="true"><image href="/artwork/sprites/${hand ? "hand-sprites" : "food-sprites"}-v1.webp" x="${-x}" y="${-y}" width="${hand ? 1271 : 1448}" height="${hand ? 1238 : 1086}"/></svg>`;
  }
  return `<svg class="solo-illustration" viewBox="0 0 120 120" aria-hidden="true"><g stroke="#35483e" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">${drawings[kind]??drawings.camera}</g></svg>`;
}
export function paintIllustration(element,kind) {
  if(element.dataset.illustration===kind)return;
  element.dataset.illustration=kind;element.innerHTML=illustrationMarkup(kind);
}
