/** @typedef {{profile?:object,cameraMode?:'MIRROR'|'STAGE'|'FULL_REPLACE'|'MINI',modelUrl?:string}} PuppetConfig */
/**
 * @interface PuppetDriver
 * load(config): Promise<void>; update(MotionFrame, dtSeconds): void;
 * setVisible(boolean): void; reset(): void; dispose(): void.
 * Drivers consume normalized motion only; acquisition and rules stay outside.
 */
export const PUPPET_CAMERA_MODES = Object.freeze(['MIRROR', 'STAGE', 'FULL_REPLACE', 'MINI']);
