/* ==========================================================================
   致敬事件包 · 只借世界名词，剧情全部原创
   不包含原著正文、对白、具体情节或可攻略的原著人物。
   默认关闭；在「关于 · 你的数据」里打开「致敬事件」后才会进入事件池。
   ========================================================================== */
(function () {
  "use strict";
  const XD = (window.XD = window.XD || {});
  const E = XD.EVENTS;
  if (!Array.isArray(E)) return;

  function enabled() {
    try {
      return !!(XD.util && XD.util.store && XD.util.store.prefs().canonHomage);
    } catch (err) {
      return false;
    }
  }

  function add(event) {
    event.source = "homage";
    event.quote = "";
    event.review = "homage-only";
    event.once = true;
    E.push(event);
    XD.EVENT_BY_ID[event.id] = event;
  }

  add({
    id: "homage_yellow_valley",
    when: (s) => enabled() && s.world === "human" && s.sect === "黄枫谷" && s.tier >= 1 && s.age >= 20,
    w: 2,
    title: "旧碑",
    canonRef: "黄枫谷",
    text: "黄枫谷后山的旧碑被雨水冲得只剩半边。碑上刻着几个字，不是功法，也不是人名。你伸手摸了摸，石粉沾在指腹上。",
    choices: [
      { label: "读完剩下的字", effects: { insight: 3, mood: 1 }, outcome: "字不成句。你只记住了一个“等”字。" },
      { label: "拓一份带走", effects: { stones: -5, insight: 2, flag: "homage_rubbing" }, outcome: "拓纸上的墨迹很淡，像一层没有落下来的雨。" },
      { label: "把碑重新扶正", effects: { karma: 3, mood: 2 }, outcome: "你搬来几块石头，把碑脚垫稳。没有人在看。" },
    ],
  });

  add({
    id: "homage_tiannan_road",
    when: (s) => enabled() && s.world === "human" && s.origin.place.includes("天南") && s.tier >= 1 && s.age >= 20,
    w: 2,
    title: "官道茶棚",
    canonRef: "天南",
    text: "天南官道旁有一间没有招牌的茶棚。掌柜只收铜钱，不收灵石。他说这条路从前走过很多人，后来都不见了。",
    choices: [
      { label: "坐下喝一碗", effects: { mood: 3, stones: -1 }, outcome: "茶很苦。掌柜没有再说话，只把碗收走。" },
      { label: "问那些人去了哪里", effects: { insight: 3, mood: -1 }, outcome: "掌柜指了指北边。那里只有一条被草盖住的路。" },
      { label: "赶路", effects: { mood: 1 }, outcome: "你走出很远，回头时茶棚已经看不见了。" },
    ],
  });

  add({
    id: "homage_spirit_wall",
    when: (s) => enabled() && s.world === "spirit" && s.age >= 100,
    w: 2,
    title: "西墙旧砖",
    canonRef: "天渊城",
    text: "天渊城西墙的一段旧砖被换下来，堆在城外。砖缝里夹着半枚生锈的箭镞，和一小片烧黑的布。",
    choices: [
      { label: "把箭镞收起来", effects: { insight: 2, mood: 1, flag: "homage_arrowhead" }, outcome: "箭镞很轻，边缘却还能割破手指。" },
      { label: "把布埋了", effects: { karma: 3, mood: 2 }, outcome: "你没有找到名字，只在土上压了一块石头。" },
      { label: "离开", effects: { mood: 1 }, outcome: "风把砖缝里的灰吹起来，又慢慢落回去。" },
    ],
  });

  add({
    id: "homage_immortal_snow",
    when: (s) => enabled() && s.world === "immortal" && s.age >= 500,
    w: 2,
    title: "雪线旧亭",
    canonRef: "北寒仙域",
    text: "北寒仙域的雪线上有一座没有门的旧亭。亭柱上刻着一道很浅的剑痕，雪落在里面，积了百年也不化。",
    choices: [
      { label: "伸手碰那道剑痕", effects: { insight: 4, mood: -2 }, outcome: "指尖一凉。你听见很远的地方有人收剑。" },
      { label: "在亭里坐一会儿", effects: { mood: 3, insight: 1 }, outcome: "雪停了片刻。你没有等到任何人。" },
      { label: "继续赶路", effects: { mood: 1 }, outcome: "旧亭留在身后，像一个没有说完的句子。" },
    ],
  });

  add({
    id: "homage_starsea_ferry",
    when: (s) =>
      enabled() && s.world === "human" && s.origin.place.includes("乱星海") && s.tier >= 2 && s.age >= 30,
    w: 2,
    title: "旧渡口",
    canonRef: "乱星海",
    text: "乱星海有一座废弃渡口。木桩上系着半截旧绳，海风吹过时，绳子敲在桩上，像有人还在等船。",
    choices: [
      { label: "解开旧绳", effects: { karma: 2, mood: 1 }, outcome: "绳子断了。海面很静，没有船来。" },
      { label: "坐在桩边等一会儿", effects: { insight: 3, mood: 2 }, outcome: "你等到潮水退下去，才看见桩底刻着一个模糊的姓。" },
      { label: "离开渡口", effects: { mood: 1 }, outcome: "你沿着海岸走。身后的绳子还在响。" },
    ],
  });
  add({
    id: "homage_old_bottle",
    when: (s) => enabled() && s.world === "human" && s.age >= 12 && s.age <= 30,
    w: 2,
    title: "旧瓶传闻",
    canonRef: "掌天瓶",
    text: "坊市最角落的酒摊上，一个老修士压低声音说：有人在山里捡到过一只旧瓶，瓶底能渗出青液，催得活枯草。他说完就笑，说这种话每年都有人讲。",
    choices: [
      { label: "听完，记在心里", effects: { insight: 2, mood: 1 }, outcome: "你没有追问。老修士把最后一口酒喝完，起身走了。" },
      { label: "问瓶在哪里", effects: { insight: 3, luck: 1 }, outcome: "他指了指北边，又摇摇头。那条路没有名字。" },
      { label: "起身离开", effects: { mood: 1 }, outcome: "你走出酒摊。身后的声音很快被风吹散了。" },
    ],
  });

})();
