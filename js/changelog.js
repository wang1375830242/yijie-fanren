/* ==========================================================================
   更新纪事 · 渲染 / 筛选 / 搜索
   ========================================================================== */
(function () {
  "use strict";
  const XD = window.XD;
  const data = XD && XD.CHANGELOG;
  const list = document.getElementById("clList");
  const filters = document.getElementById("clFilters");
  const count = document.getElementById("clCount");
  const search = document.getElementById("clSearch");
  if (!list || !filters || !data || !Array.isArray(data.releases)) return;

  const typeMeta = {
    feature: { label: "新增", order: 0 },
    improve: { label: "改进", order: 1 },
    fix: { label: "修复", order: 2 },
    engineering: { label: "工程", order: 3 },
  };
  const releaseTotal = document.getElementById("clReleaseTotal");
  if (releaseTotal) releaseTotal.textContent = data.releases.length;
  const state = { type: "all", q: "" };
  const params = new URLSearchParams(location.search);
  if (params.get("type") && (params.get("type") === "all" || typeMeta[params.get("type")])) {
    state.type = params.get("type");
  }
  state.q = params.get("q") || "";
  if (search) search.value = state.q;

  function formatDate(value) {
    const [y, m, d] = String(value).split("-");
    return `${y}.${m}.${d}`;
  }

  function versionId(version) {
    return "v" + String(version).replace(/\./g, "-");
  }

  function allChanges() {
    return data.releases.reduce((all, release) => all.concat(release.changes || []), []);
  }

  function matches(change) {
    if (state.type !== "all" && change.type !== state.type) return false;
    if (!state.q) return true;
    const hay = [change.text, ...(change.tags || [])].join(" ").toLowerCase();
    return hay.includes(state.q.toLowerCase());
  }

  function releaseMatches(release) {
    const q = state.q.toLowerCase();
    const releaseHay = [release.version, release.title, release.summary, ...(release.tags || [])]
      .join(" ")
      .toLowerCase();
    return !q || releaseHay.includes(q) || (release.changes || []).some((change) => matches(change));
  }

  function addText(parent, tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = text;
    parent.appendChild(node);
    return node;
  }

  function buildFilters() {
    if (!filters) return;
    filters.textContent = "";
    const total = allChanges().length;
    const entries = [{ key: "all", label: `全部 ${total}` }].concat(
      Object.keys(typeMeta)
        .sort((a, b) => typeMeta[a].order - typeMeta[b].order)
        .map((key) => ({
          key,
          label: `${typeMeta[key].label} ${allChanges().filter((c) => c.type === key).length}`,
        }))
    );
    entries.forEach((entry) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "cl-filter" + (state.type === entry.key ? " is-active" : "");
      button.dataset.type = entry.key;
      button.setAttribute("aria-pressed", state.type === entry.key ? "true" : "false");
      button.textContent = entry.label;
      button.addEventListener("click", () => {
        state.type = entry.key;
        filters.querySelectorAll(".cl-filter").forEach((b) => {
          const active = b.dataset.type === state.type;
          b.classList.toggle("is-active", active);
          b.setAttribute("aria-pressed", active ? "true" : "false");
        });
        render();
        syncUrl();
      });
      filters.appendChild(button);
    });
  }

  function buildChange(release, change, index) {
    const item = document.createElement("li");
    item.className = "cl-change";
    item.id = `${versionId(release.version)}-${index + 1}`;
    item.dataset.type = change.type;

    const mark = document.createElement("span");
    mark.className = `cl-mark cl-mark--${change.type}`;
    mark.textContent = (typeMeta[change.type] || typeMeta.feature).label;
    item.appendChild(mark);

    const body = document.createElement("div");
    body.className = "cl-change-body";
    addText(body, "p", "cl-change-text", change.text);
    if (change.tags && change.tags.length) {
      const tags = document.createElement("div");
      tags.className = "cl-tags";
      change.tags.forEach((tag) => addText(tags, "span", "cl-tag", tag));
      body.appendChild(tags);
    }
    item.appendChild(body);

    if (change.commit) {
      const link = document.createElement("a");
      link.className = "cl-commit";
      link.href = `https://github.com/wang1375830242/yijie-fanren/commit/${change.commit}`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = change.commit.slice(0, 7);
      link.title = "查看这次提交";
      item.appendChild(link);
    }
    return item;
  }

  function buildRelease(release, releaseIndex, changeCount) {
    const article = document.createElement("article");
    article.className = "cl-release" + (releaseIndex === 0 ? " is-latest" : "");
    article.id = versionId(release.version);
    article.setAttribute("aria-labelledby", `${article.id}-title`);

    const head = document.createElement("header");
    head.className = "cl-release-head";
    const meta = document.createElement("div");
    meta.className = "cl-release-meta";
    const time = document.createElement("time");
    time.dateTime = release.date;
    time.textContent = formatDate(release.date);
    meta.appendChild(time);
    const version = document.createElement("span");
    version.className = "cl-version";
    version.textContent = `v${release.version}`;
    meta.appendChild(version);
    if (releaseIndex === 0) {
      const latest = document.createElement("span");
      latest.className = "cl-latest";
      latest.textContent = "最新";
      meta.appendChild(latest);
    }
    if (release.compatibility) {
      const compat = document.createElement("span");
      compat.className = "cl-compat";
      compat.textContent = release.compatibility;
      meta.appendChild(compat);
    }
    head.appendChild(meta);

    const title = document.createElement("h2");
    title.id = `${article.id}-title`;
    title.textContent = release.title || "未命名版本";
    head.appendChild(title);
    if (release.summary) addText(head, "p", "cl-summary", release.summary);

    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "cl-copy";
    copy.textContent = "复制本版链接";
    copy.addEventListener("click", () => {
      const url = `${location.href.split("#")[0]}#${article.id}`;
      const done = () => {
        copy.textContent = "已复制";
        setTimeout(() => (copy.textContent = "复制本版链接"), 1200);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done).catch(() => {});
      } else {
        const area = document.createElement("textarea");
        area.value = url;
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        try {
          document.execCommand("copy");
        } finally {
          area.remove();
        }
        done();
      }
    });
    head.appendChild(copy);
    article.appendChild(head);

    const changes = document.createElement("div");
    changes.className = "cl-changes";
    const visible = (release.changes || []).filter((change) => matches(change));
    Object.keys(typeMeta)
      .sort((a, b) => typeMeta[a].order - typeMeta[b].order)
      .forEach((type) => {
        const group = visible.filter((change) => change.type === type);
        if (!group.length) return;
        const section = document.createElement("section");
        section.className = "cl-group";
        addText(section, "h3", "cl-group-title", typeMeta[type].label);
        const ul = document.createElement("ul");
        ul.className = "cl-change-list";
        group.forEach((change) => {
          const originalIndex = (release.changes || []).indexOf(change);
          ul.appendChild(buildChange(release, change, originalIndex));
        });
        section.appendChild(ul);
        changes.appendChild(section);
      });
    article.appendChild(changes);
    void changeCount;
    return article;
  }

  function render() {
    list.textContent = "";
    let visibleChanges = 0;
    let visibleReleases = 0;
    data.releases.forEach((release, index) => {
      if (!releaseMatches(release)) return;
      const matching = (release.changes || []).filter((change) => matches(change));
      if (!matching.length && state.q) {
        // 版本标题命中但条目未命中时仍展示版本头，避免“搜到了却空白”。
        if (!releaseMatches(release)) return;
      }
      if (!matching.length && state.type !== "all") return;
      list.appendChild(buildRelease(release, index, matching.length));
      visibleChanges += matching.length;
      visibleReleases += 1;
    });
    if (count) {
      count.textContent = visibleReleases
        ? `显示 ${visibleReleases} 个版本 · ${visibleChanges} 条更新`
        : "这条道上还没有你要找的记录。";
    }
    if (!visibleReleases) {
      const empty = document.createElement("div");
      empty.className = "cl-empty";
      addText(empty, "p", "", "没有找到这条记录。");
      const clear = document.createElement("button");
      clear.type = "button";
      clear.className = "cl-clear";
      clear.textContent = "清除筛选";
      clear.addEventListener("click", () => {
        state.type = "all";
        state.q = "";
        if (search) search.value = "";
        buildFilters();
        render();
        syncUrl();
      });
      empty.appendChild(clear);
      list.appendChild(empty);
    }
    if (location.hash) {
      const target = document.getElementById(location.hash.slice(1));
      if (target) {
        target.classList.add("is-target");
        target.scrollIntoView({ block: "start" });
        setTimeout(() => target.classList.remove("is-target"), 1600);
      }
    }
  }

  function syncUrl() {
    const next = new URLSearchParams();
    if (state.type !== "all") next.set("type", state.type);
    if (state.q) next.set("q", state.q);
    const query = next.toString();
    const url = `${location.pathname}${query ? `?${query}` : ""}${location.hash}`;
    try {
      history.replaceState(null, "", url);
    } catch (err) {}
  }

  let timer = null;
  if (search) {
    search.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        state.q = search.value.trim();
        render();
        syncUrl();
      }, 120);
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && document.activeElement !== search && !/input|textarea|select/i.test(document.activeElement.tagName)) {
      event.preventDefault();
      if (search) search.focus();
    }
    if (event.key === "Escape" && document.activeElement === search) {
      search.value = "";
      state.q = "";
      render();
      syncUrl();
    }
  });

  window.addEventListener("popstate", () => {
    const p = new URLSearchParams(location.search);
    state.type = p.get("type") || "all";
    state.q = p.get("q") || "";
    if (search) search.value = state.q;
    buildFilters();
    render();
  });

  buildFilters();
  render();
  if (XD.util && XD.util.reveal) XD.util.reveal();
})();
