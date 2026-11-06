/* ==========================================================================
   人生短码 · 把已结束的一世压缩进 URL，用于只读回放
   ========================================================================== */
(function () {
  "use strict";
  const XD = (window.XD = window.XD || {});

  function text(value, max) {
    return String(value == null ? "" : value).slice(0, max || 80);
  }

  function toBase64(value) {
    if (typeof btoa === "function") return btoa(unescape(encodeURIComponent(value)));
    if (typeof Buffer !== "undefined") return Buffer.from(value, "utf8").toString("base64");
    throw new Error("no base64 encoder");
  }

  function fromBase64(value) {
    const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "===".slice((normalized.length + 3) % 4);
    const decoded = typeof atob === "function" ? atob(padded) : Buffer.from(padded, "base64").toString("utf8");
    return decodeURIComponent(escape(decoded));
  }

  function encode(life) {
    if (!life || typeof life !== "object") return "";
    const payload = {
      v: 1,
      n: text(life.name, 40),
      r: text(life.realm, 40),
      w: text(life.world, 20),
      a: Number(life.age) || 0,
      c: text(life.cause, 60),
      s: (Number(life.seed) || 0) >>> 0,
      d: text(life.daohao, 40),
      p: text(life.sectPath, 20),
      b: text(life.buildName, 50),
      sec: text(life.sect, 40),
      o: text(life.origin && life.origin.place, 40),
      ro: text(life.root && life.root.name, 40),
      g: text(life.gender, 10),
    };
    return toBase64(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function decode(code) {
    try {
      const payload = JSON.parse(fromBase64(code));
      if (!payload || payload.v !== 1 || typeof payload.n !== "string") return null;
      return {
        shortCode: true,
        name: text(payload.n, 40),
        realm: text(payload.r, 40),
        world: text(payload.w, 20),
        age: Math.max(0, Number(payload.a) || 0),
        cause: text(payload.c, 60),
        seed: (Number(payload.s) || 0) >>> 0,
        daohao: text(payload.d, 40),
        sectPath: text(payload.p, 20) || null,
        buildName: text(payload.b, 50),
        sect: text(payload.sec, 40),
        origin: { place: text(payload.o, 40) },
        root: { name: text(payload.ro, 40) },
        gender: text(payload.g, 10),
      };
    } catch (err) {
      return null;
    }
  }

  function url(life) {
    const code = encode(life);
    if (!code) return "";
    const base = typeof location !== "undefined" ? new URL("life.html", location.href) : new URL("https://example.com/life.html");
    base.searchParams.set("c", code);
    return base.toString();
  }

  function copy(value) {
    if (!value) return Promise.resolve(false);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(value).then(() => true).catch(() => false);
    }
    try {
      const area = document.createElement("textarea");
      area.value = value;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return Promise.resolve(ok);
    } catch (err) {
      return Promise.resolve(false);
    }
  }

  XD.LifeCode = { encode, decode, url, copy };
})();
