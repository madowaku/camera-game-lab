export function canShareVideo(file,navigator=globalThis.navigator) {
  try { return !!file && !!navigator?.share && !!navigator?.canShare?.({files:[file]}); } catch { return false; }
}
export function downloadVideo(file) {
  const url = URL.createObjectURL(file), link = document.createElement("a");
  link.href = url; link.download = file.name; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function shareVideo(file) {
  if (canShareVideo(file)) {
    try { await navigator.share({ files: [file], title: "SOFT SERVE 🍦" }); return "shared"; }
    catch (error) { if (error.name === "AbortError") return "cancelled"; }
  }
  downloadVideo(file); return "saved";
}
