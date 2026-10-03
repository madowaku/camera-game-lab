// Direct video sharing is connected only once Export provides a real File.
export function canShareVideo(file,navigator=globalThis.navigator) {
  return !!file&&!!navigator?.canShare?.({files:[file]});
}
