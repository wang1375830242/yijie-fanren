/* ==========================================================================
   万宝阁 · 图鉴
   ========================================================================== */
(function () {
  "use strict";
  const XD = window.XD;
  const D = XD.DATA;
  const U = XD.util;
  const $ = (id) => document.getElementById(id);

  const META = {
    realms: {
      title: "境界",
      note: "十三重",
      intro:
        "从引气入体到证道道祖，一共十三重。每跨一重，寿元便长一截，能看见的东西也多一层。大多数人卡在第一重，到死都没摸到第二重的门槛。",
    },
    worlds: {
      title: "界域",
      note: "三重天",
      intro:
        "人界、灵界、仙界，三重界面自上而下压着。界面之间不是路，是裂缝。过得去的人叫飞升，过不去的人叫陨落。",
    },
    sects: {
      title: "宗门",
      note: "宗门与势力",
      intro:
        "越国七派、魔道六宗、天南四大势力、乱星海星宫、灵界天渊城、仙界九元观。宗门给你功法、丹药和靠山，也给你任务、仇家和规矩。",
    },
    characters: {
      title: "人物",
      note: "原著人物 · 含推测",
      intro:
        "名字、身份与经历摘要来自公开读者 wiki 与读者整理；这里展示的是读者整理的人物志，不是原著正文。带「推测」或「读者共识」的请当作二创参考。",
    },
    roots: {
      title: "灵根",
      note: "灵根与特殊体质",
      intro:
        "原著灵根比游戏里的七档更细：天灵根、异灵根、双/三/四/五灵根、无灵根，以及暗灵根、水系天灵根、木土天灵根等。游戏内为玩法做了七档简化，这里是原著与读者整理的谱系；带「推测」的是推断，不是原著明文。",
    },
    artifacts: {
      title: "法宝",
      note: "八件名物",
      intro:
        "法宝是修士的第二条命。本命法宝与心神相连，碎了便伤根骨；古宝来历不明，用一次少一次。越好的东西，越多人盯着。",
    },
    pills: {
      title: "丹药",
      note: "六种丹方",
      intro:
        "修行路上，丹药是最实在的捷径，也是最贵的债。药力堆出来的境界，根基往往虚浮，渡劫那天会一起算总账。",
    },
    beasts: {
      title: "妖兽",
      note: "六种凶物",
      intro:
        "山里有兽，海里有妖，灵界有异族。妖兽的内丹、皮毛、筋骨都是好东西，前提是你打得过它。",
    },
  };

  let cat = "realms";
  let q = "";

  function data() {
    return D.CODEX[cat] || [];
  }

  function renderTabs() {
    document.querySelectorAll("#codexTabs button").forEach((b) => {
      const c = b.dataset.cat;
      const n = (D.CODEX[c] || []).length;
      const badge = b.querySelector("b");
      if (badge) badge.textContent = n;
      b.classList.toggle("on", c === cat);
    });
  }

  function render() {
    const m = META[cat];
    $("codexTitle").textContent = m.title;
    $("codexCount").textContent = m.note;
    $("codexIntro").textContent = m.intro;

    const needle = q.trim().toLowerCase();
    const items = data().filter((it) => {
      if (!needle) return true;
      return (
        (it.name + " " + it.tag + " " + it.desc + " " + (it.meta || ""))
          .toLowerCase()
          .indexOf(needle) >= 0
      );
    });
    if (needle) {
      items.sort((a, b) => {
        const an = a.name.toLowerCase().indexOf(needle) >= 0 ? 0 : 1;
        const bn = b.name.toLowerCase().indexOf(needle) >= 0 ? 0 : 1;
        return an - bn || a.name.localeCompare(b.name, "zh");
      });
    }

    $("codexList").innerHTML = items
      .map((it, i) => {
        const index =
          cat === "realms" ? `<span class="ci-index">${String(i + 1).padStart(2, "0")}</span>` : "";
        return `<article class="codex-item">
          <div class="ci-head">
            <span class="ci-name">${index}${U.esc(it.name)}</span>
            <span class="ci-tag">${U.esc(it.tag || "")}</span>
            ${it.spec ? `<span class="ci-spec">推测</span>` : ""}
            ${it.meta ? `<span class="ci-meta">${U.esc(it.meta)}</span>` : ""}
          </div>
          <p class="ci-desc">${U.esc(it.desc)}</p>
        </article>`;
      })
      .join("");
    $("codexEmpty").hidden = items.length > 0;
    renderTabs();
  }

  document.querySelectorAll("#codexTabs button").forEach((b) => {
    b.addEventListener("click", () => {
      cat = b.dataset.cat;
      render();
    });
  });

  $("codexSearch").addEventListener("input", (e) => {
    q = e.target.value;
    render();
  });

  render();
})();
