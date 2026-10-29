/* ==========================================================================
   命格卡 · 从已结束的人生摘要生成分享图
   账号页与终局页共用同一套绘制逻辑。
   ========================================================================== */
(function () {
  "use strict";

  const WORLD_NAMES = { human: "人界", spirit: "灵界", immortal: "仙界", mortal: "凡间" };

  function worldName(value) {
    return WORLD_NAMES[value] || value || "未知";
  }

  function fmtSeed(seed) {
    const value = (Number(seed) || 0) >>> 0;
    const text = value.toString(16).toUpperCase().padStart(8, "0");
    return "No. " + text.slice(0, 4) + "-" + text.slice(4);
  }

  function textOf(value) {
    return value == null ? "" : String(value);
  }

  function wrapText(ctx, text, x, y, maxW, lineH) {
    let line = "";
    for (const ch of text) {
      const test = line + ch;
      if (ctx.measureText(test).width > maxW) {
        ctx.fillText(line, x, y);
        y += lineH;
        line = ch;
      } else line = test;
    }
    if (line) ctx.fillText(line, x, y);
  }

  function draw(canvas, life) {
    if (!canvas || !life) return null;
    const s = life;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    ctx.fillStyle = "#0b0f0b";
    ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W * 0.75, 120, 40, W * 0.75, 120, 900);
    g.addColorStop(0, "rgba(127,178,155,.16)");
    g.addColorStop(1, "rgba(11,15,11,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(233,227,211,.16)";
    ctx.lineWidth = 1;
    ctx.strokeRect(56, 56, W - 112, H - 112);
    ctx.strokeStyle = "rgba(233,227,211,.08)";
    ctx.strokeRect(70, 70, W - 140, H - 140);

    ctx.fillStyle = "rgba(233,227,211,.55)";
    ctx.font = '22px "KaiTi","STKaiti",serif';
    ctx.textAlign = "left";
    ctx.fillText("一 介 凡 人", 110, 130);
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(233,227,211,.35)";
    ctx.font = '18px "KaiTi","STKaiti",serif';
    ctx.fillText("凡人修仙传世界 · 人生模拟", W - 110, 130);

    ctx.textAlign = "left";
    ctx.fillStyle = "#e9e3d3";
    ctx.font = '108px "KaiTi","STKaiti",serif';
    ctx.fillText(textOf(s.name || "无名"), 106, 330);
    ctx.font = '26px "KaiTi","STKaiti",serif';
    ctx.fillStyle = "rgba(233,227,211,.5)";
    ctx.fillText(
      s.path === "cultivator"
        ? `${textOf(s.daohao)} · ${textOf(s.gender)} · ${worldName(s.world)}`
        : `凡俗 · ${textOf(s.gender)} · ${worldName(s.world)}`,
      110,
      382
    );

    ctx.fillStyle = "rgba(233,227,211,.08)";
    ctx.fillRect(110, 430, W - 220, 1);

    ctx.fillStyle = "#7fb29b";
    ctx.font = '600 64px "Songti SC","SimSun",serif';
    ctx.fillText(textOf(s.realm || "凡人"), 110, 540);
    ctx.fillStyle = "rgba(233,227,211,.45)";
    ctx.font = '22px "KaiTi","STKaiti",serif';
    ctx.fillText(`享年 ${textOf(s.age || 0)} 岁 · ${textOf(s.cause || "")}`, 112, 588);

    ctx.fillStyle = "#d9d2be";
    ctx.font = '30px "KaiTi","STKaiti",serif';
    wrapText(ctx, "「" + textOf(s.epitaph || "此人一生，不足为外人道。") + "」", 110, 700, W - 220, 48);

    const origin = s.origin || {};
    const root = s.root || {};
    const disciples = (s.disciples || []).filter((d) => d && d.alive !== false && d.status !== "graduated");
    const partner = s.partner;
    const rows = [
      ["出 生", textOf(origin.place || "—")],
      ["出 身", textOf(origin.family || "—")],
      ["灵 根", textOf(root.name || "—")],
      ["体 质", textOf(s.physique ? s.physique.name : "凡体")],
      ["法 宝", textOf(s.artifact ? s.artifact.name : "无")],
      ["宗 门", s.sect ? `${s.sect}${s.sectRank ? " · " + s.sectRank : ""}` : "散修"],
      ["道 侣", partner ? `${partner.name || ""}${partner.status === "separated" || partner.status === "left" ? " · 已别" : partner.status === "estranged" ? " · 疏远" : ""}` : "无"],
      ["弟 子", `${disciples.length || 0} 人`],
    ];
    ctx.font = '21px "KaiTi","STKaiti",serif';
    rows.forEach((row, index) => {
      const y = 900 + index * 46;
      ctx.fillStyle = "rgba(233,227,211,.35)";
      ctx.fillText(row[0], 110, y);
      ctx.fillStyle = "rgba(233,227,211,.78)";
      ctx.fillText(row[1], 260, y);
    });

    ctx.save();
    ctx.translate(W - 220, 980);
    ctx.rotate(-0.04);
    ctx.fillStyle = "#ae4430";
    ctx.fillRect(0, 0, 120, 120);
    ctx.fillStyle = "#f6ecda";
    ctx.font = '78px "KaiTi","STKaiti",serif';
    ctx.textAlign = "center";
    ctx.fillText(textOf(s.name || "凡")[0] || "凡", 60, 92);
    ctx.restore();

    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(233,227,211,.3)";
    ctx.font = '18px "KaiTi","STKaiti",serif';
    ctx.fillText(fmtSeed(s.seed), 110, H - 100);
    ctx.textAlign = "right";
    ctx.fillText("yijie-fanren", W - 110, H - 100);
    return canvas;
  }

  function canvasFor(canvas) {
    return canvas || document.getElementById("shareCanvas");
  }

  function filename(life) {
    const safeRealm = textOf(life.realm || "凡人").replace(/[\\/:*?"<>|·\s]+/g, "-");
    return `一介凡人-${textOf(life.name || "无名")}-${safeRealm}.png`;
  }

  function download(life, canvas) {
    const target = canvasFor(canvas);
    draw(target, life);
    let url;
    try {
      url = target.toDataURL("image/png");
    } catch (err) {
      return false;
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = filename(life);
    a.click();
    return true;
  }

  async function share(life, canvas) {
    const target = canvasFor(canvas);
    draw(target, life);
    try {
      const blob = await new Promise((resolve) => target.toBlob(resolve, "image/png"));
      const file = new File([blob], filename(life), { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `一介凡人 · ${textOf(life.name || "无名")}`,
          text: `${textOf(life.realm || "凡人")} · ${textOf(life.age || 0)}岁 · ${textOf(life.cause || "")}`,
        });
        return "shared";
      }
    } catch (err) {
      if (err && err.name === "AbortError") return "cancelled";
    }
    download(life, target);
    return "downloaded";
  }

  window.XD = window.XD || {};
  window.XD.LifeCard = { draw, download, share, filename };
})();
