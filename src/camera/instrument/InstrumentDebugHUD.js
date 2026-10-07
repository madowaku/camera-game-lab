export function instrumentDebug(instrument, found) {
  const point = instrument.detector.point;
  return `HAND ${found ? 'FOUND' : 'LOST'}\nINDEX ${point ? `${point.x.toFixed(3)} / ${point.y.toFixed(3)}` : '—'}\nVELOCITY ${instrument.detector.velocity.toFixed(3)}\n${instrument.zones.map((z, i) => `#${i + 1} ${z.state} ${z.armed ? 'READY' : 'LIFT TO REARM'}`).join('\n')}`;
}
