/* ==========================================================================
   转世谱系回响 · 只在前世道果存在时出现
   一局最多一次，不替代主线，也不直接揭示前世死因。
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

  const echoBase = (s) => s.world === "human" && s.legacy && s.legacy.source && s.age >= 16;

  add({
    id: "legacy_echo_partner",
    when: (s) => echoBase(s) && !!s.legacy.source.partnerName,
    title: "旧信",
    text: (s) => `${s.age}岁那年，一个陌生人在路口拦住你，递来一封旧信。信封上的落款是「${s.legacy.source.partnerName}」，你从未听过这个名字，却觉得那笔字很熟。`,
    choices: [
      { label: "收下旧信，记住那个名字", effects: { insight: 3, mood: 2, karma: 2, flag: "legacy_echo_done" }, outcome: "你把信折好，放进贴身的口袋。那晚你睡得很沉，梦里有一条很长的路。" },
      { label: "问对方从哪里来", effects: { insight: 2, luck: 2, flag: "legacy_echo_done" }, outcome: "陌生人只指了指北边。你顺着他的手指看过去，那里只有一片没有名字的山。" },
      { label: "把信烧了，不追问", effects: { mood: 1, karma: -1, flag: "legacy_echo_done" }, outcome: "火苗把落款烧成一个黑点。你告诉自己，那只是别人的旧事。" },
    ],
  });

  add({
    id: "legacy_echo_disciple",
    when: (s) => echoBase(s) && !!(s.legacy.source.discipleNames && s.legacy.source.discipleNames.length),
    title: "旧门生",
    text: (s) => `${s.age}岁那年，一个年轻修士向你打听「${s.legacy.source.discipleNames[0]}」这个名字。你说没听过；他走后，你却在纸上写下了同样的三个字。`,
    choices: [
      { label: "追出去问个清楚", effects: { insight: 3, mood: 1, karma: 1, flag: "legacy_echo_done" }, outcome: "你追到山门外，只看见一片被风吹散的雾。" },
      { label: "把名字留在纸上", effects: { insight: 2, mood: 3, flag: "legacy_echo_done" }, outcome: "墨迹干了。你把纸收进旧书里，像收起一个没有讲完的故事。" },
    ],
  });

  add({
    id: "legacy_echo_rival",
    when: (s) => echoBase(s) && !!(s.legacy.source.rivalNames && s.legacy.source.rivalNames.length),
    title: "旧敌",
    text: (s) => `${s.age}岁那年，你在坊市听见有人提起「${s.legacy.source.rivalNames[0]}」。那人说，这个名字已经很多年没人敢提了。`,
    choices: [
      { label: "打听旧事", effects: { insight: 3, mood: -1, flag: "legacy_echo_done" }, outcome: "你听到一半就走了。有些旧事，知道开头就足够了。" },
      { label: "当作没听见", effects: { mood: 2, luck: 1, flag: "legacy_echo_done" }, outcome: "你低头喝茶。茶很苦，余味却很长。" },
    ],
  });

  add({
    id: "legacy_echo_sect",
    when: (s) => echoBase(s) && !!s.legacy.source.sectName,
    title: "旧门牌",
    text: (s) => `${s.age}岁那年，你在旧货摊看见一块褪色的门牌，上面还留着「${s.legacy.source.sectName}」的纹样。你站了很久，直到老板问你要不要买。`,
    choices: [
      { label: "买下门牌", effects: { stones: -12, mood: 3, insight: 2, flag: "legacy_echo_done" }, outcome: "你把门牌带回洞府，挂在最不起眼的角落。" },
      { label: "转身离开", effects: { insight: 3, mood: -1, flag: "legacy_echo_done" }, outcome: "你没有买。走出三条街后，才发现自己一直攥着袖口。" },
    ],
  });

  add({
    id: "legacy_echo_place",
    when: (s) => echoBase(s) && !!s.legacy.source.place,
    title: "旧地",
    text: (s) => `${s.age}岁那年，你路过一个从未去过的镇子。街角那棵树的形状，却和梦里一模一样。`,
    choices: [
      { label: "在树下坐一会儿", effects: { mood: 4, insight: 2, flag: "legacy_echo_done" }, outcome: "风从树梢落下来。你听见一个很轻的声音，像有人在叫你的旧名。" },
      { label: "继续赶路", effects: { luck: 2, insight: 1, flag: "legacy_echo_done" }, outcome: "你没有回头。树影在身后拉得很长。" },
    ],
  });

  add({
    id: "legacy_echo_self",
    when: (s) => echoBase(s),
    title: "旧梦",
    text: (s) => `${s.age}岁那年，你梦见一个叫「${s.legacy.source.name || "无名"}」的人站在雾里。你看不清他的脸，却知道他走过你后来要走的那条路。`,
    choices: [
      { label: "在梦里叫住他", effects: { insight: 3, mood: 2, karma: 1, flag: "legacy_echo_done" }, outcome: "他回过头。雾太浓，你只看见他笑了一下。" },
      { label: "醒来，不追问", effects: { mood: 3, insight: 1, flag: "legacy_echo_done" }, outcome: "你醒来时天还没亮。窗外有一条很长的路，通向你看不见的地方。" },
    ],
  });

  function pick(s) {
    const src = (s.legacy && s.legacy.source) || {};
    if (src.partnerName) return "legacy_echo_partner";
    if (src.discipleNames && src.discipleNames.length) return "legacy_echo_disciple";
    if (src.rivalNames && src.rivalNames.length) return "legacy_echo_rival";
    if (src.sectName) return "legacy_echo_sect";
    if (src.place) return "legacy_echo_place";
    return "legacy_echo_self";
  }

  window.XD.LegacyEcho = { pick };
})();
