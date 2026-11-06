/* ==========================================================================
   灵界/仙界扩章 · 两界主线之后的余波
   只补现有主线后的余波，不新增地图、不改变境界节奏。
   ========================================================================== */
(function () {
  "use strict";
  const XD = window.XD;
  if (!XD || !Array.isArray(XD.EVENTS)) return;
  const E = XD.EVENTS;

  function add(ev) {
    ev.once = true;
    ev.w = 2;
    ev.when = ev.when || (() => false);
    E.push(ev);
    XD.EVENT_BY_ID[ev.id] = ev;
  }

  add({
    id: "s_exp_1", when: (s) => s.world === "spirit" && s.flags.s_main_closed && !s.flags.s_exp_1,
    title: "西墙之后",
    text: "西墙重建了十年。新墙比旧墙矮一截，城里的人说这样能看见远处的天。",
    choices: [
      { label: "留下来帮工", effects: { karma: 5, mood: 4, stones: 30, flag: "s_exp_1" }, outcome: "你搬了三个月石头。新墙的第一盏灯亮时，你在下面。" },
      { label: "继续赶路", effects: { insight: 4, luck: 3, flag: "s_exp_1" }, outcome: "你出城时，西墙的钟响了一声。你没有回头。" },
    ],
  });

  add({
    id: "s_exp_2", when: (s) => s.world === "spirit" && s.flags.s_exp_1 && !s.flags.s_exp_2,
    title: "旧部",
    text: "当年守西墙的旧部找到你。他们老了很多，身上还穿着那件补了又补的军袍。",
    choices: [
      { label: "跟他们喝一杯", effects: { mood: 6, karma: 4, flag: "s_exp_2" }, outcome: "酒很烈。他们说起那些没回来的人，说到一半就停了。" },
      { label: "给他们指一条路", effects: { stones: -40, karma: 6, insight: 3, flag: "s_exp_2" }, outcome: "你给他们留了盘缠。他们走后，屋里安静了很久。" },
    ],
  });

  add({
    id: "s_exp_3", when: (s) => s.world === "spirit" && s.flags.s_exp_2 && !s.flags.s_exp_3,
    title: "边城春雪",
    text: "灵界也会下雪。边城的春天来得晚，桃花开在残墙下面，像没有看见过战争。",
    choices: [
      { label: "在边城住下", effects: { mood: 8, karma: 4, cult: 3, flag: "s_exp_3" }, outcome: "你租了一间小屋。每天早晨，城墙上的雪都比昨天少一点。" },
      { label: "去更远的地方", effects: { luck: 5, insight: 5, flag: "s_exp_3" }, outcome: "你走出边城。身后的桃花被风吹了一地。" },
    ],
  });

  add({
    id: "i_exp_1", when: (s) => s.world === "immortal" && s.flags.i_main_closed && !s.flags.i_exp_1,
    title: "雪线之后",
    text: "灰潮退去后，北寒仙域的雪线向后退了三百里。空出来的地方，长出一种没有名字的白花。",
    choices: [
      { label: "采一朵带走", effects: { insight: 5, mood: 3, flag: "i_exp_1" }, outcome: "白花离土就枯了。你把干花夹进旧书里。" },
      { label: "留在原地", effects: { karma: 4, mood: 5, flag: "i_exp_1" }, outcome: "你没有采。第二年再来时，那里已经开成了一片。" },
    ],
  });

  add({
    id: "i_exp_2", when: (s) => s.world === "immortal" && s.flags.i_exp_1 && !s.flags.i_exp_2,
    title: "仙官的旧账",
    text: "一位仙官找到你，说当年北寒灰线的事，仙宫还欠你一笔账。他问你想要什么。",
    choices: [
      { label: "要一块封地", effects: { stones: 300, mood: 4, flag: "i_exp_2" }, outcome: "封地很小，只有一座山。但山上的雪很干净。" },
      { label: "要一个名字", effects: { insight: 6, mood: 3, flag: "i_exp_2" }, outcome: "仙官沉默很久，在玉牌背面刻下了一个名字。那不是你的名字。" },
    ],
  });

  add({
    id: "i_exp_3", when: (s) => s.world === "immortal" && s.flags.i_exp_2 && !s.flags.i_exp_3,
    title: "云海旧钟",
    text: "云海深处有一口旧钟。没有人记得它为什么在那里，也没有人敢敲。",
    choices: [
      { label: "敲一下", effects: { cult: 5, insight: 5, mood: -2, flag: "i_exp_3" }, outcome: "钟声传得很远。你听见下界有人抬头。" },
      { label: "把钟擦干净", effects: { karma: 4, mood: 5, flag: "i_exp_3" }, outcome: "钟面上的灰擦掉后，底下刻着很多名字。你找到了一个熟悉的。" },
    ],
  });
})();
