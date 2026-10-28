/* ==========================================================================
   账号页 · 登录 / 注册 / 云存档
   ========================================================================== */
(function () {
  "use strict";
  const XD = window.XD;
  const auth = XD.util.auth;
  const $ = (id) => document.getElementById(id);
  let currentUser = null;

  function api(path, options) {
    return auth.fetch(path, options);
  }

  function setStatus(text, error) {
    const node = $("accountStatus");
    node.textContent = text;
    node.classList.toggle("is-error", !!error);
  }

  function showSigned(user) {
    currentUser = user;
    $("accountGuest").hidden = true;
    $("accountSigned").hidden = false;
    $("accountName").textContent = user.displayName || user.username;
    $("accountUser").textContent = "@" + user.username;
    $("accountAvatar").textContent = (user.displayName || user.username).slice(0, 1);
  }

  function showGuest() {
    currentUser = null;
    $("accountSigned").hidden = true;
    $("accountGuest").hidden = false;
    setStatus("");
  }

  function readError(res) {
    return res.json().then((data) => data.error || "HTTP " + res.status).catch(() => "HTTP " + res.status);
  }

  async function register(event) {
    event.preventDefault();
    const username = $("registerUser").value.trim();
    const password = $("registerPass").value;
    const displayName = $("registerName").value.trim();
    setStatus("正在注册…");
    try {
      const res = await fetch(auth.apiBase + "/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, displayName }),
      });
      if (!res.ok) throw new Error(await readError(res));
      const data = await res.json();
      auth.setSession({ token: data.token, user: data.user });
      if (data.recoveryCode) {
        $("recoveryBox").hidden = false;
        $("recoveryCode").textContent = data.recoveryCode;
      }
      showSigned(data.user);
      await XD.account.sync();
    } catch (err) {
      setStatus(err.message || "注册失败", true);
    }
  }

  async function login(event) {
    event.preventDefault();
    const username = $("loginUser").value.trim();
    const password = $("loginPass").value;
    setStatus("正在登录…");
    try {
      const res = await fetch(auth.apiBase + "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) throw new Error(await readError(res));
      const data = await res.json();
      auth.setSession({ token: data.token, user: data.user });
      showSigned(data.user);
      setStatus("登录成功，正在合并本机与云端记录…");
      await XD.account.sync();
    } catch (err) {
      setStatus(err.message || "登录失败", true);
    }
  }

  async function logout() {
    try { await api("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" } }); } catch (err) {}
    auth.clear();
    showGuest();
    setStatus("已退出。本机记录仍保留在这台设备。");
  }

  async function me() {
    if (!auth.session()) return showGuest();
    const res = await api("/api/auth/me", { cache: "no-store" });
    if (!res.ok) {
      auth.clear();
      return showGuest();
    }
    const data = await res.json();
    showSigned(data.user);
    XD.account.syncSoon();
  }

  function exportData() {
    const data = XD.account.snapshot();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "yijie-account-snapshot.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  }

  function claimLocal() {
    if (!currentUser) return;
    try { localStorage.setItem("yijie.owner.v1", String(currentUser.id)); } catch (err) {}
    $("importLocalBtn").hidden = true;
    XD.account.sync();
  }

  document.querySelectorAll("[data-auth-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      const mode = tab.dataset.authTab;
      document.querySelectorAll("[data-auth-tab]").forEach((node) => {
        const on = node === tab;
        node.classList.toggle("on", on);
        node.setAttribute("aria-selected", on ? "true" : "false");
      });
      $("loginForm").hidden = mode !== "login";
      $("registerForm").hidden = mode !== "register";
      $("recoverForm").hidden = mode !== "recover";
    });
  });
  async function recover(event) {
    event.preventDefault();
    setStatus("正在重置…");
    try {
      const res = await fetch(auth.apiBase + "/api/auth/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: $("recoverUser").value.trim(), recoveryCode: $("recoverCodeInput").value.trim(), newPassword: $("recoverPass").value }),
      });
      if (!res.ok) throw new Error(await readError(res));
      const data = await res.json();
      auth.setSession({ token: data.token, user: data.user });
      showSigned(data.user);
      setStatus("密码已重置，已登录。");
      await XD.account.sync();
    } catch (err) {
      setStatus(err.message || "重置失败", true);
    }
  }
  $("recoverForm").addEventListener("submit", recover);
  $("loginForm").addEventListener("submit", login);
  $("registerForm").addEventListener("submit", register);
  $("logoutBtn").addEventListener("click", logout);
  $("syncBtn").addEventListener("click", () => XD.account.sync());
  $("exportBtn").addEventListener("click", exportData);
  $("importLocalBtn").addEventListener("click", claimLocal);
  window.addEventListener("yijie:sync", (event) => {
    const detail = event.detail || {};
    $("syncStatus").textContent = detail.text || "尚未同步";
    $("syncStatus").classList.toggle("is-error", !!detail.error);
    if (detail.text && detail.text.indexOf("另一个账号") >= 0) $("importLocalBtn").hidden = false;
  });
  me();
})();
