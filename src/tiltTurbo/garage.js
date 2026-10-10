// Every race is reproducible: no procedural randomness or remote assets.
const freezeCourse = ({ id, en, ja, sky, ground, road, path, cones, traffic }) =>
  Object.freeze({ id, en, ja, sky, ground, road,
    path: Object.freeze(path.map(pair => Object.freeze(pair))),
    cones: Object.freeze(cones.map(([at, offset]) => Object.freeze({ at, offset }))),
    traffic: Object.freeze(traffic.map(([at, offset, seed, color, speedRatio]) =>
      Object.freeze({ at, offset, seed, color, speedRatio }))) });
export const COURSES = Object.freeze([
  freezeCourse({
    id: 'toy-town', en: 'Toy Town', ja: 'おもちゃタウン',
    sky: '#fff7df', ground: '#bad5b1', road: '#385652',
    path: [[0,0],[2200,0],[4100,-.70],[6100,.70],[8300,-.76],[10500,.76],[12800,-.84],
      [14700,.15],[15600,-.90],[16600,.90],[17600,-.90],[18500,0],[20000,0]],
    cones: [[4200,.31],[6500,-.35],[8800,.33],[11100,-.34],[13600,.30],[15900,.34],[17200,-.35]],
    traffic: [[5300,-.33,1,'#f4b34f',.20],[9500,.35,2,'#79b9df',.28],
      [13000,-.38,3,'#df7ac6',.17],[17800,.27,4,'#f4b34f',.23]],
  }),
  freezeCourse({
    id: 'seaside', en: 'Sunset Coast', ja: 'サンセット海岸',
    sky: '#ffe6ad', ground: '#71bbbf', road: '#315e70',
    path: [[0,0],[1900,0],[3200,.65],[5400,.64],[6900,-.65],[9300,-.58],
      [11100,.8],[13000,-.18],[14700,.72],[16200,-.70],[17900,.40],[20000,0]],
    cones: [[3400,-.3],[7600,.35],[11800,-.29],[14600,.32],[18000,-.36]],
    traffic: [[4100,.22,2,'#ea899a',.24],[8000,-.27,3,'#f6de64',.33],
      [11600,.19,4,'#9bd97d',.18],[15500,-.2,5,'#ea899a',.24],[18700,.28,6,'#f6de64',.30]],
  }),
  freezeCourse({
    id: 'neon', en: 'Neon Express', ja: 'ネオン高速',
    sky: '#251f4b', ground: '#38306c', road: '#252c51',
    path: [[0,0],[1400,0],[2800,-.75],[4400,.82],[6000,-.82],[7700,.73],
      [9400,-.65],[11300,.70],[13100,-.7],[14800,.81],[16600,-.85],[18500,.55],[20000,0]],
    cones: [[3200,.30],[5000,-.32],[8300,.29],[10800,-.36],[14400,.29],[17300,-.34]],
    traffic: [[2700,.28,2,'#59e6d3',.32],[5600,-.31,3,'#f58aee',.26],
      [9100,.29,4,'#ffdc78',.22],[12500,-.3,5,'#59e6d3',.33],
      [15800,.35,6,'#f58aee',.24],[18900,-.19,7,'#ffdc78',.20]],
  }),
]);
export const CARS = Object.freeze([
  Object.freeze({ id:'roadster', en:'Roadster', ja:'ロードスター', color:'#f16b39', steeringGain:1, responseMs:110, cooldownMs:650 }),
  Object.freeze({ id:'kart', en:'Mini Kart', ja:'ミニカート', color:'#ffc44e', steeringGain:1.12, responseMs:90, cooldownMs:750 }),
  Object.freeze({ id:'van', en:'Boxy Van', ja:'ボックスバン', color:'#9cd4e4', steeringGain:.90, responseMs:140, cooldownMs:500 }),
]);
export const pickCourse = id => COURSES.find(c=>c.id===id) ?? COURSES[0];
export const pickCar = id => CARS.find(c=>c.id===id) ?? CARS[0];
