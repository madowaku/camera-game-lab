import { registerSW } from "virtual:pwa-register";
import { mountPlatform } from "./platform/shell.js";

registerSW({ immediate: true });
mountPlatform(document.querySelector("#app"));
