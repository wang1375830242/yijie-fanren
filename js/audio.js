/* ==========================================================================
   一介凡人 · 声音（合成，无外链）
   ========================================================================== */
(function () {
  "use strict";
  const XD = window.XD;
  let ctx = null;
  let on = false;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(freq, dur, gain, type, delay) {
    const c = ensure();
    if (!c) return;
    const t0 = c.currentTime + (delay || 0);
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain || 0.08, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function bell(kind) {
    if (!on) return;
    if (kind === "ascend") {
      [220, 330, 440, 660].forEach((f, i) => tone(f, 2.4, 0.05, "sine", i * 0.18));
      tone(110, 3.5, 0.04, "triangle", 0);
    } else if (kind === "death") {
      tone(146.8, 2.6, 0.05, "sine", 0);
      tone(110, 3.2, 0.035, "triangle", 0.3);
    } else if (kind === "break") {
      tone(523.25, 1.4, 0.05, "sine", 0);
      tone(784, 1.6, 0.04, "sine", 0.12);
      tone(1046.5, 1.8, 0.025, "sine", 0.24);
    } else {
      tone(440, 0.8, 0.025, "sine", 0);
    }
  }

  function toggle() {
    on = !on;
    if (on) ensure();
    return on;
  }

  XD.Audio = { toggle, bell, get enabled() { return on; } };
})();
