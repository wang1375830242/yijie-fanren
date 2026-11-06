/* ==========================================================================
   道统后段 · 元婴之后的分支选择与两条后续路
   每个道统一分为二，各给两条短事件，不改变基础 Build 公式。
   ========================================================================== */
(function () {
  "use strict";
  const XD = window.XD;
  if (!XD || !Array.isArray(XD.EVENTS)) return;
  const E = XD.EVENTS;

  function add(ev) {
    ev.once = true;
    ev.w = ev.w || 3;
    ev.when = ev.when || (() => false);
    E.push(ev);
    XD.EVENT_BY_ID[ev.id] = ev;
  }

  const base = [
    {
      path: "jian", id: "branch_jian", title: "剑心二择",
      text: "元婴成形后，你的剑第一次有了自己的声音。它问你：你要守一条剑心，还是走一条没有边的路？",
      choices: [
        { label: "守剑心", effects: { pathBranch: "jian_swordheart", insight: 6, mood: 3, trait: { calm: 2 } }, outcome: "你把剑收回鞘里。剑鸣没有停，但从此只在你允许的时候响。" },
        { label: "走无拘剑", effects: { pathBranch: "jian_freepath", cult: 8, mood: 1, trait: { bold: 2 } }, outcome: "你把剑抛向空中。它落下来时，剑尖指着山外。" },
      ],
    },
    {
      path: "dan", id: "branch_dan", title: "丹道二择",
      text: "元婴之后，丹炉里的火不再只是火。它开始问你：炼丹是为自己，还是为别人？",
      choices: [
        { label: "以丹证道", effects: { pathBranch: "dan_heaven", insight: 5, cult: 5, trait: { curious: 2 } }, outcome: "你封了丹房，只留一炉火。往后的丹，只给能走到最后的人。" },
        { label: "以丹济世", effects: { pathBranch: "dan_human", karma: 8, mood: 5, trait: { kind: 2 } }, outcome: "你把丹方抄了很多份。山下的药庐从此多了一个不收钱的大夫。" },
      ],
    },
    {
      path: "zhen", id: "branch_zhen", title: "阵道二择",
      text: "你布下的阵第一次困住了自己。阵心问你：阵是用来守人的，还是用来杀人的？",
      choices: [
        { label: "守阵", effects: { pathBranch: "zhen_guard", karma: 5, mood: 4, insight: 4, trait: { calm: 2 } }, outcome: "你把杀阵的阵眼一颗颗拔掉。护山大阵亮起来时，像一盏很慢的灯。" },
        { label: "杀阵", effects: { pathBranch: "zhen_kill", cult: 8, mood: -2, insight: 3, trait: { ruthless: 2 } }, outcome: "你把阵图反过来铺。此后山门外的风，都会先经过你的阵。" },
      ],
    },
    {
      path: "you", id: "branch_you", title: "游侠二择",
      text: "元婴之后，你走了很远。有一天你忽然发现，自己已经记不清最初想去的方向。",
      choices: [
        { label: "继续远游", effects: { pathBranch: "you_world", luck: 5, cult: 5, mood: 2, trait: { bold: 2 } }, outcome: "你把旧地图收起来。前面的路没有名字，你也不需要它有了。" },
        { label: "归乡", effects: { pathBranch: "you_home", karma: 6, mood: 6, insight: 3, trait: { kind: 2 } }, outcome: "你回到最初出发的地方。村口那棵树还在，树下的石凳换了新的。" },
      ],
    },
  ];

  base.forEach((item) => {
    add({
      id: item.id,
      when: (s) => s.world === "human" && s.tier >= 4 && s.sectPath === item.path && !s.pathBranch,
      title: item.title,
      text: item.text,
      choices: item.choices,
      sceneKey: `branch:${item.path}`,
    });
  });

  const followups = {
    jian_swordheart: [
      { title: "一剑问心", text: "你的剑心越来越静，静到能听见对手出剑前的那一口气。", choices: [{ label: "以静制动", effects: { insight: 5, cult: 4, mood: 2 }, outcome: "你没有先出剑。对手先动了，于是你看见了破绽。" }, { label: "先发制人", effects: { cult: 6, mood: -1 }, outcome: "你抢了半息。剑光落下时，山风才追上来。" }] },
      { title: "剑鞘", text: "你很久没有拔剑了。剑鞘上落了一层灰，剑却在里面发热。", choices: [{ label: "继续养剑", effects: { insight: 4, cult: 3, mood: 3 }, outcome: "你把剑留在鞘里。它没有生气，反而更安静了。" }, { label: "拔剑试锋", effects: { cult: 5, mood: 2, injury: 1 }, outcome: "剑光很短。你收剑时，虎口裂了一道细口。" }] },
    ],
    jian_freepath: [
      { title: "无拘", text: "你走过很多地方，剑也跟着你变了很多次。它不再像一把剑，更像一条路。", choices: [{ label: "继续走", effects: { luck: 4, cult: 5, mood: 2 }, outcome: "你没有停。路在前面，剑在手里，风在身后。" }, { label: "找一处山停下来", effects: { insight: 4, mood: 5 }, outcome: "你在一座没有名字的山上住了三年。剑挂在门口，谁也没有碰。" }] },
      { title: "旧剑", text: "你在坊市看见一把旧剑，剑柄上的缠绳和你当年用的一模一样。", choices: [{ label: "买下它", effects: { stones: -30, mood: 4, insight: 2 }, outcome: "旧剑很轻。你握着它，想起自己第一次握剑时的样子。" }, { label: "留给别人", effects: { karma: 4, mood: 3 }, outcome: "你把剑留在摊上。后来听说，一个少年用很便宜的价钱买走了它。" }] },
    ],
    dan_heaven: [
      { title: "一炉丹", text: "你炼出一炉没有名字的丹。它不治伤，也不涨修为，只让人看见自己最想看见的东西。", choices: [{ label: "服下", effects: { insight: 6, mood: -2 }, outcome: "你看见一条很长的路。醒来后，你忘了路尽头有什么。" }, { label: "封炉", effects: { mood: 4, cult: 3 }, outcome: "你把丹封进玉盒。有些答案，不知道也可以。" }] },
      { title: "丹成", text: "丹成时，炉里没有虹，只有一声很轻的叹息。", choices: [{ label: "记下丹方", effects: { insight: 5, cult: 4 }, outcome: "你写下的字比平时小。写完，你把纸压在炉底。" }, { label: "把丹方烧了", effects: { karma: 3, mood: 4 }, outcome: "纸灰落进炉火。你忽然觉得，这炉丹本来就该只出一次。" }] },
    ],
    dan_human: [
      { title: "药庐", text: "山下的药庐又排起了队。一个老人问你，能不能先给他的孙子看。", choices: [{ label: "先看孩子", effects: { karma: 6, mood: 5 }, outcome: "孩子的病不重。老人走时，把家里最后一篮鸡蛋留在了门口。" }, { label: "按顺序来", effects: { insight: 3, mood: 2, karma: 2 }, outcome: "你按顺序看完所有人。最后一个病人走时，天已经亮了。" }] },
      { title: "旧方", text: "你翻到一张旧丹方，最后一味药写着「自己」。", choices: [{ label: "按方抓药", effects: { insight: 5, mood: -3, karma: 2 }, outcome: "你没有吃。你把药包好，放在药庐最高的架子上。" }, { label: "把方子留给后人", effects: { karma: 5, mood: 3 }, outcome: "你在方子背面写了一行小字：能不试，就不试。" }] },
    ],
    zhen_guard: [
      { title: "守夜", text: "护山大阵亮了一夜。你在阵眼里坐着，听见山下有人敲钟。", choices: [{ label: "守到天亮", effects: { karma: 5, mood: 3, cult: 3 }, outcome: "天亮时钟停了。你站起来，膝盖已经麻了。" }, { label: "出去看看", effects: { insight: 4, luck: 2 }, outcome: "敲钟的人已经走了。钟下压着一封没有署名的信。" }] },
      { title: "阵心", text: "阵心老了。你换上一块新石，整座山门跟着你一起呼吸。", choices: [{ label: "与阵同息", effects: { cult: 5, insight: 4, mood: 2 }, outcome: "你听见山门里每一块石头的声音。它们都很慢。" }, { label: "让阵自己走", effects: { mood: 4, karma: 3 }, outcome: "你退出阵眼。阵还在呼吸，只是不再和你同步。" }] },
    ],
    zhen_kill: [
      { title: "杀阵", text: "你在山门外布了一座杀阵。阵成那晚，山里没有一只鸟叫。", choices: [{ label: "留下它", effects: { cult: 6, mood: -3, karma: -3 }, outcome: "你站在阵外看了很久。阵纹像一张合拢的网。" }, { label: "撤掉一半", effects: { insight: 4, mood: 3, karma: 2 }, outcome: "你撤掉最狠的几道阵纹。夜里，山里又有了鸟叫。" }] },
      { title: "阵眼", text: "杀阵的阵眼需要一个人守。你坐进去时，听见很多年前自己的心跳。", choices: [{ label: "守阵", effects: { cult: 5, karma: -2, mood: -2 }, outcome: "你在阵眼里坐了很久。出来时，山门外的草已经长到膝盖。" }, { label: "换一个阵眼", effects: { insight: 4, karma: 2, mood: 2 }, outcome: "你把阵眼换成一枚旧铜钱。阵还在，但不再喝血。" }] },
    ],
    you_world: [
      { title: "远方", text: "你又到了一个没有名字的渡口。船夫问你，这一次要去哪里。", choices: [{ label: "去最远的地方", effects: { luck: 5, mood: 3, cult: 4 }, outcome: "你上船时没有回头。水面上的灯，一盏一盏落在身后。" }, { label: "留下来看看", effects: { insight: 4, mood: 4, stones: 20 }, outcome: "你在渡口住了半个月。船夫说，你是第一个没有急着走的人。" }] },
      { title: "旧路", text: "你走回很多年前走过的一条路。路边的客栈还在，老板已经换了人。", choices: [{ label: "住一晚", effects: { mood: 5, insight: 3 }, outcome: "房间很小，窗外还是那棵树。你睡得很好。" }, { label: "继续赶路", effects: { cult: 4, luck: 3 }, outcome: "你没有进门。老板在身后喊了一声，你没有听清。" }] },
    ],
    you_home: [
      { title: "归乡", text: "你回到出生的地方。老屋塌了一半，院里的树却还在。", choices: [{ label: "把屋子修好", effects: { stones: -40, mood: 6, karma: 4 }, outcome: "你修了三个月。新屋顶盖好那天，村里的人都来看。" }, { label: "在树下坐一会儿", effects: { mood: 5, insight: 4 }, outcome: "你坐到天黑。树影落在地上，像一条很旧的路。" }] },
      { title: "旧人", text: "小时候的玩伴还在村里。他认了你很久，才叫出你的名字。", choices: [{ label: "留下来喝酒", effects: { mood: 6, karma: 2 }, outcome: "你们喝到半夜。他说了很多村里的事，你记住了其中几件。" }, { label: "留下一笔钱", effects: { stones: -30, karma: 5, mood: 3 }, outcome: "你没有留下吃饭。走到村口时，他还在后面站着。" }] },
    ],
  };

  Object.keys(followups).forEach((branch) => {
    followups[branch].forEach((item, index) => {
      add({
        id: `branch_${branch}_${index + 1}`,
        when: (s) => s.world === "human" && s.tier >= 4 && s.pathBranch === branch,
        title: item.title,
        text: item.text,
        choices: item.choices,
        sceneKey: `branch:${branch}:${index + 1}`,
      });
    });
  });
})();
