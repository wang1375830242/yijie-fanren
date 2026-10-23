/* ==========================================================================
   一介凡人 · 图样
   命盘、灵根、山影、存亡曲线——全部程序生成，不依赖任何图片。
   ========================================================================== */
(function () {
  "use strict";
  const XD = window.XD;

  const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  const ELEMENTS = ["金", "木", "水", "火", "土"];

  /* ---------------- 命盘 ---------------- */
  function dial(opts) {
    opts = opts || {};
    const spin = opts.spin !== false;
    let ticks = "";
    for (let i = 0; i < 72; i++) {
      const a = (i * 5 - 90) * (Math.PI / 180);
      const long = i % 6 === 0;
      const r1 = long ? 168 : 175;
      const r2 = 186;
      const x1 = 200 + Math.cos(a) * r1;
      const y1 = 200 + Math.sin(a) * r1;
      const x2 = 200 + Math.cos(a) * r2;
      const y2 = 200 + Math.sin(a) * r2;
      ticks += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="currentColor" stroke-width="${long ? 1 : 0.5}" opacity="${long ? 0.55 : 0.28}"/>`;
    }
    let chars = "";
    BRANCHES.forEach((c, i) => {
      const a = (i * 30 - 90) * (Math.PI / 180);
      const x = 200 + Math.cos(a) * 152;
      const y = 200 + Math.sin(a) * 152;
      chars += `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" font-family="KaiTi, STKaiti, serif" font-size="11" fill="currentColor" opacity="0.6">${c}</text>`;
    });
    let elements = "";
    ELEMENTS.forEach((e, i) => {
      const a = (i * 72 - 90) * (Math.PI / 180);
      const x = 200 + Math.cos(a) * 104;
      const y = 200 + Math.sin(a) * 104;
      elements += `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" font-family="KaiTi, STKaiti, serif" font-size="12" fill="currentColor" opacity="0.75">${e}</text>`;
    });
    return `<svg viewBox="0 0 400 400" role="img" aria-label="命盘" style="width:100%;height:100%">
      <g class="${spin ? "dial-rotate" : ""}" style="transform-origin:200px 200px">
        <circle cx="200" cy="200" r="190" fill="none" stroke="currentColor" stroke-width="0.6" opacity="0.35"/>
        <circle cx="200" cy="200" r="186" fill="none" stroke="currentColor" stroke-width="0.6" opacity="0.18"/>
        <circle cx="200" cy="200" r="168" fill="none" stroke="currentColor" stroke-width="0.6" opacity="0.3"/>
        ${ticks}
        ${chars}
      </g>
      <circle cx="200" cy="200" r="130" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.22"/>
      <circle cx="200" cy="200" r="104" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.18"/>
      ${elements}
      <circle cx="200" cy="200" r="70" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.25"/>
      <circle cx="200" cy="200" r="54" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3"/>
      <text x="200" y="212" text-anchor="middle" font-family="KaiTi, STKaiti, serif" font-size="34" fill="currentColor" opacity="0.85">命</text>
    </svg>`;
  }

  /* ---------------- 灵根盘 ---------------- */
  function rootRing(values, label) {
    const cx = 110;
    const cy = 110;
    const R = 76;
    const pts = values.map((v, i) => {
      const a = (i * 72 - 90) * (Math.PI / 180);
      const r = (Math.max(6, v) / 100) * R;
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    });
    const poly = pts.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
    const rings = [0.34, 0.67, 1]
      .map((k) => {
        const rp = values
          .map((v, i) => {
            const a = (i * 72 - 90) * (Math.PI / 180);
            return (
              (cx + Math.cos(a) * R * k).toFixed(1) +
              "," +
              (cy + Math.sin(a) * R * k).toFixed(1)
            );
          })
          .join(" ");
        return `<polygon points="${rp}" fill="none" stroke="currentColor" stroke-width="0.8" opacity="0.3"/>`;
      })
      .join("");
    const axes = values
      .map((v, i) => {
        const a = (i * 72 - 90) * (Math.PI / 180);
        return `<line x1="${cx}" y1="${cy}" x2="${(cx + Math.cos(a) * R).toFixed(1)}" y2="${(cy + Math.sin(a) * R).toFixed(1)}" stroke="currentColor" stroke-width="0.8" opacity="0.3"/>`;
      })
      .join("");
    const labels = values
      .map((v, i) => {
        const a = (i * 72 - 90) * (Math.PI / 180);
        const x = cx + Math.cos(a) * (R + 16);
        const y = cy + Math.sin(a) * (R + 16) + 4;
        return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-family="KaiTi, STKaiti, serif" font-size="15" fill="currentColor" opacity="${v > 20 ? 0.95 : 0.55}">${ELEMENTS[i]}</text>`;
      })
      .join("");
    return `<svg viewBox="0 0 220 220" role="img" aria-label="五行灵根">
      ${rings}${axes}
      <polygon points="${poly}" fill="currentColor" fill-opacity="0.3" stroke="currentColor" stroke-width="1.8"/>
      ${pts
        .map(
          (p) =>
            `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.2" fill="currentColor"/>`
        )
        .join("")}
      ${labels}
      ${
        label
          ? `<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-family="KaiTi, STKaiti, serif" font-size="10" fill="currentColor" opacity="0.55">${label}</text>`
          : ""
      }
    </svg>`;
  }

  function rootValues(root, seed) {
    const rng = new XD.util.RNG((seed || 7) * 977 + 13);
    const base = [30, 30, 30, 30, 30];
    const pick = () => Math.floor(rng.next() * 5);
    const bump = (i, v) => (base[i] = Math.min(100, base[i] + v));
    switch (root.key) {
      case "tian":
        for (let i = 0; i < 5; i++) base[i] = 4;
        bump(pick(), 96);
        break;
      case "yi":
        for (let i = 0; i < 5; i++) base[i] = 8;
        bump(pick(), 78);
        bump(pick(), 18);
        break;
      case "shuang": {
        const a = pick();
        let b = pick();
        while (b === a) b = pick();
        for (let i = 0; i < 5; i++) base[i] = 6;
        bump(a, 55);
        bump(b, 48);
        break;
      }
      case "san": {
        for (let i = 0; i < 5; i++) base[i] = 5;
        const used = new Set();
        while (used.size < 3) used.add(pick());
        used.forEach((i) => bump(i, 45));
        break;
      }
      case "si": {
        for (let i = 0; i < 5; i++) base[i] = 4;
        const used = new Set();
        while (used.size < 4) used.add(pick());
        used.forEach((i) => bump(i, 34));
        break;
      }
      case "wei":
        for (let i = 0; i < 5; i++) base[i] = 18 + rng.int(0, 8);
        break;
      default:
        for (let i = 0; i < 5; i++) base[i] = 4 + rng.int(0, 4);
    }
    return base;
  }

  /* ---------------- 山水 ---------------- */
  function scene(world, id) {
    const gid = "g" + (id || Math.floor(Math.random() * 1e6));
    if (world === "spirit") {
      return `<svg viewBox="0 0 320 120" preserveAspectRatio="none" aria-hidden="true">
        <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fa8d6" stop-opacity=".18"/><stop offset="1" stop-color="#0e1512" stop-opacity="0"/></linearGradient></defs>
        <rect width="320" height="120" fill="url(#${gid})"/>
        <circle cx="248" cy="34" r="13" fill="#dfe6f5" opacity=".5"/>
        <circle cx="210" cy="48" r="6" fill="#dfe6f5" opacity=".3"/>
        <path d="M0 92 L44 70 L70 84 L104 58 L132 82 L160 68 L196 92 L320 76 L320 120 L0 120Z" fill="#0a0f0c" opacity=".85"/>
        <path d="M0 104 L60 88 L96 100 L150 84 L210 102 L268 88 L320 100 L320 120 L0 120Z" fill="#070a08"/>
        <path d="M120 60 q18 -8 36 0" stroke="#a9c0e6" stroke-width="0.6" fill="none" opacity=".35"/>
      </svg>`;
    }
    if (world === "immortal") {
      return `<svg viewBox="0 0 320 120" preserveAspectRatio="none" aria-hidden="true">
        <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8bd7c" stop-opacity=".2"/><stop offset="1" stop-color="#0e1512" stop-opacity="0"/></linearGradient></defs>
        <rect width="320" height="120" fill="url(#${gid})"/>
        <circle cx="266" cy="30" r="18" fill="#f6ecc9" opacity=".55"/>
        <path d="M0 88 Q60 72 120 84 T240 78 T320 86 L320 120 L0 120Z" fill="#0a0f0c" opacity=".8"/>
        <path d="M96 78 h34 l-6 -8 h-22Z" fill="#070a08"/>
        <path d="M104 70 h18 l-9 -10Z" fill="#070a08"/>
        <path d="M60 96 Q110 88 160 96 T260 94 T320 98" stroke="#d8bd7c" stroke-width="0.7" fill="none" opacity=".3"/>
      </svg>`;
    }
    return `<svg viewBox="0 0 320 120" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#86a083" stop-opacity=".18"/><stop offset="1" stop-color="#0e1512" stop-opacity="0"/></linearGradient></defs>
      <rect width="320" height="120" fill="url(#${gid})"/>
      <circle cx="256" cy="30" r="16" fill="#e9e3d3" opacity=".38"/>
      <path d="M0 86 L38 58 L66 78 L96 46 L128 76 L158 62 L190 86 L226 70 L260 88 L320 74 L320 120 L0 120Z" fill="#0a0f0c" opacity=".85"/>
      <path d="M0 100 L54 84 L92 96 L140 82 L196 98 L246 86 L320 98 L320 120 L0 120Z" fill="#070a08"/>
    </svg>`;
  }

  /* ---------------- 存亡曲线 ---------------- */
  function survivalChart(age, maxAge) {
    const W = 280;
    const H = 84;
    const cap = Math.max(120, Math.min(maxAge, age * 1.15, 6000));
    const pts = [];
    const N = 60;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * cap;
      const p = Math.exp(-Math.pow(a / 78, 1.35));
      pts.push([(i / N) * W, H - p * (H - 8) - 2]);
    }
    const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    const area = line + ` L${W} ${H} L0 ${H} Z`;
    const gid = "s" + Math.floor(Math.random() * 1e6);
    const nowX = Math.min(W, (Math.min(age, cap) / cap) * W);
    const nowY = H - Math.exp(-Math.pow(Math.min(age, cap) / 78, 1.35)) * (H - 8) - 2;
    return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">
      <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".22"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>
      <line x1="0" y1="${H - 2}" x2="${W}" y2="${H - 2}" stroke="currentColor" stroke-width="0.5" opacity=".2"/>
      <line x1="0" y1="6" x2="${W}" y2="6" stroke="currentColor" stroke-width="0.5" opacity=".08"/>
      <path d="${area}" fill="url(#${gid})"/>
      <path d="${line}" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".75"/>
      <line x1="${nowX.toFixed(1)}" y1="4" x2="${nowX.toFixed(1)}" y2="${H - 2}" stroke="currentColor" stroke-width="0.7" opacity=".45" stroke-dasharray="2 3"/>
      <circle cx="${nowX.toFixed(1)}" cy="${nowY.toFixed(1)}" r="2.2" fill="currentColor"/>
    </svg>`;
  }

  XD.art = { dial, rootRing, rootValues, scene, survivalChart };
})();
