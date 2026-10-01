export class FrontCameraUnavailableError extends Error {
  constructor(cause) {
    super("A front-facing camera could not be opened.", { cause });
    this.name = "FrontCameraUnavailableError";
  }
}

// Plain facingMode: "user" is only a preference. Require the phone's front
// camera, and inspect the returned track before exposing it to an experiment.
export async function openFrontCamera(mediaDevices, constraints, checkActive = () => {}) {
  const video = { ...constraints.video, facingMode: { exact: "user" } };
  let stream;
  try {
    stream = await mediaDevices.getUserMedia({ ...constraints, video });
  } catch (error) {
    checkActive();
    if (error.name === "NotFoundError") throw new FrontCameraUnavailableError(error);
    if (error.name !== "OverconstrainedError" || error.constraint !== "facingMode") throw error;
    // Some external PC webcams have no facing-mode metadata. Allow them only
    // when the returned track does not identify itself as a non-front camera.
    stream = await mediaDevices.getUserMedia({ ...constraints, video: { ...video, facingMode: { ideal: "user" } } });
  }
  try {
    checkActive();
    const track = stream.getVideoTracks()[0];
    const facing = track?.getSettings?.().facingMode;
    const modes = track?.getCapabilities?.().facingMode ?? [];
    if (!track || (facing && facing !== "user") || (!facing && modes.length && !modes.includes("user"))) {
      throw new FrontCameraUnavailableError();
    }
    return stream;
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop());
    throw error;
  }
}
