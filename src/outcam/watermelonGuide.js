import { RearHandInput } from "./rearHandInput.js";
import { WATERMELON_RULES, createWatermelonTarget, gradeStrike } from "./watermelonRules.js";
import { translate } from "../i18n.js";
import "./watermelonGuide.css";

export class WatermelonGuide {
  constructor(root, locale = "ja", { onExit } = {}) {
    this.root = root;
    this.locale = locale;
    this.onExit = onExit ?? (() => {});
    this.active = false;
    this.status = "OFF";
    this.phase = "idle";
    this.target = null;
    this.hand = null;
    this.score = 0;
    this.hits = 0;
    this.attempts = 0;
    this.remainingMs = WATERMELON_RULES.durationMs;
    this.lastTickAt = null;
    this.lastStrikeAt = -Infinity;
    this.feedbackTimer = null;
    this.raf = null;

    root.innerHTML = `
      <div class="outcam-shell">
        <section class="outcam-stage" aria-label="WATERMELON GUIDE camera stage">
          <video class="outcam-video" autoplay muted playsinline></video>
          <div class="outcam-vignette" aria-hidden="true"></div>
          <div class="outcam-topbar"><span class="outcam-chip outcam-camera-state"></span><span class="outcam-chip outcam-hand-state"></span></div>
          <div class="outcam-watermelon" hidden aria-hidden="true"><span>๐</span><i></i></div>
          <div class="outcam-hand" hidden aria-hidden="true"></div>
          <div class="outcam-feedback" hidden aria-live="assertive"></div>
          <div class="outcam-center-card"><small class="outcam-center-label"></small><strong class="outcam-center-title"></strong><p class="outcam-center-detail"></p></div>
          <button class="outcam-tap-layer" type="button"></button>
        </section>
        <section class="outcam-stats" aria-live="polite">
          <div><span data-copy="wmTime"></span><strong class="outcam-time">30.0</strong></div>
          <div><span data-copy="wmScore"></span><strong class="outcam-score">0</strong></div>
          <div><span data-copy="wmFruit"></span><strong class="outcam-fruit">0 / 3</strong></div>
        </section>
        <div class="outcam-actions">
          <button class="button button--primary outcam-camera-button" type="button"></button>
          <button class="button outcam-start-button" type="button" disabled></button>
          <button class="button outcam-exit-button" type="button"></button>
        </div>
        <p class="outcam-message" role="status"></p>
        <details class="howto outcam-howto"><summary></summary><p data-copy="wmGuide"></p><p data-copy="wmFallback"></p><p data-copy="wmPrivacy"></p></details>
      </div>`;

    this.$ = (selector) => root.querySelector(selector);
    this.video = this.$(".outcam-video");
    this.stage = this.$(".outcam-stage");
    this.input = new RearHandInput(this.video, this.stage, {
      onStatus: (status) => { this.status = status; if (status === "ERROR") this.phase = "idle"; this.render(); },
      onHand: (point) => { this.hand = point; this.renderHand(); },
      onSwing: (point) => this.strike(point)
    });

    this.$(".outcam-camera-button").addEventListener("click", () => this.startCamera());
    this.$(".outcam-start-button").addEventListener("click", () => this.beginRound());
    this.$(".outcam-exit-button").addEventListener("click", this.onExit);
    this.$(".outcam-tap-layer").addEventListener("pointerdown", (event) => {
      if (this.phase !== "playing") return;
      const rect = this.stage.getBoundingClientRect();
      this.strike({ x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height });
    });
    this.onKeyDown = (event) => {
      if (!this.active || this.phase !== "playing" || event.code !== "Space") return;
      event.preventDefault();
      this.strike(this.hand ?? { x: 0.5, y: 0.66 });
    };
    window.addEventListener("keydown", this.onKeyDown);
    this.render();
  }

  t(key, values) { return translate(this.locale, key, values); }
  setLocale(locale) { this.locale = locale; this.render(); }
  activate() { this.active = true; this.root.hidden = false; this.render(); }

  deactivate() {
    this.active = false;
    this.cancelRound();
    this.input.stop();
    this.status = "OFF";
    this.phase = "idle";
    this.target = null;
    this.root.hidden = true;
  }

  async startCamera() {
    if (["LOADING_MODEL", "REQUESTING_CAMERA", "READY"].includes(this.status)) return;
    try {
      await this.input.start();
      this.status = "READY";
      this.phase = "ready";
    } catch (error) {
      console.error(error);
      this.input.stop();
      this.status = "ERROR";
      this.phase = "idle";
    }
    this.render();
  }

  beginRound() {
    if (this.status !== "READY" || this.phase === "playing") return;
    clearUะ€๔ัฅต•อั…ตภ์(€€€ักฅฬนษ•ต…ฅนฅน5ฬ€๔5…ั นต…เ ภฐักฅฬนษ•ต…ฅนฅน5ฬ€ด‘•ฑัค์(€€€ฅ€กักฅฬนษ•ต…ฅนฅน5ฬ€๐๔€ภคษ•ัีษธักฅฬนฅนฅอกIฝีน ค์(€€€ักฅฬนษ•น‘•ษMั…ัฬ ค์(€€€ักฅฬนษ…€๔ษ•ลี•อันฅต…ัฅฝนษ…ต”กักฅฬนัฅฌค์(€๔์((€อม…ÝนQ…ษ•ะ ค์ักฅฬนั…ษ•ะ€๔ษ•…ั•]…ั•ษต•ฑฝนQ…ษ•ะ ค์ักฅฬนษ•น‘•ษQ…ษ•ะ ค์๔((€อัษฅญ”กมฝฅนะค์(€€€ฅ€กักฅฬนมก…อ”€๔๔€มฑ…ๅฅน๑๐€…ักฅฬนั…ษ•ะคษ•ัีษธ์(€€€ฝนอะนฝÜ€๔ม•ษฝษต…น”นนฝÜ ค์(€€€ฅ€กนฝÜ€ดักฅฬนฑ…อัMัษฅญ•ะ€๐]QI51=9}IU1LนอÝฅนฝฝฑ‘ฝÝน5ฬคษ•ัีษธ์(€€€ักฅฬนฑ…อัMัษฅญ•ะ€๔นฝÜ์(€€€ฝนอะษ•อีฑะ€๔ษ…‘•Mัษฅญ”กักฅฬนั…ษ•ะฐมฝฅนะค์(€€€ักฅฬน…ัั•ตมัฬ€ฌ๔€ฤ์(€€€ักฅฬนอฝษ”€ฌ๔ษ•อีฑะนมฝฅนัฬ์(€€€ฅ€กษ•อีฑะนษ…‘”€๔๔๔€!%Pค์ักฅฬนกฅัฬ€ฌ๔€ฤ์น…ูฅ…ัฝศนูฅษ…ั”üธ ฬิค์๔(€€€ักฅฬนอกฝÝ••‘…ฌกษ•อีฑะนษ…‘”ฐมฝฅนะค์(€€€ักฅฬนั…ษ•ะ€๔นีฑฐ์(€€€ักฅฬนษ•น‘•ษQ…ษ•ะ ค์(€€€ักฅฬนษ•น‘•ษMั…ัฬ ค์(€€€ฑ•…ษQฅต•ฝีะกักฅฬน••‘…ญQฅต•ศค์(€€€ักฅฬน••‘…ญQฅต•ศ€๔อ•ัQฅต•ฝีะ  ค€๔๘์(€€€€€ฅ€กักฅฬนมก…อ”€๔๔€มฑ…ๅฅนคษ•ัีษธ์(€€€€€ฅ€กักฅฬน…ัั•ตมัฬ€๘๔]QI51=9}IU1Lนั…ษ•ัฝีนะคักฅฬนฅนฅอกIฝีน ค์(€€€€€•ฑอ”์ักฅฬนอม…ÝนQ…ษ•ะ ค์ักฅฬธ นฝีั…ดตต•ออ…”คนั•แัฝนั•นะ€๔ักฅฬนะ Ýต9•แะค์๔(€€€๔ฐ€ุิภค์(€๔((€อกฝÝ••‘…ฌกษ…‘”ฐมฝฅนะค์(€€€ฝนอะ••‘…ฌ€๔ักฅฬธ นฝีั…ดต••‘…ฌค์(€€€••‘…ฌนกฅ‘‘•ธ€๔…ฑอ”์(€€€••‘…ฌน‘…ั…อ•ะนษ…‘”€๔ษ…‘”์(€€€••‘…ฌนั•แัฝนั•นะ€๔ักฅฬนะกÝด‘ํษ…‘•lมu๔‘ํษ…‘”นอฑฅ” ฤคนัฝ1ฝÝ•ษ…อ” ฅ๕€ค์(€€€••‘…ฌนอัๅฑ”นฑ•ะ€๔€‘ํ5…ั นต…เ เฐ5…ั นตฅธ ไศฐมฝฅนะนเ€จ€ฤภภคฅ๔•€์(€€€••‘…ฌนอัๅฑ”นัฝภ€๔€‘ํ5…ั นต…เ ฤะฐ5…ั นตฅธ เุฐมฝฅนะนไ€จ€ฤภภคฅ๔•€์(€๔((€ฅนฅอกIฝีน ค์ฅ€กักฅฬนมก…อ”€๔๔๔€มฑ…ๅฅนค์ักฅฬน…น•ฑนฅต…ัฅฝธ ค์ักฅฬนมก…อ”€๔€ษ•อีฑะ์ักฅฬนั…ษ•ะ€๔นีฑฐ์ักฅฬนษ•น‘•ศ ค์๔๔(€…น•ฑนฅต…ัฅฝธ ค์ฅ€กักฅฬนษ…€๔๔นีฑฐค…น•ฑนฅต…ัฅฝนษ…ต”กักฅฬนษ…ค์ักฅฬนษ…€๔นีฑฐ์ฑ•…ษQฅต•ฝีะกักฅฬน••‘…ญQฅต•ศค์ักฅฬน••‘…ญQฅต•ศ€๔นีฑฐ์๔(€…น•ฑIฝีน ค์ักฅฬน…น•ฑนฅต…ัฅฝธ ค์ฅ€กักฅฬนมก…อ”€๔๔๔€มฑ…ๅฅนคักฅฬนมก…อ”€๔ักฅฬนอั…ัีฬ€๔๔๔€Id€ü€ษ•…‘ไ€่€ฅ‘ฑ”์๔((€ษ•น‘•ศ ค์(€€€ฝศ€กฝนอะ•ฑ•ต•นะฝักฅฬนษฝฝะนลี•ษๅM•ฑ•ัฝษฑฐ m‘…ัตฝมๅtคค•ฑ•ต•นะนั•แัฝนั•นะ€๔ักฅฬนะก•ฑ•ต•นะน‘…ั…อ•ะนฝมไค์(€€€ักฅฬธ นฝีั…ดตกฝÝัผอีตต…ษไคนั•แัฝนั•นะ€๔ักฅฬนะ กฝÝQฝAฑ…ไค์(€€€ักฅฬธ นฝีั…ดต•แฅะตีััฝธคนั•แัฝนั•นะ€๔ักฅฬนะ Ýตแฅะค์(€€€ฝนอะฑฝ…‘ฅน€๔l1=%9}5=0ฐ€IEUMQ%9}5Itนฅนฑี‘•ฬกักฅฬนอั…ัีฬค์(€€€ักฅฬธ นฝีั…ดต…ต•ษตีััฝธคนั•แัฝนั•นะ€๔ักฅฬนะกฑฝ…‘ฅน€ü€Ýต1ฝ…‘ฅน€่ักฅฬนอั…ัีฬ€๔๔๔€Id€ü€Ýต…ต•ษ…I•…‘ไ€่€Ýต…ต•ษค์(€€€ักฅฬธ นฝีั…ดต…ต•ษตีััฝธคน‘ฅอ…ฑ•€๔ฑฝ…‘ฅน๑๐ักฅฬนอั…ัีฬ€๔๔๔€Id์(€€€ฝนอะอั…ษะ€๔ักฅฬธ นฝีั…ดตอั…ษะตีััฝธค์(€€€อั…ษะนั•แัฝนั•นะ€๔ักฅฬนะกักฅฬนมก…อ”€๔๔๔€ษ•อีฑะ€ü€ÝตI•ัษไ€่€ÝตMั…ษะค์(€€€อั…ษะน‘ฅอ…ฑ•€๔ักฅฬนอั…ัีฬ€๔๔€Id๑๐ักฅฬนมก…อ”€๔๔๔€มฑ…ๅฅน์(€€€ักฅฬธ นฝีั…ดต…ต•ษตอั…ั”คนั•แัฝนั•นะ€๔ักฅฬนอั…ัีฬ€๔๔๔€Id€ü€IH4
Ü1%Y€่ักฅฬนอั…ัีฬ€๔๔๔€II=H€ü€5III=H€่ฑฝ…‘ฅน€ü€5I€่€IH4
Ü=์(€€€ักฅฬธ นฝีั…ดตก…นตอั…ั”คนั•แัฝนั•นะ€๔ักฅฬนก…น€üักฅฬนะ Ýต!…นค€่ักฅฬนะ Ýต9ฝ!…นค์(€€€ักฅฬธ นฝีั…ดตก…นตอั…ั”คนฑ…ออ1ฅอะนัฝฑ” ฅฬตฑฅู”ฐ	ฝฝฑ•…ธกักฅฬนก…นคค์((€€€ฝนอะ…ษ€๔ักฅฬธ นฝีั…ดต•นั•ศต…ษค์(€€€…ษนกฅ‘‘•ธ€๔ักฅฬนมก…อ”€๔๔๔€มฑ…ๅฅน์(€€€ักฅฬธ นฝีั…ดต•นั•ศตฑ…•ฐคนั•แัฝนั•นะ€๔ักฅฬนะกักฅฬนมก…อ”€๔๔๔€ษ•อีฑะ€ü€ÝตI•อีฑะ€่€•ๅ•ษฝÝ]…ั•ษต•ฑฝนีฅ‘”ค์(€€€ักฅฬธ นฝีั…ดต•นั•ศตัฅัฑ”คนั•แัฝนั•นะ€๔ักฅฬนมก…อ”€๔๔๔€ษ•อีฑะ€ü€‘ํักฅฬนกฅัอ๔€ผ€‘ํ]QI51=9}IU1Lนั…ษ•ัฝีนั๕€€่€]QI51=8U%์(€€€ักฅฬธ นฝีั…ดต•นั•ศต‘•ั…ฅฐคนั•แัฝนั•นะ€๔ักฅฬนมก…อ”€๔๔๔€ษ•อีฑะ(€€€€€€üักฅฬนะ ÝตI•อีฑั1ฅน”ฐ์กฅัฬ่ักฅฬนกฅัฬฐัฝั…ฐ่]QI51=9}IU1Lนั…ษ•ัฝีนะฐอฝษ”่ักฅฬนอฝษ”๔ค(€€€€€€่ักฅฬนอั…ัีฬ€๔๔๔€II=H€üักฅฬนะ Ýต…ต•ษ…ษษฝศค€่ักฅฬนอั…ัีฬ€๔๔๔€Id€üักฅฬนะ ÝตI•…‘ไค€่ักฅฬนะ Ýต%นัษผค์(€€€ักฅฬธ นฝีั…ดตต•ออ…”คนั•แัฝนั•นะ€๔ักฅฬนอั…ัีฬ€๔๔๔€II=H€üักฅฬนะ Ýต…ต•ษ…ษษฝศค€่ักฅฬนมก…อ”€๔๔๔€มฑ…ๅฅน€üักฅฬนะ ÝตAฑ…ๅฅนค€่ักฅฬนอั…ัีฬ€๔๔๔€Id€üักฅฬนะ ÝตI•…‘ไค€่ักฅฬนะ ÝตAษฅู…ไค์(€€€ักฅฬธ นฝีั…ดตั…ภตฑ…ๅ•ศคนอ•ัััษฅีั” …ษฅตฑ…•ฐฐักฅฬนะ ÝตQ…มQ•อะคค์(€€€ักฅฬนษ•น‘•ษMั…ัฬ ค์ักฅฬนษ•น‘•ษQ…ษ•ะ ค์ักฅฬนษ•น‘•ษ!…น ค์(€€€ฅ€กักฅฬนมก…อ”€๔๔€มฑ…ๅฅนคักฅฬธ นฝีั…ดต••‘…ฌคนกฅ‘‘•ธ€๔ัษี”์(€๔((€ษ•น‘•ษMั…ัฬ ค์(€€€ักฅฬธ นฝีั…ดตัฅต”คนั•แัฝนั•นะ€๔€กักฅฬนษ•ต…ฅนฅน5ฬ€ผ€ฤภภภคนัฝฅแ• ฤค์(€€€ักฅฬธ นฝีั…ดตอฝษ”คนั•แัฝนั•นะ€๔Mัษฅนกักฅฬนอฝษ”ค์(€€€ักฅฬธ นฝีั…ดตษีฅะคนั•แัฝนั•นะ€๔€‘ํ5…ั นตฅธกักฅฬน…ัั•ตมัฬฐ]QI51=9}IU1Lนั…ษ•ัฝีนะฅ๔€ผ€‘ํ]QI51=9}IU1Lนั…ษ•ัฝีนั๕€์(€๔((€ษ•น‘•ษQ…ษ•ะ ค์(€€€ฝนอะ•ฑ•ต•นะ€๔ักฅฬธ นฝีั…ดตÝ…ั•ษต•ฑฝธค์(€€€ฝนอะูฅอฅฑ”€๔ักฅฬนมก…อ”€๔๔๔€มฑ…ๅฅน€	ฝฝฑ•…ธกักฅฬนั…ษ•ะค์(€€€•ฑ•ต•นะนกฅ‘‘•ธ€๔€…ูฅอฅฑ”์(€€€ฅ€กูฅอฅฑ”ค์•ฑ•ต•นะนอัๅฑ”นฑ•ะ€๔€‘ํักฅฬนั…ษ•ะนเ€จ€ฤภม๔•€์•ฑ•ต•นะนอัๅฑ”นัฝภ€๔€‘ํักฅฬนั…ษ•ะนไ€จ€ฤภม๔•€์๔(€๔((€ษ•น‘•ษ!…น ค์(€€€ฝนอะ•ฑ•ต•นะ€๔ักฅฬธ นฝีั…ดตก…นค์(€€€•ฑ•ต•นะนกฅ‘‘•ธ€๔€…ักฅฬนก…น์(€€€ฅ€กักฅฬนก…นค์•ฑ•ต•นะนอัๅฑ”นฑ•ะ€๔€‘ํักฅฬนก…นนเ€จ€ฤภม๔•€์•ฑ•ต•นะนอัๅฑ”นัฝภ€๔€‘ํักฅฬนก…นนไ€จ€ฤภม๔•€์๔(€๔)๔(