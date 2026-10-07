// Prefer the phone's rear camera, but permit metadata-free desktop webcams.
export async function openRearCamera(mediaDevices, constraints, checkActive = () => {}) {
  const video = { ...constraints.video, facingMode: { exact: 'environment' } };
  let stream;
  try { stream = await mediaDevices.getUserMedia({ ...constraints, video }); }
  catch (error) {
    checkActive();
    if (error.name !== 'OverconstrainedError' || error.constraint !== 'facingMode') throw error;
    stream = await mediaDevices.getUserMedia({ ...constraints, video: { ...video, facingMode: { ideal: 'environment' } } });
  }
  try {
    checkActive(); const track = stream.getVideoTracks()[0];
    const facing = track?.getSettings?.().facingMode, modes = track?.getCapabilities?.().facingMode ?? [];
    if (!track || (facing && facing !== 'environment') || (!facing && modes.length && !modes.includes('environment'))) throw Error('Rear camera unavailable.');
    return stream;
  } catch (error) { stream.getTracks().forEach(track => track.stop()); throw error; }
}
