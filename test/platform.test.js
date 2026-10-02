import test from "node:test";
import assert from "node:assert/strict";
import { experiments, validateRegistry } from "../src/platform/experiments.js";
import { resolveRoute, feedRoute } from "../src/platform/navigation.js";
import { createStorage } from "../src/platform/storage.js";
import { createFavorites } from "../src/platform/favorites.js";
import { createRecent } from "../src/platform/recent.js";
import { orderFeed, nextExperiment } from "../src/platform/ordering.js";
import { gameUrl, resultPayload, sharePayload } from "../src/platform/share.js";
import { createEvents, eventNames } from "../src/platform/events.js";
import { createLauncher, releaseResources, snapshotOf } from "../src/platform/launcher.js";

function memory() { const map = new Map(); return { getItem: (key) => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) }; }
test("registry describes every playable module and accepts namespaced display number collisions", () => {
  assert.deepEqual(validateRegistry(experiments), []);
  assert.equal(experiments.length, 11);
  assert.equal(experiments.filter((game) => game.exp === "EXP-020").length, 2);
  assert.equal(new Set(experiments.map((game) => game.id)).size, experiments.length);
});
test("registry rejects duplicate canonical ids, slugs, aliases and invalid metadata", () => {
  assert.match(validateRegistry([...experiments, experiments[0]]).join(" "), /Duplicate canonical id/);
  assert.match(validateRegistry([{ ...experiments[0], id: "exp-001" }]).join(" "), /Invalid canonical id/);
  assert.match(validateRegistry([{ ...experiments[0], input: ["UNKNOWN"], duration: 0 }]).join(" "), /invalid category\/input/);
  assert.match(validateRegistry([{ ...experiments[0], requiresCamera: "true" }]).join(" "), /invalid requiresCamera/);
  const missing = { ...experiments[0] }; delete missing.previewAsset;
  assert.match(validateRegistry([missing]).join(" "), /missing previewAsset/);
});
test("canonical and legacy deep links resolve to the same independent experiment", () => {
  for (const game of experiments) {
    assert.equal(resolveRoute(game.route).experiment, game);
    for (const alias of game.aliases) assert.equal(resolveRoute(alias).experiment, game);
  }
  assert.equal(resolveRoute("#duo").experiment.id, "duo-tiny-bot-duel");
  assert.equal(resolveRoute("#guardian").experiment.id, "guardian-spirit");
  for (const hash of ["", "#", "#/", "#feed"]) assert.equal(resolveRoute(hash).view, "feed");
  assert.equal(resolveRoute("#/explore").view, "explore");
  assert.deepEqual(resolveRoute(feedRoute(experiments[4].id)), { view: "feed", id: experiments[4].id });
  assert.equal(resolveRoute("#/feed/%invalid").view, "not-found");
  assert.equal(resolveRoute("#/game/missing").view, "not-found");
});
test("favorites persist across store instances, toggle independently of display numbers", () => {
  const backend = memory(), one = createFavorites(createStorage(() => backend));
  one.toggle("guardian-spirit"); one.toggle("duo-tiny-bot-duel");
  const two = createFavorites(createStorage(() => backend));
  assert.deepEqual(two.all(), ["guardian-spirit", "duo-tiny-bot-duel"]);
  assert.equal(two.toggle("guardian-spirit"), false);
  assert.equal(one.has("duo-tiny-bot-duel"), true);
});
test("blocked storage, corrupt data, and quota failures preserve session preferences", () => {
  const blocked = createFavorites(createStorage(() => { throw Error("blocked"); }));
  assert.equal(blocked.toggle("solo-hand-beat"), true); assert.equal(blocked.has("solo-hand-beat"), true);
  const corrupt = createFavorites(createStorage(() => ({ getItem: () => "{bad", setItem() {} })));
  assert.deepEqual(corrupt.all(), []);
  const quota = createFavorites(createStorage(() => ({ getItem: () => '["old"]', setItem() { throw Error("quota"); } })));
  quota.toggle("new"); assert.deepEqual(quota.all(), ["old", "new"]);
  const wrongShape = createFavorites(createStorage(() => ({ getItem: () => '{}', setItem() {} })));
  assert.deepEqual(wrongShape.all(), []);
});
test("recent history deduplicates, persists, keeps newest first and caps at 50", () => {
  const backend = memory(), history = createRecent(createStorage(() => backend));
  for (let i = 0; i < 55; i++) history.record(`game-${i}`, i);
  history.record("game-50", 99);
  const restored = createRecent(createStorage(() => backend)).all();
  assert.equal(restored.length, 50); assert.deepEqual(restored[0], { id: "game-50", playedAt: 99 });
  assert.equal(restored.filter((item) => item.id === "game-50").length, 1);
  assert.equal(restored.some((item) => item.id === "game-0"), false);
});
test("feed ordering is pure, deterministic, diverse and preference-aware", () => {
  const registryBefore = JSON.stringify(experiments), original = orderFeed(experiments);
  assert.equal(original[0].id, "solo-hand-beat");
  assert.deepEqual(original, orderFeed(experiments));
  assert.equal(original[1].category, "VOICE"); assert.equal(original[2].category, "DUO");
  const liked = orderFeed(experiments, { favorites: ["guardian-spirit"] });
  assert.ok(liked.findIndex((g) => g.id === "guardian-spirit") < original.findIndex((g) => g.id === "guardian-spirit"));
  const played = orderFeed(experiments, { recent: [{ id: "solo-hand-beat", playedAt: 1 }] });
  assert.notEqual(played[0].id, "solo-hand-beat");
  assert.equal(JSON.stringify(experiments), registryBefore);
  assert.equal(nextExperiment(original, original.at(-1).id), original[0]);
  assert.equal(orderFeed([{ ...experiments[0], status: "planned" }]).length, 0);
});
test("share adapters carry game, score, summary and canonical URL", () => {
  const game = experiments[0], payload = resultPayload(game, { score: 850, summary: "Great rhythm!" }, "en", "https://example.test/lab/?v=1#duo");
  assert.equal(payload.url, "https://example.test/lab/?v=1#/game/solo-hand-beat");
  assert.match(payload.text, /HAND BEAT · 850 pts · Great rhythm!/);
  assert.equal(gameUrl(experiments.find((entry) => entry.id === "duo-tiny-bot-duel"), "https://example.test"), "https://example.test/#/game/duo-tiny-bot-duel");
});
test("localized experiment result summaries preserve camera versus demo provenance in shares", () => {
  const game = experiments.find((entry) => entry.id === "solo-blink-horror");
  const camera = resultPayload(game, { score: 100, summaryJa: "カメラ · 脱出", summaryEn: "Camera · ESCAPED" }, "ja", "https://example.test");
  const demo = resultPayload(game, { score: 100, summaryJa: "デモ · 脱出", summaryEn: "Demo · ESCAPED" }, "en", "https://example.test");
  assert.match(camera.text, /カメラ · 脱出/); assert.match(demo.text, /Demo · ESCAPED/);
  assert.equal(camera.url, demo.url);
});
test("Web Share preferred; unsupported images still share text", async () => {
  let actual;
  const payload = { title: "test", text: "score", url: "https://example.test", files: [{}] };
  const outcome = await sharePayload(payload, { navigator: { canShare: () => false, share: async (data) => { actual = data; } } });
  assert.equal(outcome.method, "native"); assert.equal(actual.files, undefined);
});
test("native share failure falls back to clipboard, cancellation never copies", async () => {
  let copied;
  const nav = { share: async () => { throw Error("unavailable"); }, clipboard: { writeText: async (text) => { copied = text; } } };
  assert.equal((await sharePayload({ text: "Score 9", url: "https://example.test" }, { navigator: nav })).method, "clipboard");
  assert.equal(copied, "Score 9\nhttps://example.test");
  nav.share = async () => { throw Object.assign(Error(), { name: "AbortError" }); }; copied = null;
  assert.equal((await sharePayload({ url: "test" }, { navigator: nav })).method, "cancelled"); assert.equal(copied, null);
});
test("clipboard failure offers selectable text instead of reporting false success", async () => {
  const payload = { text: "Score 8", url: "https://example.test" };
  assert.deepEqual(await sharePayload(payload, { navigator: { clipboard: { writeText: async () => { throw Error("denied"); } } }, document: null }), { method: "manual", text: "Score 8\nhttps://example.test" });
});
test("platform event layer is subscribable and rejects undefined event names", () => {
  const bus = createEvents({ target: null }), events = [], off = bus.subscribe((event) => events.push(event));
  for (const name of eventNames) bus.emit(name, { id: "one" });
  assert.equal(events.length, 10); assert.ok(events.every((event) => event.id === "one" && Number.isFinite(event.timestamp)));
  off(); bus.emit("retry"); assert.equal(events.length, 10); assert.throws(() => bus.emit("tracking"));
});

function fakeDom(t) {
  const original = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", { configurable: true, value: { createElement: () => ({ hidden: true, querySelector: () => null }) } });
  t.after(() => { if (original) Object.defineProperty(globalThis, "document", original); else delete globalThis.document; });
  return { children: [], append(node) { this.children.push(node); } };
}
function fakeView(root) {
  return { root, active: false, phase: "idle", starts: 0, stops: 0, input: { stop() {} }, setLocale() {}, render() {},
    activate() { this.active = true; root.hidden = false; }, deactivate() { this.active = false; this.stops++; root.hidden = true; },
    startCamera() { this.starts++; },
  };
}
test("lazy launch does not import on creation, request sensors on prepare, or instantiate a stale import", async (t) => {
  const root = fakeDom(t); let resolve, loads = 0;
  const pending = new Promise((done) => { resolve = done; });
  const game = { id: "fake-game", module: "fake", load: () => { loads++; return pending; } };
  const launcher = createLauncher(root, { onState() {} });
  assert.equal(loads, 0);
  const prepared = launcher.prepare(game, "en"); launcher.stop(); resolve(fakeView);
  assert.equal(await prepared, null); assert.equal(root.children.length, 0);
  const entry = await launcher.prepare(game, "en"); assert.equal(entry.instance.starts, 0);
  launcher.begin(); assert.equal(entry.instance.starts, 1);
  launcher.stop(); assert.equal(entry.instance.active, false);
});
test("switch and retry release the previous game and reuse only a dormant controller", async (t) => {
  const root = fakeDom(t), launcher = createLauncher(root, { onState() {} });
  const game = { id: "one", module: "one", load: async () => fakeView };
  const entry = await launcher.prepare(game, "en"); launcher.begin();
  launcher.retry("camera"); assert.equal(entry.instance.stops, 1); assert.equal(entry.instance.starts, 2);
  await launcher.prepare({ ...game, id: "two", module: "two" }, "en");
  assert.equal(entry.instance.active, false); assert.equal(entry.instance.stops, 2);
  const again = await launcher.prepare(game, "en"); assert.equal(again, entry); assert.equal(root.children.length, 2);
  launcher.stop();
});
test("result cleanup releases both camera and mic; result adapter leaves game data intact", () => {
  const stopped = []; const instance = { input: { stop: () => stopped.push("input") }, voice: { stop: () => stopped.push("voice") }, face: { stop: () => stopped.push("face") }, phase: "result", score: 300, hits: 3 };
  releaseResources(instance); assert.deepEqual(stopped, ["input", "voice", "face"]);
  assert.deepEqual(snapshotOf(instance, "watermelon").result, { score: 300, hits: 3 });
});
test("DUO input snapshot data is not confused with the optional controller snapshot method", () => {
  const instance = { snapshot: { ready: true, players: [] }, phase: "result", result: { hits: [2, 3], winner: 1, reason: "TIME" } };
  assert.deepEqual(snapshotOf(instance, "duo").result, { score: 5, winner: 1, reason: "TIME" });
});
