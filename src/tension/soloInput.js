import { DuelInput } from './handInput.js';
// Use the same front-camera resolution and mirrored object-cover projection.
// Two candidates allow positional ownership to survive a second visible hand;
// SOLO still owns exactly one active net and never uses handedness labels.
export class SoloInput extends DuelInput {}
