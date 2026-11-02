/* ==========================================================================
   更新提醒 · 静态站版本检测
   不自动刷新；发现新版本后由用户确认，保存进度再替换页面。
   ========================================================================== */
(function () {
  "use strict";

  if (typeof window === "undefined" || typeof document === "undefined") return;
  const XD = (window.XD = window.XD || {});
  const CURRENT_VERSION = String(XD.VERSION || "0.0.0");
  const CURRENT_BUILD = String(XD.BUILD || CURRENT_VERSION);
  const FIRST_DELAY = 30 * 1000;
  const CHECK_INTERVAL = 10 * 60 * 1000;
  const RETRY_INTERVAL = 15 * 60 * 1000;
  const CONFIRM_DELAY = 2000;
  const DISMISS_KEY = "yijie.update.dismissed.v1";

  let lastCheck = Date.now();
  let checking = false;
  let failed = false;
  let timer = null;
  let banner = null;

  function parseVersion(value) {
    return String(value || "0")
      .split(/[.+-]/)
      .slice(0, 3)
      .map((part) => Number.parseInt(part, 10) || 0);
  }

  function compareVersions(a, b) {
    const left = parseVersion(a);
    const right = parseVersion(b);
    for (let i = 0; i < 3; i++) {
      if (left[i] !== right[i]) return left[i] > right[i] ? 1 : -1;
    }
    return 0;
  }

  function isNewer(remote) {
    if (!remote || typeof remote.version !== "string") return false;
    const versionCompare = compareVersions(remote.version, CURRENT_VERSION);
    if (versionCompare !== 0) return versionCompare > 0;
    if (remote.build && CURRENT_BUILD && remote.build !== CURRENT_BUILD) {
      return String(remote.build) > String(CURRENT_BUILD);
    }
    return false;
  }

  function sameRelease(a, b) {
    return !!a && !!b && String(a.version || "") === String(b.version || "") && String(a.build || "") === String(b.build || "");
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function fetchVersion() {
    const url = new URL("./version.json", document.baseURI || window.location.href);
    url.searchParams.set("ts", String(Date.now()));
    const response = await fetch(url.toString(), {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error("version fetch failed");
    const contentType = String(response.headers.get("content-type") || "");
    if (contentType && !/json/i.test(contentType)) throw new Error("version is not json");
    const data = await response.json();
    if (!data || typeof data !== "object" || typeof data.version !== "string") {
      throw new Error("invalid version payload");
    }
    return data;
  }

  function dismissed() {
    try {
      return sessionStorage.getItem(DISMISS_KEY) || "";
    } catch (err) {
      return "";
    }
  }

  function dismiss(build) {
    try {
      sessionStorage.setItem(DISMISS_KEY, String(build || ""));
    } catch (err) {}
  }

  function createBanner(remote) {
    if (banner) return banner;
    banner = document.createElement("div");
    banner.className = "update-banner";
    banner.hidden = true;
    banner.setAttribute("role", "status");
    banner.setAttribute("aria-live", "polite");

    const copy = document.createElement("div");
    copy.className = "update-banner-copy";
    const title = document.createElement("b");
    title.className = "update-banner-title";
    title.textContent = `发现新版本 v${remote.version}`;
    const notes = document.createElement("span");
    notes.className = "update-banner-notes";
    notes.textContent = remote.notes || "更新已准备好，保存当前进度后即可刷新。";
    copy.append(title, notes);

    const actions = document.createElement("div");
    actions.className = "update-banner-actions";
    const later = document.createElement("button");
    later.type = "button";
    later.className = "btn btn--sm update-later";
    later.textContent = "稍后";
    later.addEventListener("click", () => {
      dismiss(remote.build || remote.version);
      banner.hidden = true;
    });
    const apply = document.createElement("button");
    apply.type = "button";
    apply.className = "btn btn--sm btn--primary update-apply";
    apply.textContent = "更新并刷新";
    apply.addEventListener("click", async () => {
      apply.disabled = true;
      apply.textContent = "正在保存…";
      try {
        const hooks = window.XD && window.XD.GameHooks;
        if (hooks && typeof hooks.saveBeforeUpdate === "function") {
          const saved = await hooks.saveBeforeUpdate();
          if (saved === false) {
            apply.disabled = false;
            apply.textContent = "更新并刷新";
            return;
          }
        }
        const url = new URL(window.location.href);
        url.searchParams.set("_refresh", remote.build || remote.version);
        window.location.replace(url.toString());
      } catch (err) {
        apply.disabled = false;
        apply.textContent = "更新并刷新";
      }
    });
    actions.append(later, apply);
    banner.append(copy, actions);
    document.body.appendChild(banner);
    return banner;
  }

  function showBanner(remote) {
    if (dismissed() === String(remote.build || remote.version)) return;
    const node = createBanner(remote);
    node.hidden = false;
  }

  function canCheck() {
    return /^https?:$/.test(window.location.protocol) && document.visibilityState !== "hidden";
  }

  async function check() {
    if (checking || !canCheck()) return false;
    checking = true;
    lastCheck = Date.now();
    try {
      const first = await fetchVersion();
      if (!isNewer(first)) {
        failed = false;
        return false;
      }
      await sleep(CONFIRM_DELAY);
      const second = await fetchVersion();
      if (!sameRelease(first, second) || !isNewer(second)) {
        failed = false;
        return false;
      }
      failed = false;
      showBanner(second);
      return true;
    } catch (err) {
      failed = true;
      return false;
    } finally {
      checking = false;
    }
  }

  function nextDelay() {
    return failed ? RETRY_INTERVAL : CHECK_INTERVAL;
  }

  function schedule() {
    clearTimeout(timer);
    const elapsed = Date.now() - lastCheck;
    const wait = Math.max(1000, nextDelay() - elapsed);
    timer = setTimeout(() => {
      check().finally(schedule);
    }, wait);
  }

  function start() {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && (!lastCheck || Date.now() - lastCheck > CHECK_INTERVAL)) {
        check().finally(schedule);
      }
    });
    window.addEventListener("online", () => {
      if (!lastCheck || Date.now() - lastCheck > CHECK_INTERVAL) check().finally(schedule);
    });
    if (!canCheck()) {
      lastCheck = 0;
      return;
    }
    setTimeout(() => check().finally(schedule), FIRST_DELAY);
  }

  XD.UpdateCheck = {
    currentVersion: CURRENT_VERSION,
    currentBuild: CURRENT_BUILD,
    isNewer,
    compareVersions,
    fetchVersion,
    check,
    showBanner,
  };

  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
})();
