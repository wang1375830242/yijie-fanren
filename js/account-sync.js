/* ==========================================================================
   账号云存档 · 前端同步
   Token 方案：同 GitHub Pages 跨站，token 存在本机 localStorage。
   ========================================================================== */
(function () {
  "use strict";
  const XD = window.XD;
  const U = XD.util;
  const KEY_OWNER = "yijie.owner.v1";
  const KEY_STATUS = "yijie.sync.status.v1";
  let running = false;
  let timer = null;

  function number(v, fallback) {
    return Number.isFinite(Number(v)) ? Number(v) : fallback;
  }

  function snapshot() {
    return {
      v: 1,
      savedAt: Date.now(),
      lives: U.store.lives(),
      legacy: U.store.legacy(),
      run: U.store.run(),
      lineage: U.store.lineage(),
      steles: U.store.steles(),
      candles: U.store.candles(),
    };
  }

  function mergeLives(a, b) {
    const map = new Map();
    [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])].forEach((life) => {
      if (!life || typeof life !== "object") return;
      const id = String(life.id || `life-${life.seed || "unknown"}`);
      const old = map.get(id);
      const stamp = number(life.ts, number(life.endedTs, 0));
      const oldStamp = old ? number(old.ts, number(old.endedTs, 0)) : -1;
      if (!old || stamp >= oldStamp) map.set(id, life);
    });
    return Array.from(map.values()).sort((x, y) => number(y.ts, 0) - number(x.ts, 0)).slice(0, 60);
  }

  function mergeLineage(a, b) {
    const left = a && typeof a === "object" ? a : {};
    const right = b && typeof b === "object" ? b : {};
    const map = new Map();
    [...(Array.isArray(left.entries) ? left.entries : []), ...(Array.isArray(right.entries) ? right.entries : [])].forEach((entry) => {
      if (!entry || typeof entry !== "object") return;
      const key = String(entry.lifeKey || `no:${entry.no || ""}`);
      if (!map.has(key)) map.set(key, entry);
    });
    const entries = Array.from(map.values()).slice(0, 20);
    const total = Math.max(number(left.total, 0), number(right.total, 0), ...entries.map((e) => number(e.no, 0)));
    const streak = Math.max(number(left.streak, 0), number(right.streak, 0));
    return { v: 1, total, streak, bestStreak: Math.max(number(left.bestStreak, 0), streak), entries };
  }

  function mergeSnapshots(local, remote) {
    local = local && typeof local === "object" ? local : {};
    remote = remote && typeof remote === "object" ? remote : {};
    const localRun = local.run && typeof local.run === "object" ? local.run : null;
    const remoteRun = remote.run && typeof remote.run === "object" ? remote.run : null;
    const run =
      !localRun ? remoteRun : !remoteRun ? localRun :
      number(localRun.savedAt, number(localRun.ts, 0)) >= number(remoteRun.savedAt, number(remoteRun.ts, 0))
        ? localRun : remoteRun;
    const localLegacy = local.legacy && typeof local.legacy === "object" ? local.legacy : null;
    const remoteLegacy = remote.legacy && typeof remote.legacy === "object" ? remote.legacy : null;
    const legacy =
      !localLegacy ? remoteLegacy : !remoteLegacy ? localLegacy :
      number(remoteLegacy.depth, 0) > number(localLegacy.depth, 0) ? remoteLegacy : localLegacy;
    const candles = Object.assign({}, remote.candles || {});
    Object.keys(local.candles || {}).forEach((id) => {
      candles[id] = Math.max(number(candles[id], 0), number(local.candles[id], 0));
    });
    return {
      v: 1,
      savedAt: Date.now(),
      lives: mergeLives(local.lives, remote.lives),
      legacy,
      run,
      lineage: mergeLineage(local.lineage, remote.lineage),
      steles: Array.from(new Set([...(remote.steles || []), ...(local.steles || [])].filter((x) => typeof x === "string"))),
      candles,
    };
  }

  function apply(snap) {
    if (!snap || typeof snap !== "object") return;
    U.store.setLives(Array.isArray(snap.lives) ? snap.lives : []);
    U.store.setLegacy(snap.legacy || null);
    U.store.setRun(snap.run || null);
    U.store.setLineage(snap.lineage || null);
    U.store.setSteles(Array.isArray(snap.steles) ? snap.steles : []);
    U.store.setCandles(snap.candles || {});
  }

  function owner() {
    try { return localStorage.getItem(KEY_OWNER) || ""; } catch (err) { return ""; }
  }

  function setOwner(id) {
    try { localStorage.setItem(KEY_OWNER, String(id)); } catch (err) {}
  }

  function status(text, error) {
    try {
      localStorage.setItem(KEY_STATUS, JSON.stringify({ text, error: !!error, at: Date.now() }));
    } catch (err) {}
    window.dispatchEvent(new CustomEvent("yijie:sync", { detail: { text, error: !!error } }));
  }

  async function request(path, options) {
    if (!U.auth || !U.auth.session()) return null;
    return U.auth.fetch(path, options);
  }

  async function sync(options) {
    if (running || !U.auth || !U.auth.session()) return null;
    const session = U.auth.session();
    const currentOwner = owner();
    if (currentOwner && String(currentOwner) !== String(session.user.id)) {
      status("本机数据属于另一个账号，未自动上传", true);
      return { status: "owner-conflict" };
    }
    if (!currentOwner) setOwner(session.user.id);
    running = true;
    status("正在同步…");
    try {
      let remoteRes = await request("/api/account/save", { cache: "no-store" });
      if (!remoteRes) return null;
      if (remoteRes.status === 401) {
        U.auth.clear();
        status("登录已失效，请重新登录", true);
        return { status: "unauthorized" };
      }
      if (!remoteRes.ok) throw new Error("HTTP " + remoteRes.status);
      const remote = await remoteRes.json();
      const local = snapshot();
      const merged = remote.exists ? mergeSnapshots(local, remote.snapshot) : local;
      if (remote.exists && JSON.stringify(merged.lives) === JSON.stringify(remote.snapshot?.lives || []) &&
          JSON.stringify(merged.legacy) === JSON.stringify(remote.snapshot?.legacy || null) &&
          JSON.stringify(merged.lineage) === JSON.stringify(remote.snapshot?.lineage || null)) {
        apply(merged);
        status("已同步");
        return { status: "clean", revision: remote.revision };
      }
      let result = await request("/api/account/save", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshot: merged, baseRevision: number(remote.revision, 0) }),
        keepalive: !!(options && options.keepalive),
      });
      if (result && result.status === 409) {
        remoteRes = await request("/api/account/save", { cache: "no-store" });
        const latest = await remoteRes.json();
        const retry = mergeSnapshots(merged, latest.snapshot);
        result = await request("/api/account/save", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ snapshot: retry, baseRevision: number(latest.revision, 0) }),
          keepalive: !!(options && options.keepalive),
        });
        if (result && result.ok) apply(retry);
      } else if (result && result.ok) {
        apply(merged);
      }
      if (!result || !result.ok) throw new Error("HTTP " + (result ? result.status : "network"));
      status("已同步");
      return { status: "synced" };
    } catch (err) {
      status("待同步：" + (err.message || "网络不可用"), true);
      return { status: "error" };
    } finally {
      running = false;
    }
  }

  function syncSoon() {
    clearTimeout(timer);
    timer = setTimeout(() => sync(), 800);
  }

  window.addEventListener("pagehide", () => sync({ keepalive: true }));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") sync({ keepalive: true });
  });
  document.addEventListener("DOMContentLoaded", () => {
    if (U.auth && U.auth.session()) {
      syncSoon();
      setInterval(() => sync(), 60000);
    }
  });

  XD.account = { snapshot, mergeSnapshots, apply, sync, syncSoon, status, owner };
})();
