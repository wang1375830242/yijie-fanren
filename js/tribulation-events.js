/* ==========================================================================
   突破天劫 · 筑基、结丹、元婴、化神四次主动抉择
   事件本身不改变破境概率公式，只给准备/代价；真正的破境仍走原流程。
   ========================================================================== */
(function () {
  "use strict";
  const XD = window.XD;
  if (!XD || !Array.isArray(XD.EVENTS)) return;
  const E = XD.EVENTS;

  function add(ev) {
    ev.once = true;
    ev.w = 1;
    ev.major = true;
    ev.when = ev.when || (() => false);
    E.push(ev);
    XD.EVENT_BY_ID[ev.id] = ev;
  }

  const trials = [
    {
      id: "trib_2", tier: 1, title: "筑基天关",
      text: "灵气在丹田里凝成一线，天边却压来一层薄雷。筑基这一关，可以硬渡，也可以借势。",
      risk: 0.85, cause: "殒于筑基雷劫", cost: 60, reward: 8, borrow: 5, wait: 3,
      success: "雷声在耳边炸开。你从焦黑的石台上站起来，丹田里多了一粒很小的光。",
    },
    {
      id: "trib_3", tier: 2, title: "结丹火候",
      text: "金丹将成，丹火却不肯收。你知道，再往前一步，成丹或成灰都在这一念。",
      risk: 0.82, cause: "殒于结丹丹劫", cost: 100, reward: 9, borrow: 6, wait: 4,
      success: "丹成的那一刻，整座洞府亮了一瞬。你听见自己心里有什么东西落地。",
    },
    {
      id: "trib_4", tier: 3, title: "元婴雷海",
      text: "元婴初成，天雷像海一样压下来。你可以借宝护身，也可以用自己的道基去接。",
      risk: 0.78, cause: "殒于元婴雷海", cost: 180, reward: 10, borrow: 7, wait: 4,
      success: "雷海退去。你怀里多了一个和你一模一样的小人，它睁开眼，先看了你一眼。",
    },
    {
      id: "trib_5", tier: 4, title: "化神问心",
      text: "化神之前，天不再落雷，只落下一道很轻的问句。你答得上来，就过去；答不上来，就留下。",
      risk: 0.75, cause: "殒于化神问心", cost: 300, reward: 12, borrow: 8, wait: 5,
      success: "你答完那句话，四周忽然安静。再抬头时，天已经比刚才高了一层。",
    },
  ];

  trials.forEach((trial) => {
    add({
      id: trial.id,
      when: (s) => s.world === "human" && s.tier === trial.tier && s.cult >= 100 && !s.flags[trial.id],
      title: trial.title,
      text: trial.text,
      choices: [
        {
          label: "硬渡这一劫",
          risk: { p: trial.risk, text: trial.success, fail: { death: true, cause: trial.cause } },
          effects: { breakBonus: trial.reward, mood: -4, injury: 1 },
          outcome: trial.success,
        },
        {
          label: "借宝护身",
          effects: { stones: -trial.cost, breakBonus: trial.borrow, mood: 2 },
          outcome: "你把压箱底的宝物推出去挡了一瞬。雷声还在，但你站稳了。",
        },
        {
          label: "再闭关磨一磨",
          effects: { age: 15, breakBonus: trial.wait, mood: 5, insight: 3 },
          outcome: "你没有急着过。十五年后再抬头，天雷已经不再那么高了。",
        },
      ],
      sceneKey: `trib:${trial.id}`,
    });
  });
})();
