const last = (events, type) => events.filter(e => e.type === type).at(-1);
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

export class AutoDirector {
  constructor(profile) { this.profile = profile; }
  plan(frames, events, format = "15") {
    if (!frames.length) return null;
    const p = this.profile, first = frames[0].at, end = frames.at(-1).at;
    // LOOP is opt-in: the game must identify a visually repeatable event. The
    // standard result only offers 15/7; later profiles can expose this plan.
    if (format === "loop") {
      const loop = events.findLast(e => e.metadata?.loopable === true);
      if (!loop) return null;
      const duration = clamp(loop.metadata.loopDuration ?? 3000, 2000, 4000);
      const from = Math.max(first, loop.timestamp - duration / 2), to = Math.min(end, from + duration);
      if (to - from < 2000 || !frames.some(f => Math.abs(f.at - loop.timestamp) < 200)) return null;
      return { format, duration: to - from, segments: [{ kind: "LOOP", from, to, start: 0, duration: to - from }], heroTimestamp: null, profile: p };
    }
    if (!["15", "7"].includes(format)) return null;
    // HERO cannot be displaced by custom scores or priorities.
    const hero = last(events, p.heroEvent);
    const moment = hero ?? p.fallbackEvents.map(type => last(events, type)).find(Boolean) ?? events.at(-1) ?? { timestamp: end };
    const fail = hero ? null : last(events, "FAIL"), anchor = fail ?? moment;
    const ranges = [];
    const add = (kind, from, to) => {
      from = clamp(from, first, end); to = clamp(to, from, end);
      if (to > from) ranges.push({ kind, from, to, duration: to - from });
    };
    const maxDuration = format === "7" ? 7000 : 15000;
    if (format === "15") {
      const hook = p.hookCandidates.map(type => events.find(e => e.type === type && frames.some(f => Math.abs(f.at - e.timestamp) < 800))).find(Boolean);
      const hookAt = hook?.timestamp ?? Math.max(first, anchor.timestamp - 2500);
      add("HOOK", hookAt - 450, hookAt + 550);
      const success = events.find(e => e.type === "FIRST_SUCCESS" && frames.some(f => Math.abs(f.at - e.timestamp) < 400));
      if (success && success.timestamp < anchor.timestamp - 5000) add("UNDERSTAND", success.timestamp - 350, success.timestamp + 1650);
      add("PLAY", anchor.timestamp - 5000, anchor.timestamp - 1200);
      add(hero ? "HERO" : "MOMENT", anchor.timestamp - 1200, anchor.timestamp + 350);
      add("REACTION", anchor.timestamp + 350, anchor.timestamp + p.reactionDuration);
    } else {
      // Continuous setup, bite and reaction at real speed. End card uses the
      // remaining budget, so three reaction seconds survive in the short cut.
      add(hero ? "HERO" : "MOMENT", anchor.timestamp - 2500, anchor.timestamp + 350);
      add("REACTION", anchor.timestamp + 350, anchor.timestamp + p.reactionDuration);
    }
    let used = ranges.reduce((n, r) => n + r.duration, 0), overflow = used + p.endCardDuration - maxDuration;
    for (const kind of ["PLAY", "UNDERSTAND", "HOOK"]) {
      for (const range of ranges.filter(r => r.kind === kind)) {
        const trim = Math.min(Math.max(0, overflow), range.duration);
        range.from += trim; range.duration -= trim; overflow -= trim;
      }
    }
    const segments = ranges.filter(r => r.duration > 0);
    used = segments.reduce((n, r) => n + r.duration, 0);
    const endCard = Math.min(p.endCardDuration, maxDuration - used);
    segments.push({ kind: "END_CARD", duration: Math.max(0, endCard) });
    let cursor = 0;
    for (const segment of segments) { segment.start = cursor; cursor += segment.duration; }
    return { format, duration: cursor, segments, heroTimestamp: hero?.timestamp ?? null, moment: moment.type, profile: p };
  }
}
