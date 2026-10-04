// Game facts only. Selection and editing live in the shared director modules.
export class SoftServeDirectorEvents {
  constructor(emit) { this.emit = emit; this.firstAction = false; this.firstSuccess = false; this.combo = 0; this.nearMiss = false; this.completed = false; }
  observe(game, timestamp) {
    const send = (type, metadata = {}) => this.emit({ type, timestamp, score: game.result?.score, metadata });
    if (!this.firstAction && game.phase !== "ready") { this.firstAction = true; send("FIRST_ACTION"); }
    if (!this.firstSuccess && game.maxAmount >= .35) { this.firstSuccess = true; send("FIRST_SUCCESS"); }
    const combo = Math.floor(game.amount / 3);
    if (game.phase === "serve" && combo > this.combo && game.beauty >= .72 && game.stability > .7) { this.combo = combo; send("COMBO", { swirls: Math.floor(game.amount) }); }
    const danger = game.amount > 1 && game.stability < .45 && game.phase !== "result";
    if (danger && !this.nearMiss) send("NEAR_MISS", { lean: game.lean });
    this.nearMiss = danger;
    if (this.previousPhase === "serve" && game.phase === "eat" && game.beauty >= .72 && game.maxAmount >= 3) send("BIG_SUCCESS", { swirls: Math.floor(game.maxAmount) });
    if (game.result && !this.completed) {
      this.completed = true;
      send(game.result.outcome === "clean" ? "HERO" : "FAIL", { outcome: game.result.outcome });
      send("REACTION_WINDOW", { outcome: game.result.outcome });
    }
    this.previousPhase = game.phase;
  }
}
