/* ==========================================================================
   前世因果链 · 道果未了因缘的三步回收
   一世最多一条，不替代主线；旧存档没有 legacyCause 时完全不触发。
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

  const LABELS = {
    partner: ["旧人", "旧信", "旧约"],
    sect: ["山门", "旧门牌", "归山"],
    ascend: ["天门", "断阶", "未竟"],
    karma: ["旧债", "旧怨", "了结"],
    unfinished: ["半途", "旧路", "走完"],
  };

  const STEPS = [
    {
      title: (type) => LABELS[type][0],
      text: (s) => `你听见一段不属于这一世的传闻：${s.legacyCause.text}。它像一根很细的线，牵着你往前走。`,
      choices: [
        { label: "顺着线走下去", effects: { causeStep: 1, insight: 3, mood: 2 }, outcome: "你没有立刻找到答案，但记住了那条路的方向。" },
        { label: "先把线收起来", effects: { causeStep: 1, mood: 2, karma: 1 }, outcome: "有些事不必急着追问。你把它放进心里，继续过日子。" },
      ],
    },
    {
      title: (type) => LABELS[type][1],
      text: (s) => `线索又出现了。这一次，它离你很近，近到你能看见当年那个选择的影子。${s.legacyCause.text}`,
      choices: [
        { label: "把真相挖到底", effects: { causeStep: 2, insight: 4, mood: -2 }, outcome: "真相并不好看。你知道了自己当年为什么没有回头。" },
        { label: "只取回一件旧物", effects: { causeStep: 2, mood: 2, karma: 2 }, outcome: "你带走了一件很小的旧物。它比真相更轻，也更重。" },
      ],
    },
    {
      title: (type) => LABELS[type][2],
      text: (s) => `最后一程到了。你可以把这段因果了结，也可以带着它继续走。${s.legacyCause.text}`,
      choices: [
        { label: "了结它", effects: { causeStep: 3, causeDone: true, karma: 6, mood: 6, flag: "cause_done" }, outcome: "你把该还的还了，该说的说了。那一夜，你睡得很沉。" },
        { label: "放下它", effects: { causeStep: 3, causeDone: true, mood: 4, insight: 4, flag: "cause_done" }, outcome: "你没有追到最后。你只是终于允许自己不再回头。" },
      ],
    },
  ];

  Object.keys(LABELS).forEach((type) => {
    STEPS.forEach((step, index) => {
      const n = index + 1;
      add({
        id: `cause_${type}_${n}`,
        when: (s) => !!s.legacyCause && s.legacyCause.type === type && s.causeStep === index && s.age >= [20, 50, 90][index],
        title: step.title(type),
        text: step.text,
        choices: step.choices,
        w: 1,
        sceneKey: `cause:${type}:${n}`,
      });
    });
  });
})();
