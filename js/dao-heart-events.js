/* ==========================================================================
   道心试炼 · 道心破碎与补心
   道心破碎不直接跌境：保留当前境界，但锁住破境，需通过补心链修复。
   ========================================================================== */
(function () {
  "use strict";
  const XD = window.XD;
  if (!XD || !Array.isArray(XD.EVENTS)) return;
  const E = XD.EVENTS;
  const daoEvents = [];

  function add(ev) {
    ev.once = true;
    ev.major = true;
    ev.w = 1;
    // 由 Sim.maybeDaoHeart / maybeDaoRepair 精确触发，不进入普通随机池。
    ev.when = () => false;
    E.push(ev);
    XD.EVENT_BY_ID[ev.id] = ev;
    daoEvents.push({ id: ev.id, tier: ev.daoTier || 0, age: ev.daoAge || 0 });
  }

  add({
    id: "dao_heart_1",
    daoTier: 2,
    daoAge: 40,
    title: "换命",
    text:
      "同门师弟的筑基丹在丹炉里炸了。他跪在你洞府外，说只要一枚筑基丹，就能再活二十年。你手里只剩最后一枚。",
    choices: [
      {
        label: "把筑基丹给他",
        effects: { mood: 8, insight: 3, karma: 5 },
        outcome: "你把丹递过去时，他愣了很久。后来他每年都在你洞府外放一篮野果。",
      },
      {
        label: "收下他的灵根，替你炼丹（道心可能破碎）",
        risk: { p: 0.84, fail: { daoBreak: true, mood: -18, injury: 1 }, text: "丹成了。你的手却一直在抖。" },
        effects: { cult: 12, mood: -4, karma: -10 },
        outcome: "丹成了。你的手却一直在抖。",
      },
      {
        label: "关上门，装作没听见",
        effects: { mood: -5, insight: 2 },
        outcome: "门外的人一直没有走。第二天清晨，台阶上只剩一块被雨打湿的蒲团。",
      },
    ],
  });

  add({
    id: "dao_heart_2",
    daoTier: 3,
    daoAge: 90,
    title: "旧誓",
    text:
      "你还在凡人时，曾答应一个人：筑基之后回去娶她。如今你结丹在即，她还在山下等。山门送来一封信，说她的头发已经白了一半。",
    choices: [
      {
        label: "下山完婚，耽误一程",
        effects: { mood: 10, karma: 4, cult: -8, maxAge: -5 },
        outcome: "你回去时，她正在门口晒一床旧被子。她没有问你为什么来迟，只说：回来就好。",
      },
      {
        label: "斩断旧缘，继续闭关（道心可能破碎）",
        risk: { p: 0.85, fail: { daoBreak: true, mood: -20, injury: 1 }, text: "你烧了信。火光里，她的名字很久没有散去。" },
        effects: { cult: 10, insight: 2, mood: -5 },
        outcome: "你烧了信。火光里，她的名字很久没有散去。",
      },
      {
        label: "用幻术让她死心（道心可能破碎）",
        risk: { p: 0.7, fail: { daoBreak: true, mood: -12, karma: -6 }, text: "她信了。你却在洞府里坐了一整夜。" },
        effects: { mood: -3, luck: -4, insight: 3 },
        outcome: "她信了。你却在洞府里坐了一整夜。",
      },
    ],
  });

  add({
    id: "dao_heart_3",
    daoTier: 4,
    daoAge: 160,
    title: "丹前一念",
    text:
      "元婴丹只差一味药引：一个活人的元神。宗门长老说，成丹之后，你会是宗门百年内最有希望化神的人。丹炉已经热了。",
    choices: [
      {
        label: "撤去药引，放弃此丹",
        effects: { mood: 6, insight: 4, cult: -10 },
        outcome: "丹炉冷了三天。第四天，你在炉灰里找到一粒没有成形的丹，像一颗很小的眼泪。",
      },
      {
        label: "用仇人的元神入药（道心可能破碎）",
        risk: { p: 0.8, fail: { daoBreak: true, mood: -18, injury: 1 }, text: "丹成的一刻，你听见炉里有人在叫你的名字。" },
        effects: { cult: 18, karma: -12, mood: -5 },
        outcome: "丹成的一刻，你听见炉里有人在叫你的名字。",
      },
      {
        label: "割自己一缕元神代替",
        effects: { cult: 8, maxAge: -20, mood: -10, insight: 3 },
        outcome: "你割下一缕元神。此后每逢阴雨，眉心都会隐隐作痛。",
      },
    ],
  });

  add({
    id: "dao_heart_4",
    daoTier: 5,
    daoAge: 300,
    title: "旧师",
    text:
      "宗门要你改投一位道祖门下，旧师的名字要从你的道籍里抹去。旧师没有争辩，只把你当年入门时的那把木剑放在桌上。",
    choices: [
      {
        label: "拒绝改投，守住旧师",
        effects: { mood: 8, karma: 5, insight: 4 },
        outcome: "你把木剑收回袖中。旧师看了你很久，最后只说：路还长。",
      },
      {
        label: "改投道祖门下（道心可能破碎）",
        risk: { p: 0.8, fail: { daoBreak: true, mood: -16, karma: -4 }, text: "名册换了。你从此再没有回过旧山门。" },
        effects: { cult: 15, stones: 60, insight: 2, mood: -4 },
        outcome: "名册换了。你从此再没有回过旧山门。",
      },
      {
        label: "两边都不认，独自下山",
        effects: { mood: -6, cult: 5, insight: 5 },
        outcome: "你走下石阶时，身后两扇山门同时关上。山风很大，没有人叫你的名字。",
      },
    ],
  });

  add({
    id: "dao_heart_5",
    daoTier: 6,
    daoAge: 600,
    title: "借道",
    text:
      "灵界同道愿意给你一条进入合体的捷径，条件是你交出师门功法。他们说，功法留在你手里也是蒙尘，不如换一个更长的寿元。",
    choices: [
      {
        label: "守住师门功法",
        effects: { mood: 8, insight: 5, karma: 3 },
        outcome: "你把玉简重新封好。那道捷径在身后慢慢熄灭，像一盏没人再点的灯。",
      },
      {
        label: "交出功法，换合体捷径（道心可能破碎）",
        risk: { p: 0.82, fail: { daoBreak: true, mood: -16, injury: 1 }, text: "捷径开了。你走进去时，听见师门的方向传来一声钟响。" },
        effects: { cult: 20, luck: 2, insight: 3, mood: -3 },
        outcome: "捷径开了。你走进去时，听见师门的方向传来一声钟响。",
      },
      {
        label: "把来使赶出洞府",
        effects: { mood: 3, karma: 2, insight: 2 },
        outcome: "来使走得很慢，像是在等你反悔。你没有叫住他。",
      },
    ],
  });

  add({
    id: "dao_repair_1",
    daoTier: 0,
    daoAge: 0,
    title: "补心",
    text:
      "道心破碎之后，你第一次从洞府里走出来。山还是那座山，路还是那条路，只是你每走一步，都听见心里有一层薄薄的裂响。",
    choices: [
      {
        label: "闭关问心，一坐十年",
        effects: { daoRepairStep: 1, mood: 10, maxAge: -10 },
        outcome: "十年后你推开洞门。门外落了一层很厚的灰，你的手却比从前稳了。",
      },
      {
        label: "去人间走一趟",
        effects: { daoRepairStep: 1, mood: 12, insight: 4, maxAge: -5 },
        outcome: "你在凡人的集市上吃了一碗热面。味道很淡，你却记了很久。",
      },
      {
        label: "把裂痕压下去，继续修行",
        effects: { daoRepairStep: 1, mood: -4, injury: 1 },
        outcome: "你把那层裂响按回胸口。它没有再响，但你知道它还在。",
      },
    ],
  });

  add({
    id: "dao_repair_2",
    daoTier: 0,
    daoAge: 0,
    title: "立心",
    text:
      "补心之后，你终于能重新面对那件让你道心破碎的事。旧路已经断了，但前面还可以重新选一条。",
    choices: [
      {
        label: "重新立誓，承认自己走错",
        effects: { daoRepairDone: true, daoScar: 1, mood: 10, insight: 4 },
        outcome: "你在山门前立下新誓。没有雷声，也没有天光，只有风把你的衣角吹得很轻。",
      },
      {
        label: "不改旧路，只把心补好",
        effects: { daoRepairDone: true, daoScar: 1, mood: 5, insight: 8 },
        outcome: "你没有换一条路。你只是终于不再为那件事逃了。",
      },
      {
        label: "以杀止念，逼自己忘掉",
        effects: { daoRepairDone: true, daoScar: 2, karma: -8, mood: -5, cult: 8 },
        outcome: "你杀了很多人。血把裂痕填满了，但你偶尔还是会在夜里醒来。",
      },
    ],
  });

  XD.DAO_HEART_EVENTS = daoEvents.sort((a, b) => a.tier - b.tier || a.age - b.age);
})();
