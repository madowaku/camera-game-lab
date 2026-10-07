export const banks = Object.freeze({
  pentatonic: ['C4', 'D4', 'E4', 'G4', 'A4'],
  drums: ['kick', 'snare', 'hat', 'tom', 'clap'],
  toy: ['bell', 'pop', 'boing', 'bubble', 'sparkle'],
});
export const zoneColors = ['#f2be65', '#a9dcd1', '#ef967d', '#b7c9ef', '#d8afe0'];
export const presetBanks = Object.freeze({ 'toy-piano': 'pentatonic', 'toy-drum': 'drums', 'toy-sounds': 'toy' });
export function presetZones(preset = 'toy-piano') {
  if (!presetBanks[preset]) throw new TypeError('Unknown instrument preset.');
  const sounds = banks[presetBanks[preset]];
  return sounds.map((soundId, i) => ({ x: [.23, .72, .5, .23, .75][i], y: [.35, .35, .53, .72, .72][i], soundId }));
}
