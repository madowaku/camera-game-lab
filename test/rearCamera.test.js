import test from 'node:test';
import assert from 'node:assert/strict';
import { openRearCamera } from '../src/input/rearCamera.js';

const constraints = { audio: false, video: { width: { ideal: 720 }, height: { ideal: 1280 } } };
const stream = (facing, modes = []) => {
  const video = { stopped: false, stop() { this.stopped = true; }, getSettings: () => ({ facingMode: facing }), getCapabilities: () => ({ facingMode: modes }) };
  const audio = { stopped: false, stop() { this.stopped = true; } };
  return { video, audio, getVideoTracks: () => [video], getTracks: () => [video, audio] };
};

test('rear camera requests exact environment without modifying caller constraints', async () => {
  const rear = stream('environment'); let request;
  const result = await openRearCamera({ getUserMedia: async c => { request = c; return rear; } }, constraints);
  assert.equal(result, rear); assert.deepEqual(request.video.facingMode, { exact: 'environment' });
  assert.equal(request.audio, false); assert.deepEqual(request.video.width, { ideal: 720 });
  assert.equal(constraints.video.facingMode, undefined); assert.equal(rear.video.stopped, false);
});
test('only a facingMode constraint failure allows a metadata-free desktop fallback', async () => {
  const desktop = stream(undefined); const requests = [];
  const result = await openRearCamera({ getUserMedia: async c => {
    requests.push(c); if (requests.length === 1) throw Object.assign(Error('Exact mode unavailable'), { name: 'OverconstrainedError', constraint: 'facingMode' });
    return desktop;
  } }, constraints);
  assert.equal(result, desktop); assert.equal(requests.length, 2);
  assert.deepEqual(requests[1].video.facingMode, { ideal: 'environment' });
});
test('camera permission and unrelated constraint failures are never retried', async () => {
  for (const error of [Object.assign(Error('Denied'), { name: 'NotAllowedError' }), Object.assign(Error('Width'), { name: 'OverconstrainedError', constraint: 'width' })]) {
    let requests = 0;
    await assert.rejects(openRearCamera({ getUserMedia: async () => { requests++; throw error; } }, constraints), e => e === error);
    assert.equal(requests, 1);
  }
});
test('explicit front-facing metadata and front-only capabilities release all acquired tracks', async () => {
  for (const rejected of [stream('user'), stream(undefined, ['user'])]) {
    await assert.rejects(openRearCamera({ getUserMedia: async () => rejected }, constraints), /Rear camera unavailable/);
    assert.equal(rejected.video.stopped, true); assert.equal(rejected.audio.stopped, true);
  }
});
test('leaving during camera acquisition releases the late stream', async () => {
  const rear = stream('environment'), aborted = Object.assign(Error('Left session'), { name: 'AbortError' });
  await assert.rejects(openRearCamera({ getUserMedia: async () => rear }, constraints, () => { throw aborted; }), e => e === aborted);
  assert.equal(rear.video.stopped, true); assert.equal(rear.audio.stopped, true);
});
test('an inactive session cannot launch the fallback camera request', async () => {
  let requests = 0;
  await assert.rejects(openRearCamera({ getUserMedia: async () => { requests++; throw Object.assign(Error(), { name: 'OverconstrainedError', constraint: 'facingMode' }); } }, constraints, () => { throw Object.assign(Error(), { name: 'AbortError' }); }), { name: 'AbortError' });
  assert.equal(requests, 1);
});
