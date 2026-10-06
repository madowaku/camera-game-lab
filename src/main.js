import { registerSW } from "virtual:pwa-register";
import { mountPlatform } from "./platform/shell.js";
import { mountCameraInputDebugHud } from "./input/debugHud.js";

registerSW({ immediate: true });

const debugRequested = new URLSearchParams(location.search).get("inputDebug") === "1";
mountCameraInputDebugHud({
  available: import.meta.env.DEV || debugRequested,
  autoOpen: debugRequested
});

mountPlatform(document.querySelector("#app"));
