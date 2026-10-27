/* ==========================================================================
   留言板 · 前端
   ========================================================================== */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const API_BASE =
    location.hostname === "wang1375830242.github.io" ? "https://192.144.150.24" : "";
  const apiUrl = (path) => API_BASE + path;
  const list = $("gbList");
  const empty = $("gbEmpty");
  const more = $("gbMore");
  const form = $("gbForm");
  const nameInput = $("gbName");
  const textInput = $("gbText");
  const website = $("gbWebsite");
  const count = $("gbCount");
  const submit = $("gbSubmit");
  const status = $("gbStatus");
  let nextBefore = null;
  let loading = false;

  function setStatus(text, isError) {
    status.textContent = text;
    status.classList.toggle("is-error", !!isError);
  }

  function formatTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function messageCard(message) {
    const card = document.createElement("article");
    card.className = "gb-card";
    if (message.id !== undefined) card.dataset.id = String(message.id);
    const head = document.createElement("div");
    head.className = "gb-card-head";
    const name = document.createElement("span");
    name.className = "gb-card-name";
    name.textContent = message.name || "无名";
    const time = document.createElement("time");
    time.dateTime = message.createdAt || "";
    time.textContent = formatTime(message.createdAt);
    head.append(name, time);
    const text = document.createElement("p");
    text.className = "gb-card-text";
    text.textContent = message.text || "";
    card.append(head, text);
    return card;
  }

  function appendMessage(message, prepend) {
    if (!message || message.id === undefined) return;
    const id = String(message.id);
    if (Array.from(list.children).some((node) => node.dataset.id === id)) return;
    const card = messageCard(message);
    if (prepend) list.prepend(card);
    else list.append(card);
    updateEmpty();
  }

  function updateEmpty() {
    empty.hidden = list.children.length > 0;
    more.hidden = !nextBefore;
  }

  async function load(reset) {
    if (loading) return;
    loading = true;
    if (reset) {
      nextBefore = null;
      list.textContent = "";
    }
    more.disabled = true;
    setStatus(reset ? "正在读取留言…" : "正在读取更多留言…");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const query = new URLSearchParams({ limit: "20" });
      if (nextBefore) query.set("before", String(nextBefore));
      const res = await fetch(apiUrl("/api/guestbook?" + query.toString()), {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      (data.messages || []).forEach((message) => appendMessage(message, false));
      const count = list.children.length;
      nextBefore = data.nextBefore || null;
      updateEmpty();
      setStatus(count ? `已读到 ${count} 条留言。` : "还没有留言，做第一个吧。");
    } catch (err) {
      setStatus(
        err.name === "AbortError" ? "读取超时，请刷新重试。" : "读取失败：" + (err.message || "请稍后再试"),
        true
      );
    } finally {
      clearTimeout(timer);
      loading = false;
      more.disabled = false;
    }
  }

  async function submitMessage(event) {
    event.preventDefault();
    const text = textInput.value.trim();
    if (!text) {
      setStatus("先写一句话。", true);
      textInput.focus();
      return;
    }
    submit.disabled = true;
    setStatus("正在留下…");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(apiUrl("/api/guestbook"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          name: nameInput.value.trim(),
          text,
          website: website.value,
        }),
      });
      if (res.status === 429) throw new Error("写得太快了，等一会儿再留");
      if (res.status === 503) throw new Error("留言板暂时满了，请稍后再试");
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      if (data.message) appendMessage(data.message, true);
      textInput.value = "";
      count.textContent = "0 / 200";
      setStatus("已经留在留言板上了。");
    } catch (err) {
      setStatus(
        err.name === "AbortError" ? "提交超时，请稍后再试。" : "留下失败：" + (err.message || "请稍后再试"),
        true
      );
    } finally {
      clearTimeout(timer);
      submit.disabled = false;
    }
  }

  textInput.addEventListener("input", () => {
    count.textContent = Array.from(textInput.value).length + " / 200";
  });
  form.addEventListener("submit", submitMessage);
  $("gbRefresh").addEventListener("click", () => load(true));
  more.addEventListener("click", () => load(false));
  load(true);
})();
