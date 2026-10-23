/* ==========================================================================
   一介凡人 · 事件簿
   条件事件：when(s) 判定；choices 可为函数；effects 由模拟器统一结算。
   ========================================================================== */
(function () {
  "use strict";
  const XD = window.XD;

  const E = [];
  function add(ev) {
    ev.id = ev.id || "ev" + E.length;
    if (ev.once === undefined) ev.once = true;
    if (ev.w === undefined) ev.w = 10;
    E.push(ev);
  }

  /* ======================================================================
     一、孩提（凡人 / 未测灵根）
     ====================================================================== */
  add({
    id: "c_rain",
    when: (s) => s.tier === 0 && s.age >= 6 && s.age <= 11,
    w: 12,
    title: "山中雨",
    text: "你在后山避雨，石缝里透出一点青光。伸手进去，摸出一枚温润的玉片，上面刻着半个「引」字。",
    choices: [
      {
        label: "揣进怀里，谁也不说",
        effects: { luck: 3, flag: "jade" },
        outcome: "此后你常在夜里听见极轻的流水声，像有人在很远的地方磨剑。",
      },
      {
        label: "放回原处，磕三个头",
        effects: { karma: 3, mood: 3 },
        outcome: "雨停了。你回头看了一眼，石缝已经合拢，只剩一片湿痕。",
      },
    ],
  });

  add({
    id: "c_taoist",
    when: (s) => s.tier === 0 && s.age >= 7 && s.age <= 12,
    w: 10,
    title: "游方道人",
    text: "一个背桃木剑的游方道人讨水喝。他看了你很久，说：「这孩子眉间有股气，可惜被什么东西压着。」",
    choices: [
      {
        label: "追上去，问他什么叫「气」",
        effects: { insight: 5, flag: "met_taoist" },
        outcome: "道人笑而不答，只在你掌心画了一道符。第二天，符不见了，掌心有一点温热。",
      },
      {
        label: "躲到母亲身后",
        effects: { mood: 3, luck: 2 },
        outcome: "道人摇摇头走了。你从母亲身后探出头，看见他的背影在雨里淡成一团墨。",
      },
    ],
  });

  add({
    id: "c_bandit",
    when: (s) => s.tier === 0 && s.age >= 8 && s.age <= 15,
    w: 9,
    title: "山贼过境",
    text: "半夜狗叫得厉害。父亲披衣出去，再没回来。山贼的火把在院墙外晃，母亲把你塞进了灶膛后的夹墙。",
    choices: [
      {
        label: "抄起柴刀冲出去",
        risk: { p: 0.45, text: "你被一刀背砸在肩上，但父亲活着回来了。", fail: { death: true, cause: "死于山贼刀下" } },
        effects: { mood: -6, karma: 4 },
        outcome: "你被一刀背砸在肩上，血顺着胳膊流。父亲把你抱起来，一直没说话。",
      },
      {
        label: "捂住嘴，等他们走",
        effects: { mood: -10, insight: 3, flag: "saw_bandits" },
        outcome: "天亮时，院子里只剩一地的脚印。你学会了不出声地哭。",
      },
      {
        label: "点燃柴房，引开他们",
        risk: { p: 0.3, text: "火借风势，山贼退了。", fail: { death: true, cause: "葬身火海" } },
        effects: { luck: 5, karma: -2, mood: -4 },
        outcome: "火光冲天。山贼骂着去抢东西，没人再管这间破屋。",
      },
    ],
  });

  add({
    id: "c_fever",
    when: (s) => s.tier === 0 && s.age >= 5 && s.age <= 12,
    w: 8,
    title: "一场高热",
    text: "你烧了七天，退下去的时候，人瘦了一圈。母亲说你梦见自己在一个很黑的地方走了很久。",
    choices: [
      {
        label: "只记得有一盏灯",
        effects: { insight: 4, mood: -2 },
        outcome: "那盏灯后来常常出现在你的梦里。它不亮，但一直没灭。",
      },
      {
        label: "什么也不记得了",
        effects: { mood: 3 },
        outcome: "你很快就忘了这回事。小孩子忘性大，这是好事。",
      },
    ],
  });

  add({
    id: "c_fox",
    when: (s) => s.tier === 0 && s.age >= 7 && s.age <= 15,
    w: 8,
    title: "白狐",
    text: "雪地里卧着一只白狐，后腿被兽夹咬住了。它看着你，眼睛像两粒化了的水。",
    choices: [
      {
        label: "掰开兽夹，放它走",
        effects: { karma: 6, luck: 3 },
        outcome: "白狐一瘸一拐地走了，走出十几步，回头看了你一眼。",
      },
      {
        label: "剥了皮，能换半袋米",
        effects: { stones: 8, karma: -6 },
        outcome: "皮子卖了好价钱。当夜你梦见一双眼睛，醒来时枕头是湿的。",
      },
      {
        label: "带回家养着",
        effects: { mood: 6, flag: "fox" },
        outcome: "它养了半个月就走了。走的时候，灶台上多了一株不认识的花。",
      },
    ],
  });

  add({
    id: "c_book",
    when: (s) => s.tier === 0 && s.age >= 8 && s.age <= 15,
    w: 7,
    title: "半部残卷",
    text: "货郎的担子里压着一本没头没尾的旧书，画着一些打坐的小人，旁边写着你看不懂的字。",
    choices: [
      {
        label: "用三个铜板买下来",
        effects: { insight: 6, stones: -3, flag: "old_book" },
        outcome: "你照着小人比划了半夜，第二天醒来，觉得胸口有一小团热气。",
      },
      {
        label: "翻完了事，放回去",
        effects: { insight: 2 },
        outcome: "你记住了几个姿势，后来都忘了。",
      },
    ],
  });

  /* ======================================================================
     二、测灵根（十岁，强制）
     ====================================================================== */
  add({
    id: "root_test",
    when: () => false,
    once: true,
    title: "测灵根",
    text: (s) => {
      if (s.root.key === "none") {
        const noneLeads = [
          "十岁这年，镇上来了一位替人摸骨的老道。",
          "十岁这年，母亲带你去庙里上香。一个老道看了你一眼。",
          "十岁这年，村里来了个游方道士，挨家挨户化缘。",
          "十岁这年，你在村口遇见一个背剑的老人。他停下来看了你很久。",
        ];
        const lead = noneLeads[(s.seed >>> 0) % noneLeads.length];
        return `${lead}他把手按在你头顶，闭眼半晌，说：「经脉闭塞，灵窍未开。孩子，你没有灵根。」围观的人散了，母亲把你抱得更紧。`;
      }
      const leads = [
        "十岁这年，有仙门来到你住的地方，设了测灵台。",
        "十岁这年，镇上的仙门执事挨家挨户摸骨。轮到你时，他把手停了停。",
        "十岁这年，你在山上砍柴，遇见一个白衣人。他看了你很久。",
        "十岁这年，村里来了两位仙师，说只测有缘人。你被挤在人群最后。",
        "十岁这年，镇上的仙师摆了三日测灵台。你排到第三天才轮上。",
        "十岁这年，你在河边遇见一个钓鱼的老人。他收起鱼竿，说你该去测一测。",
      ];
      const lead = leads[(s.seed >>> 0) % leads.length];
      return `${lead}他取出一块青玉，让你把手放上去。玉中亮起了${s.root.name === "天灵根" ? "一道" : "几道"}光。他抬起头，第一次正眼看你：「${s.root.name}。你可愿上山？」`;
    },
    choices: (s) => {
      if (s.root.key === "none") {
        const base = [
          {
            label: "学一门手艺，陪在父母身边",
            effects: { mood: 6, karma: 2, path: "mortal" },
            outcome: "你跟着镇上的木匠学了三年。刨花落在脚背上，日子过得很慢，也很实在。",
          },
          {
            label: "上山碰运气，做个杂役也好",
            effects: { mood: 0, insight: 3, luck: 2, path: "mortal", sect: "七玄门杂役" },
            outcome: "你在七玄门后山劈了十年柴，见过仙人，也见过仙人死。",
          },
        ];
        if (s.bottle) {
          base.unshift({
            label: "夜里，旧瓶里渗出一滴青液",
            effects: { awaken: true, mood: 8 },
            outcome: "你把那滴青液倒在舌下。一股冰凉的东西冲开经脉，你疼得在地上打滚，天亮时，你已经能看见空气里流动的光。",
          });
        }
        return base;
      }
      const sectChoices = [
        {
          label: "入黄枫谷",
          effects: { sect: "黄枫谷", mood: 5, stones: 20, begin: true },
          outcome: "黄枫谷的山门在云里。你走完九百级石阶，回头看见来路已经被雾吞了。",
        },
        {
          label: "入掩月宗",
          effects: { sect: "掩月宗", insight: 4, mood: 3, begin: true },
          outcome: "掩月宗的师姐替你把脉，说你根骨不差，就是心太软。她说这话时在笑。",
        },
        {
          label: "入灵兽山",
          effects: { sect: "灵兽山", insight: 2, luck: 3, begin: true },
          outcome: "灵兽山的师兄让你挑一只幼兽。你蹲了很久，最后是一只不起眼的灰羽鸟先跳到你手上。",
        },
        {
          label: "不入宗门，做个散修",
          effects: { sect: "散修", stones: 45, luck: 4, mood: -2, begin: true },
          outcome: "你没有师父，没有靠山，只有一间租来的洞府和一本翻烂的入门功法。",
        },
        {
          label: "婉拒仙门，回家侍奉父母",
          effects: { path: "mortal", mood: 12, karma: 10 },
          outcome: "执事没有劝你。他说：「修行是逆天的事，孝顺是顺天的事。都不亏。」",
        },
      ];
      const available =
        s.gender === "女"
          ? sectChoices
          : sectChoices.filter((c) => c.effects.sect !== "掩月宗");
      const offset = (s.seed >>> 0) % available.length;
      return available.slice(offset).concat(available.slice(0, offset));
    },
  });

  /* ======================================================================
     三、凡尘一生（无灵根）
     ====================================================================== */
  add({
    id: "m_martial",
    when: (s) => s.path === "mortal" && s.age >= 14 && s.age <= 24,
    w: 10,
    title: "武馆",
    text: "城里的武馆在招人，管饭，三年出师。教头是个断了三根手指的老头，他说学武不能成仙，但能不被人欺负。",
    choices: [
      {
        label: "拜师，扎三年马步",
        effects: { mood: 5, insight: 3, flag: "martial" },
        outcome: "三年后你能一掌劈开三块青砖。教头拍拍你的肩，说你比他当年强。",
      },
      {
        label: "不入武馆，去做买卖",
        effects: { stones: 25, insight: 2 },
        outcome: "你挑着担子走街串巷，学会看人脸色，也学会算账。",
      },
    ],
  });

  add({
    id: "m_marry",
    when: (s) => s.path === "mortal" && s.age >= 18 && s.age <= 30 && !s.partner,
    w: 12,
    title: "婚事",
    text: "媒人来了三回。邻村的姑娘你见过一次，在河边洗衣，挽着袖子，手腕很细。母亲问你中不中意。",
    choices: [
      {
        label: "中意，就她了",
        effects: { partner: "妻子", mood: 10, karma: 3 },
        outcome: "婚礼办得很简单，一桌酒，两床新被。她进门那天，院子里的枣树正好开花。",
      },
      {
        label: "再等等，我想出去看看",
        effects: { mood: -2, luck: 3, flag: "roam" },
        outcome: "你背起包袱出了镇。走到山口回头，母亲还站在那里。",
      },
    ],
  });

  add({
    id: "m_child",
    when: (s) => s.path === "mortal" && s.partner && s.age >= 24 && s.age <= 42 && !s.flags.has_child,
    w: 10,
    title: "添丁",
    text: "孩子出生在秋分。接生婆说是个男孩，哭声响得像打雷。你抱着他，手都不知道往哪放。",
    choices: [
      {
        label: "给他取名，教他做人",
        effects: { mood: 12, karma: 4, flag: "has_child" },
        outcome: "你把自己没走过的路，都铺在了他脚下。",
      },
      {
        label: "让他将来读书，别像我",
        effects: { mood: 8, insight: 4, stones: -20, flag: "has_child" },
        outcome: "你请了镇上的秀才开蒙。孩子很争气，字写得比你好看。",
      },
    ],
  });

  add({
    id: "m_war",
    when: (s) => s.path === "mortal" && s.age >= 24 && s.age <= 52,
    w: 8,
    title: "征兵",
    text: "边关打起来了。县里的告示贴在城门上，一家出一丁。里正拿着册子，在你家门口站了很久。",
    choices: [
      {
        label: "我去",
        risk: { p: 0.35, text: "你活着回来了，右腿落下了病。", fail: { death: true, cause: "战死边关" } },
        effects: { mood: -6, karma: 5, stones: 20 },
        outcome: "两年后你回来了，瘦得脱形。村口的老槐树还在。",
      },
      {
        label: "花钱买人顶替",
        effects: { stones: -60, mood: -4, karma: -5 },
        outcome: "替你去的是个外乡人。你后来再没见过他，也不敢打听。",
      },
      {
        label: "带着家人逃进山里",
        effects: { mood: -8, luck: 3, karma: -2 },
        outcome: "你们在山里躲了三年。回来时，村子已经空了。",
      },
    ],
  });

  add({
    id: "m_plague",
    when: (s) => s.path === "mortal" && s.age >= 28 && s.age <= 62,
    w: 7,
    title: "瘟疫",
    text: "城里开始死人。先是城西的乞丐，然后是药铺的伙计。官府封了城门，家家户户在门口撒石灰。",
    choices: [
      {
        label: "守着家人，闭门不出",
        risk: { p: 0.2, text: "你们熬过来了。", fail: { death: true, cause: "死于瘟疫" } },
        effects: { mood: -5 },
        outcome: "两个月后城门开了。你数了数，街坊少了小半。",
      },
      {
        label: "去药铺帮忙，能救一个是一个",
        risk: { p: 0.35, text: "你活了下来，也救了几十个人。", fail: { death: true, cause: "染疫身亡" } },
        effects: { karma: 12, mood: 4 },
        outcome: "你在药铺里熬了四十天药。有人给你磕头，你拉都拉不起来。",
      },
    ],
  });

  add({
    id: "m_business",
    when: (s) => s.path === "mortal" && s.age >= 20 && s.age <= 50,
    w: 8,
    title: "一桩买卖",
    text: "南边的盐价涨了三成，有人邀你合伙走一趟私盐。本钱要押上全部家当，来回三个月。",
    choices: [
      {
        label: "押上全部",
        risk: { p: 0.45, text: "盐顺利出手，赚了三倍。", fail: { stones: -999, mood: -10 } },
        failText: "船在半路被截了。你赔光了本钱，还欠下一笔债。",
        effects: { stones: 120, mood: 4 },
        outcome: "你回来了，银子装了两口箱子。那年冬天，你家第一次烧上了炭。",
      },
      {
        label: "不干，安稳些好",
        effects: { mood: 2 },
        outcome: "后来那批人被官府查了。你听说时，正在院里晒谷子。",
      },
    ],
  });

  add({
    id: "m_descendant",
    when: (s) => s.path === "mortal" && s.flags.has_child && s.age >= 45 && s.age <= 70,
    w: 6,
    title: "儿孙",
    text: "孙子会走路了，总爱拽你的胡子。儿子说想送他去读书，问你舍不舍得。",
    choices: [
      {
        label: "舍得，砸锅卖铁也供",
        effects: { mood: 10, stones: -40, karma: 4 },
        outcome: "你把攒了半辈子的钱交出去，心里空了一块，又满了一块。",
      },
      {
        label: "留在身边，学门手艺",
        effects: { mood: 6, stones: 10 },
        outcome: "孩子学木匠，手艺比你还细。你觉得这样也好。",
      },
    ],
  });

  add({
    id: "m_luck",
    when: (s) => s.path === "mortal" && s.age >= 20 && s.age <= 55,
    w: 2,
    title: "山里的老人",
    text: "你在山里避雨，遇见一个衣衫褴褛的老人。他看了你一眼，说：「你命里有一线没断干净的东西。」他从袖子里摸出一枚黑色的丸子。",
    choices: [
      {
        label: "吞下去",
        risk: {
          p: 0.5,
          text: "你活了下来，经脉被硬生生撑开一线。",
          fail: { death: true, cause: "药力爆体" },
        },
        effects: { awaken: true, mood: 6 },
        outcome: "剧痛之后，你听见了自己血流的声音。老人已经不见了，地上只有一枚空壳。",
      },
      {
        label: "不敢吃，收起来",
        effects: { luck: 4, flag: "black_pill" },
        outcome: "你把丸子收进贴身的口袋，后来常常拿出来看。",
      },
    ],
  });

  add({
    id: "m_old",
    when: (s) => s.path === "mortal" && s.age >= 58,
    w: 8,
    title: "老去",
    text: "你的眼睛花了，走两步就喘。孙子扶你到门口晒太阳，问你年轻的时候想做什么。",
    choices: [
      {
        label: "说：想上山看看",
        effects: { mood: 6 },
        outcome: "你说完自己笑了。山就在那里，你一辈子没上去过。",
      },
      {
        label: "说：想把你们都养大",
        effects: { mood: 8, karma: 3 },
        outcome: "孙子说，那你做到了呀。你闭上眼睛，太阳很暖。",
      },
    ],
  });

  /* ======================================================================
     四、炼气 · 筑基
     ====================================================================== */
  add({
    id: "q_bully",
    when: (s) => s.tier === 1 && s.age >= 12 && s.age <= 40,
    w: 10,
    title: "同门相欺",
    text: "外门弟子抢了你三个月的月例，还把你晾在崖边的药篓踢下山。领头的姓赵，筑基期的族兄在执事堂当差。",
    choices: [
      {
        label: "忍下来，把药重新采一遍",
        effects: { mood: -6, insight: 3, stones: -5 },
        outcome: "你在崖下找了三天，捡回了大半。从那以后，你把药篓背在身上睡觉。",
      },
      {
        label: "夜里堵他，打回去",
        risk: { p: 0.4, text: "你打断了他一条腿，也挨了三十鞭。", fail: { death: true, cause: "斗殴致死" } },
        effects: { mood: 4, karma: -3, flag: "zhao_enemy" },
        outcome: "你被吊在祠堂前打了三十鞭。姓赵的没再来找过你。",
      },
      {
        label: "把此事捅到执事堂",
        effects: { karma: 3, mood: -2, luck: -2 },
        outcome: "执事罚了他三个月月例，也记了你一笔「好生事端」。",
      },
    ],
  });

  add({
    id: "q_herb",
    when: (s) => s.tier >= 1 && s.tier <= 2 && s.age >= 14,
    w: 12,
    title: "采药遇兽",
    text: "你在一处背阴的崖壁上看见一株紫纹参。刚把绳子放下去，石缝里探出一颗银灰色的蛇头，信子几乎贴到你的脸。",
    choices: [
      {
        label: "拔剑，先下手",
        risk: { p: 0.35, text: "你斩了蛇，取了参，肩膀被咬了一口。", fail: { death: true, cause: "死于蛇毒" } },
        effects: { stones: 40, cult: 4, mood: -3 },
        outcome: "紫纹参卖了四十块灵石。伤养了半年，疤一直没消。",
      },
      {
        label: "松绳退走，命要紧",
        effects: { mood: 2, luck: 2, insight: 2 },
        outcome: "你退到崖下，看见那条蛇盘在参上，一动不动。它也在守。",
      },
      {
        label: "撒雄黄，等它走",
        effects: { stones: 25, cult: 2, insight: 2 },
        outcome: "你等了六个时辰。蛇终于游走了，参还在。你的手一直在抖。",
      },
    ],
  });

  add({
    id: "q_market",
    when: (s) => s.tier >= 1 && s.tier <= 3 && s.age >= 16,
    w: 10,
    title: "坊市",
    text: "坊市最里面的摊子上摆着一堆旧货，其中一只灰扑扑的铜环，看起来像是废料。你拿起它时，指尖有一点麻。",
    choices: [
      {
        label: "花二十块灵石买下",
        effects: { stones: -20, luck: 4, insight: 3, flag: "copper_ring" },
        outcome: "回去擦拭了三天，铜环内壁浮出两个极小的字：锁灵。",
      },
      {
        label: "放下，去买该买的丹药",
        effects: { stones: -10, mood: 2, cult: 2 },
        outcome: "你买了三瓶聚气丹和半斤灵砂。摊主在你走后把铜环收了回去。",
      },
    ],
  });

  add({
    id: "q_valley",
    when: (s) => s.tier >= 1 && s.tier <= 2 && s.age >= 20,
    w: 8,
    title: "落霞谷",
    text: "宗门开了落霞谷，只放炼气后期以下的弟子进去七日。谷里有灵药，也有别人。进去的人，出来时往往少几个。",
    choices: [
      {
        label: "进去，专挑僻静处",
        risk: { p: 0.3, text: "你带回了两株百年灵草和一身伤。", fail: { death: true, cause: "死于落霞谷" } },
        effects: { stones: 60, cult: 8, mood: -4 },
        outcome: "第七日傍晚，你从谷口爬出来。身后的雾里，有人在喊你的名字。",
      },
      {
        label: "约上同门，结伴而行",
        risk: { p: 0.15, text: "你们互相照应，平安出来了。", fail: { death: true, cause: "被同门所害" } },
        effects: { stones: 40, cult: 4, mood: 2, karma: 3 },
        outcome: "出来时四个人剩四个。分药的时候，谁也没多拿。",
      },
      {
        label: "不进去，在谷口收药",
        effects: { stones: 25, insight: 2 },
        outcome: "你在谷口摆了个摊，收购别人带出来的残药。七天赚的比进去还多。",
      },
    ],
  });

  add({
    id: "q_bottle",
    when: (s) => s.bottle && s.age >= 12 && s.age <= 30,
    w: 20,
    title: "旧瓶",
    text: "那只从山缝里捡来的旧瓶，今夜忽然发热。瓶底渗出一滴青色的液体，落在桌上，把一小片木屑催成了一株嫩芽。",
    choices: [
      {
        label: "收好，此事绝不外传",
        effects: { mood: 6, luck: 5, flag: "bottle_known" },
        outcome: "你把旧瓶缝进贴身的内袋。从今往后，你睡觉都朝里侧。",
      },
      {
        label: "试着把青液滴在灵草上",
        effects: { stones: 80, cult: 6, flag: "bottle_known" },
        outcome: "一夜之间，三株灵草长成了三十年药龄。你第一次觉得，命也许是可以改的。",
      },
    ],
  });

  add({
    id: "q_bottleneck",
    when: (s) => s.tier === 1 && s.cult >= 65 && s.age >= 18,
    w: 9,
    title: "炼气瓶颈",
    text: "第十三层迟迟冲不上去。每次吐纳到最后,丹田里就像堵着一块石头。师门长辈说，这是心不静。",
    choices: [
      {
        label: "闭关三年，死磕",
        effects: { cult: 12, mood: -6, insight: 3 },
        outcome: "第三年冬天，那块石头裂了一道缝。你吐出一口黑血，觉得浑身轻了。",
      },
      {
        label: "下山走走，散散心",
        effects: { mood: 10, luck: 4, cult: 2 },
        outcome: "你在山下看了一场庙会，吃了一碗很甜的面。回来之后，那口气忽然就顺了。",
      },
      {
        label: "借丹药强行冲关",
        effects: { cult: 18, mood: -4, stones: -40, flag: "pill_dep" },
        outcome: "丹药化开的一瞬，你听见经脉里发出细微的爆响。成了，但你知道自己欠了身体一笔债。",
      },
    ],
  });

  add({
    id: "q_sectwar",
    when: (s) => s.tier >= 1 && s.tier <= 3 && s.age >= 20,
    w: 9,
    title: "魔道攻山",
    text: "护山大阵在半夜亮了。天边一片血色，魔道的人踩着飞舟压过来。执事堂的钟敲得又急又乱。",
    choices: [
      {
        label: "上阵",
        risk: { p: 0.35, text: "你守住了一段城墙，也看见了太多死人。", fail: { death: true, cause: "战死于山门" } },
        effects: { karma: 8, mood: -8, stones: 60, flag: "war_vet" },
        outcome: "三天三夜，山门没破。战后清点，你那一队剩了七个。",
      },
      {
        label: "护送低阶弟子从后山撤",
        effects: { karma: 6, mood: -2, insight: 3 },
        outcome: "你带着二十几个孩子走了七天山路。他们后来都记得你的名字。",
      },
      {
        label: "趁乱卷了库房的东西走",
        effects: { stones: 220, karma: -15, luck: -3, flag: "looter" },
        outcome: "你从后山离开时，山门正在烧。你没有回头。",
      },
    ],
  });

  add({
    id: "f_auction",
    when: (s) => s.tier >= 1 && s.tier <= 2 && s.age >= 20,
    w: 9,
    title: "筑基丹",
    text: "万宝楼的拍卖会，最后一枚筑基丹被抬了上来。底价一百灵石，你身上只有一半。旁边坐着一个满头白发的老修士，也在看那枚丹药。",
    choices: [
      {
        label: "倾家荡产拍下来",
        risk: { p: 0.5, text: "你拍到了。", fail: { stones: -999, mood: -8 } },
        failText: "你举到一半，价已经超出全部身家。老修士拍下了它，临走时看了你一眼。",
        effects: { stones: -100, breakBonus: 18, mood: 5 },
        outcome: "落槌的一刻，你的手心全是汗。老修士看了你一眼，什么也没说。",
      },
      {
        label: "让给他，结个善缘",
        effects: { karma: 5, luck: 3, mood: -2 },
        outcome: "老修士拍下丹药，临走时递给你一张符：「小友，后会有期。」",
      },
      {
        label: "不拍了，回去苦修",
        effects: { cult: 6, mood: -4, insight: 2 },
        outcome: "你走出万宝楼，天在下雨。你忽然觉得，凭自己也能行。",
      },
    ],
  });

  add({
    id: "f_partner",
    when: (s) => s.tier >= 2 && s.age >= 30 && !s.partner,
    w: 9,
    title: "道侣",
    text: "那个人与你在一处秘境里共过生死。出来后，把一枚同心结放在你手心，说：「修行路长，一个人走太冷。」",
    choices: [
      {
        label: "收下",
        effects: { partner: "道侣", mood: 15, cult: 3, karma: 3 },
        outcome: "你们在洞府前种了一株桃树。对方说等树开花，就一起下山看看。",
      },
      {
        label: "婉拒，道心不稳",
        effects: { mood: -8, insight: 5, cult: 4 },
        outcome: "对方把同心结收了回去，笑了一下。后来对方成了亲，你送了一份厚礼。",
      },
    ],
  });

  add({
    id: "c_secret",
    when: (s) => s.tier >= 2 && s.tier <= 4 && s.age >= 50,
    w: 7,
    title: "残图",
    text: "你从一具古修士的遗骸上摸出半张兽皮，上面画着一座殿的轮廓，标注着「虚天」二字。图的另一半，据说在乱星海。",
    choices: [
      {
        label: "去乱星海找另一半",
        risk: { p: 0.4, text: "你找到了，也活着回来了。", fail: { death: true, cause: "死于乱星海" } },
        effects: { stones: 200, cult: 10, insight: 6, flag: "xutian" },
        outcome: "两半兽皮拼合的那晚，图上多出了一行小字：入殿者，九死一生。",
      },
      {
        label: "把图卖了，换现成的资源",
        effects: { stones: 180, mood: 2 },
        outcome: "买图的是个蒙面修士。你拿着灵石走出坊市，觉得背后有人在看。",
      },
      {
        label: "烧了它，不惹这个因果",
        effects: { karma: 3, mood: 3, luck: 2 },
        outcome: "兽皮烧起来是绿色的。你看着它卷成灰，心里松了一口气。",
      },
    ],
  });

  add({
    id: "c_heart",
    when: (s) => s.tier >= 2 && s.mood <= 38,
    w: 16,
    title: "心魔",
    text: "打坐时，你看见了自己。那个你站在血里，手里提着一颗头，问你：「你修到今天，到底是为了什么？」",
    choices: [
      {
        label: "直视它，一字一句答",
        risk: { p: 0.55, text: "你答上来了。心魔散去，心境反而更稳。", fail: { death: true, cause: "走火入魔" } },
        effects: { mood: 18, insight: 6 },
        outcome: "你说：「为了活着，为了不让在意的人死。」心魔笑了，然后碎了。",
      },
      {
        label: "闭眼，不去看",
        effects: { mood: -6, cult: -6, flag: "heart_scar" },
        outcome: "你强行压了下去。代价是此后每次突破，它都会再来一次。",
      },
      {
        label: "服静心丹，稳住心神",
        effects: { mood: 10, stones: -20 },
        outcome: "丹药化开，那片血色淡了。你知道这只是暂时的。",
      },
    ],
  });

  add({
    id: "n_disciple",
    when: (s) => s.tier >= 4 && s.age >= 150 && s.disciples.length < 3,
    w: 7,
    title: "收徒",
    text: "一个少年跪在洞府外三天三夜，膝盖下的石头都染了血。他说他灵根不好，但他想修。你看见他，像看见很多年前的自己。",
    choices: [
      {
        label: "收下",
        effects: { disciple: "弟子", mood: 8, karma: 4 },
        outcome: "你给他取了道号，把自己的第一本功法抄了一份给他。他磕了九个响头。",
      },
      {
        label: "不收，给他一本功法便打发",
        effects: { karma: 2, mood: -2, stones: -10 },
        outcome: "少年捧着功法走了。很多年后，你听说他在北边闯出了名号。",
      },
    ],
  });

  add({
    id: "n_tribulation",
    when: (s) => s.tier === 3 && s.cult >= 92,
    w: 30,
    title: "结婴之劫",
    text: "天上聚起铅灰色的云，云心有一点紫光。你要结婴了。方圆百里的修士都在看着这座山。",
    choices: [
      {
        label: "以本命法宝迎劫",
        risk: { p: 0.55, text: "雷落了三道，你扛住了。", fail: { death: true, cause: "陨于结婴之劫" } },
        effects: { breakBonus: 12, mood: 6, cult: 3 },
        outcome: "第三道雷把你的法宝劈成两半，也把你劈进了元婴期。",
      },
      {
        label: "布阵，借地势卸雷",
        risk: { p: 0.65, text: "大阵碎了，人还活着。", fail: { death: true, cause: "陨于结婴之劫" } },
        effects: { breakBonus: 8, stones: -80 },
        outcome: "阵法替你扛下了大半。你从废墟里爬出来，头发全白了。",
      },
      {
        label: "散去半数修为，避劫",
        effects: { cult: -40, mood: -10, insight: 8 },
        outcome: "雷云散了。你保住了命，也保住了结丹期的境界。",
      },
    ],
  });

  add({
    id: "d_node",
    when: (s) =>
      s.tier === 5 &&
      s.cult >= 85 &&
      !(s.flags.wait_spirit_until && s.age < s.flags.wait_spirit_until),
    w: 30,
    once: false,
    title: "空间节点",
    text: "人界的天已经装不下你了。宗门古籍上记着一处空间节点，在极北的冰原之下。进去的人，有的到了灵界，有的什么也没留下。",
    choices: [
      {
        label: "入节点，飞升灵界",
        risk: { p: 0.6, text: "你在空间乱流里撑了过来。", fail: { death: true, cause: "陨于空间乱流" } },
        effects: { ascend: "spirit", mood: 8 },
        outcome: "光怪陆离的通道尽头，你看见了两轮月亮。",
      },
      {
        label: "再等等，先把人界的事办完",
        effects: { mood: -4, insight: 4, wait: "spirit" },
        outcome: "你回了趟青牛镇。屋子早就塌了，只剩下半截院墙。",
      },
    ],
  });

  /* ======================================================================
     五、灵界
     ====================================================================== */
  add({
    id: "s_arrive",
    when: (s) => s.world === "spirit" && s.age >= 0 && !s.flags.arrived_spirit,
    w: 60,
    title: "天渊城",
    text: "你从空间裂缝里跌出来，落在一片灰白的荒原上。远处的城墙高得看不见顶，城头挂着人族的旗。守城的军士看了你的修为，说：「下界来的？先登记。」",
    choices: [
      {
        label: "入城，从头做起",
        effects: { stones: 60, mood: 4, flag: "arrived_spirit", sect: "天渊城" },
        outcome: "你分到一间石屋，一张床，一把钥匙。灵界的第一夜，你睡得很沉。",
      },
      {
        label: "不入城，先在荒原上找处洞府",
        effects: { stones: 20, insight: 6, flag: "arrived_spirit", luck: 4 },
        outcome: "你在荒原深处找到一处废弃洞府。灵气比人界浓十倍，也冷十倍。",
      },
    ],
  });

  add({
    id: "s_war",
    when: (s) => s.world === "spirit" && s.age >= 100,
    w: 10,
    title: "异族叩关",
    text: "天渊城的号角响了七天。城外的异族像潮水，一波退下去，一波又上来。城主府征召所有炼虚以上修士上城墙。",
    choices: [
      {
        label: "上城墙",
        risk: { p: 0.3, text: "你守住了东段城墙。", fail: { death: true, cause: "战死于天渊城" } },
        effects: { karma: 10, mood: -6, stones: 300, flag: "spirit_war" },
        outcome: "战后，城墙上多了一块碑。你活着看见了自己的名字被刻上去。",
      },
      {
        label: "出城，绕到敌后断粮道",
        risk: { p: 0.4, text: "你烧了他们的粮仓。", fail: { death: true, cause: "战死于敌后" } },
        effects: { karma: 6, cult: 6, stones: 200, insight: 4 },
        outcome: "你回来时，城里的人看你的眼神变了。",
      },
      {
        label: "趁乱离开天渊城",
        effects: { karma: -10, mood: -4, luck: 2 },
        outcome: "你走的时候，城还在烧。你没有回头，这一次也没有。",
      },
    ],
  });

  add({
    id: "s_unity",
    when: (s) => s.tier === 6 && s.cult >= 70,
    w: 12,
    title: "合体之壁",
    text: "炼虚后期，你摸到了一层看不见的壁。它不是灵气不够，而是你这一身道，还没有真正成形。",
    choices: [
      {
        label: "入世三百年，去做一件与修行无关的事",
        effects: { mood: 12, insight: 10, cult: 6 },
        outcome: "你在一个小族里当了三百年的教书先生。回来的那天，壁自己裂了。",
      },
      {
        label: "强行冲关",
        risk: { p: 0.4, text: "你冲过去了。", fail: { death: true, cause: "陨于合体之劫" } },
        effects: { cult: 20, mood: -8 },
        outcome: "你以重伤换来了合体。此后三百年，你的左臂一直抬不起来。",
      },
    ],
  });

  add({
    id: "m_ascend",
    when: (s) =>
      s.tier === 8 &&
      s.cult >= 80 &&
      !(s.flags.wait_immortal_until && s.age < s.flags.wait_immortal_until),
    w: 40,
    once: false,
    title: "渡劫飞升",
    text: "大乘后期，天不再下雨。你抬头，看见云层里有一道门。门后面是仙界。要过去，得先挨过九道天雷。",
    choices: [
      {
        label: "迎雷而上",
        risk: { p: 0.5, text: "九道雷，你过了。", fail: { death: true, cause: "陨于飞升天劫" } },
        effects: { ascend: "immortal", mood: 10 },
        outcome: "最后一道雷落在你身上时，你听见了很远的地方有人在笑。",
      },
      {
        label: "再等一个甲子，把根基夯实",
        effects: { cult: -10, mood: 4, insight: 8, breakBonus: 10, wait: "immortal" },
        outcome: "你退回洞府，闭了六十年的关。再出来时，天雷的味道都不一样了。",
      },
    ],
  });

  /* ======================================================================
     六、仙界
     ====================================================================== */
  add({
    id: "i_arrive",
    when: (s) => s.world === "immortal" && !s.flags.arrived_immortal,
    w: 60,
    title: "北寒仙域",
    text: "你落在一条结冰的河上。抬头，天上有三层云，每层云里都有宫殿。一个穿白衣的仙官飘下来，递给你一块玉牌：「仙界不是享福的地方。」",
    choices: [
      {
        label: "接下玉牌",
        effects: { stones: 200, mood: 6, flag: "arrived_immortal" },
        outcome: "玉牌上刻着你的名字，下面一行小字：北寒仙域·散仙。",
      },
      {
        label: "不接，自己走",
        effects: { mood: 2, luck: 6, insight: 4, flag: "arrived_immortal" },
        outcome: "仙官没有拦你。你在冰原上走了三个月，才看见第一座城。",
      },
    ],
  });

  add({
    id: "i_palace",
    when: (s) => s.world === "immortal" && s.age >= 1000,
    w: 10,
    title: "仙宫征召",
    text: "仙宫来人了。他们说北寒仙域缺一个镇守，任期三千年，仙俸丰厚，但要离开你熟悉的一切。",
    choices: [
      {
        label: "接下镇守之位",
        effects: { stones: 800, cult: 8, mood: -6, karma: 5, flag: "palace" },
        outcome: "你在一座冰城坐了三十年。城里的人叫你仙君。",
      },
      {
        label: "拒绝，继续做你的散仙",
        effects: { mood: 8, luck: 4, insight: 4 },
        outcome: "使者走后，你在雪里站了很久。自由是有代价的，你一直知道。",
      },
    ],
  });

  add({
    id: "i_ruin",
    when: (s) => s.world === "immortal" && s.age >= 2000,
    w: 9,
    title: "坠落的仙宫",
    text: "天外掉下来半座宫殿，砸穿了三座仙山。仙宫封了那片地方，但所有人都知道，里面有好东西。",
    choices: [
      {
        label: "潜进去",
        risk: { p: 0.4, text: "你带出了一枚仙器残片。", fail: { death: true, cause: "死于仙宫废墟" } },
        effects: { cult: 10, stones: 500, insight: 8, flag: "ruin" },
        outcome: "废墟深处有一口钟，你碰了一下，它在你的识海里响了一百年。",
      },
      {
        label: "不碰，这种因果太重",
        effects: { karma: 4, mood: 2, insight: 3 },
        outcome: "三个月后，那片废墟连同一整座山消失了。你庆幸自己没去。",
      },
    ],
  });

  add({
    id: "i_daozu",
    when: (s) => s.tier === 12 && s.cult >= 90,
    w: 60,
    title: "道祖之争",
    text: "道祖不是唯一的位置。每一条大道走到尽头，都有一个位置。此刻，你面前那条路的尽头空着。你站在大罗天上，看见另外两道身影也在往这里来。",
    choices: [
      {
        label: "争",
        risk: { p: 0.45, text: "你赢了。", fail: { death: true, cause: "陨于道祖之争" } },
        effects: { become: "daozu" },
        outcome: "你坐上了那条大道的尽头。万界忽然安静下来，安静得能听见自己的心跳。",
      },
      {
        label: "退，把这个位置让出去",
        effects: { mood: 10, karma: 10, insight: 10 },
        outcome: "你转身走了。身后传来一声巨响，然后是很长的寂静。",
      },
    ],
  });

  /* ======================================================================
     七、横生枝节（通用）
     ====================================================================== */
  add({
    id: "x_life",
    when: (s) => s.age >= s.maxAge * 0.82 && s.tier >= 1 && s.tier <= 8,
    w: 30,
    title: "寿元将尽",
    text: "你算了一遍又一遍。剩下的寿元，不够你冲到下一个境界了。镜子里的脸还是年轻的，可你自己知道，灯油快尽了。",
    choices: [
      {
        label: "倾家荡产求一枚延寿丹",
        requires: { stones: 160 },
        effects: { stones: -999, maxAge: 40, mood: 4 },
        outcome: "丹药买到了。多出来的四十年，你一天一天地数着过。",
      },
      {
        label: "把剩下的时间用来陪身边的人",
        effects: { mood: 15, karma: 6 },
        outcome: "你不再闭关。你陪道侣看了很多次日落，把该说的话都说完了。",
      },
      {
        label: "拼死冲关",
        effects: { cult: 25, mood: -10, flag: "desperate" },
        outcome: "你把所有丹药一次吞了下去。要么破境，要么死。",
      },
    ],
  });

  add({
    id: "x_karma",
    when: (s) => s.karma <= -25,
    w: 12,
    once: false,
    title: "旧账",
    text: "一个你不认识的人拦住了你。他说他姓什么你已经忘了，但你当年做过的事，他记了一辈子。",
    choices: [
      {
        label: "认了，任他动手",
        risk: { p: 0.35, text: "他打了你三掌，走了。", fail: { death: true, cause: "死于旧仇" } },
        effects: { karma: 8, mood: -6 },
        outcome: "你没有还手。他打完，坐在地上哭了很久。",
      },
      {
        label: "斩草除根",
        risk: { p: 0.2, text: "你活下来了，因果又重了一层。", fail: { death: true, cause: "死于旧仇" } },
        effects: { karma: -10, mood: -4, stones: 40 },
        outcome: "你处理得很干净。可从那以后，你开始怕黑。",
      },
      {
        label: "给他一笔灵石，了结此事",
        effects: { stones: -120, karma: 5, mood: 2 },
        outcome: "他收了灵石，临走时说：「你还是怕了。」你没有反驳。",
      },
    ],
  });

  add({
    id: "x_oldfriend",
    when: (s) => s.tier >= 3 && s.age >= 200,
    w: 8,
    title: "故人",
    text: "有人送来一封信。信上的字迹你认得，是很多年前认识的一个人。他说他快不行了，想见你最后一面。",
    choices: [
      {
        label: "去",
        effects: { mood: 6, karma: 4, insight: 4 },
        outcome: "你赶上了。他拉着你的手，说的第一句话是：「你一点都没变。」",
      },
      {
        label: "不去，修行要紧",
        effects: { mood: -8, cult: 4 },
        outcome: "三天后，你收到消息。你把信烧了，坐在洞里很久没动。",
      },
    ],
  });

  add({
    id: "x_demon",
    when: (s) => s.tier >= 2 && s.tier <= 5 && s.age >= 60,
    w: 7,
    title: "魔功",
    text: "一本残破的功法落在你手里。修它，进境快得吓人；代价写在最后一页，只有四个字：以人为炉。",
    choices: [
      {
        label: "修",
        effects: { cult: 30, karma: -20, mood: -6, flag: "demon" },
        outcome: "你的修为一日千里。夜里，你开始听见很多人的呼吸声。",
      },
      {
        label: "烧了它",
        effects: { karma: 5, mood: 3, insight: 3 },
        outcome: "灰烬里浮出一张人脸，很快就散了。",
      },
      {
        label: "收起来，也许以后有用",
        effects: { luck: -2, flag: "demon_kept" },
        outcome: "你把功法压在箱底。它一直在那里，像一个不说话的债主。",
      },
    ],
  });

  add({
    id: "x_beast",
    when: (s) => s.tier >= 3 && s.tier <= 6,
    w: 6,
    title: "化形",
    text: "一只受了重伤的白鹿撞进你的洞府，倒在你脚边。它的角上有雷纹，不是凡物。片刻后，山外传来人声。",
    choices: [
      {
        label: "藏起来，替它挡下追兵",
        risk: { p: 0.3, text: "追兵走了。白鹿化成一个白衣少女。", fail: { death: true, cause: "死于追兵之手" } },
        effects: { karma: 10, luck: 6, mood: 6 },
        outcome: "少女向你行了一礼，说它欠你一条命。后来，你在最危险的时候见过她一次。",
      },
      {
        label: "交出去，换一笔灵石",
        effects: { stones: 300, karma: -12, mood: -4 },
        outcome: "追兵给了你灵石，把鹿拖走了。你关门的时候，看见它一直在看你。",
      },
    ],
  });

  add({
    id: "x_ruins",
    when: (s) => s.tier >= 2 && s.tier <= 4,
    w: 8,
    title: "古修洞府",
    text: "山体塌了半边，露出一条石阶。石阶上的禁制已经朽坏，但还认得出是上古的手法。",
    choices: [
      {
        label: "进去看看",
        risk: { p: 0.25, text: "你找到了半部功法和一些灵石。", fail: { death: true, cause: "死于古修禁制" } },
        effects: { stones: 120, insight: 5, cult: 5 },
        outcome: "洞府的主人坐化在蒲团上，骨头已经成了灰。你替他掩了土。",
      },
      {
        label: "上报宗门，领一份功劳",
        effects: { stones: 60, karma: 4, sect: "宗门执事" },
        outcome: "宗门派人来封了洞府。执事长老多看了你一眼。",
      },
    ],
  });

  /* ======================================================================
     八、少年与山门之间（补充气氛）
     ====================================================================== */
  add({
    id: "q_first_sword",
    when: (s) => s.tier === 1 && s.age >= 12 && s.age <= 25,
    w: 8,
    title: "第一柄剑",
    text: "宗门发下第一柄制式飞剑，青钢所铸，剑柄上还留着上一位主人的手汗。你握着它，忽然不知道该做什么。",
    choices: [
      {
        label: "去崖边练到天黑",
        effects: { cult: 3, mood: 5, insight: 2 },
        outcome: "天黑时，你终于能让它离手三尺。剑落在石头上，弹了两下。",
      },
      {
        label: "拿去坊市换一柄更好的",
        effects: { stones: 15, cult: 1 },
        outcome: "你添了十五块灵石，换了一柄轻些的。原来的剑被摊主随手丢进筐里。",
      },
    ],
  });

  add({
    id: "q_letters",
    when: (s) => s.world === "human" && s.tier >= 1 && s.age >= 15 && s.origin.family !== "渔村孤儿",
    w: 6,
    title: "家书",
    text: "山下的信送上来了。母亲的字歪歪扭扭，说家里都好，让你不必挂念。信纸上有几处被水浸过的痕迹。",
    choices: [
      {
        label: "回信，并托人带些银钱回去",
        effects: { stones: -20, mood: 6, karma: 3 },
        outcome: "你写了三页，最后只留下一句：「儿在山中一切安好。」",
      },
      {
        label: "把信收好，继续闭关",
        effects: { mood: -4, cult: 3 },
        outcome: "你把信压在枕头下。那天夜里，你打坐总是走神。",
      },
    ],
  });

  add({
    id: "f_roam",
    when: (s) => s.tier >= 2 && s.tier <= 3 && s.age >= 60,
    w: 6,
    title: "凡俗故地",
    text: "你路过一座小镇，忽然想起这里是你小时候赶集的地方。镇子比记忆里小了很多，卖糖人的铺子还在。",
    choices: [
      {
        label: "买一个糖人，坐在桥边吃完",
        effects: { mood: 10, karma: 2 },
        outcome: "糖人很甜。卖糖人的是个年轻人，说他爷爷以前也在这儿摆摊。",
      },
      {
        label: "去找找祖坟还在不在",
        effects: { mood: 4, karma: 4, insight: 3 },
        outcome: "坟头长满了草。你清理了半天，磕了三个头，没让任何人看见。",
      },
    ],
  });

  /* ======================================================================
     九、补录：后期与人间余事
     ====================================================================== */
  add({
    id: "q_dream",
    when: (s) => s.tier >= 1 && s.tier <= 3 && s.age >= 14 && s.age <= 90,
    w: 7,
    title: "梦中传法",
    text: "你梦见一个看不清脸的人，在雾里教你一套吐纳的法子。醒来时，经脉里多了一线不属于你的凉意。",
    choices: [
      {
        label: "照着练",
        effects: { cult: 5, insight: 4, mood: -2 },
        outcome: "你练了三个月，那一线凉意散进了丹田。此后再做梦，雾里没有人了。",
      },
      {
        label: "醒来就忘",
        effects: { mood: 3, luck: 2 },
        outcome: "你把它当成一个怪梦。可偶尔打坐时，手会不自觉地摆出那个姿势。",
      },
    ],
  });

  add({
    id: "f_debt",
    when: (s) => s.tier >= 2 && s.tier <= 4 && s.age >= 60,
    w: 7,
    title: "旧人情",
    text: "当年救过你的那个散修找上门来。他被人追杀，想在你洞府里躲三个月。你看见他袖口有血，已经干了。",
    choices: [
      {
        label: "收留三个月",
        risk: { p: 0.28, text: "追兵没找到这里。他走的时候，把半块玉简留在了桌上。", fail: { death: true, cause: "被仇家堵在洞府" } },
        effects: { karma: 8, mood: -2, insight: 3 },
        outcome: "追兵没找到这里。他走的时候，把半块玉简留在了桌上。",
      },
      {
        label: "给他八十块灵石，让他走",
        effects: { stones: -80, karma: 2, mood: -1 },
        outcome: "他收了灵石，没有道谢。你知道他这一走，大概就再也见不到了。",
      },
      {
        label: "闭门不见",
        effects: { karma: -6, mood: -3 },
        outcome: "你在门后站了很久。脚步声远了，又停了。第二天门口有一小滩血。",
      },
    ],
  });

  add({
    id: "s_beastwave",
    when: (s) => s.world === "spirit" && s.age >= 100,
    w: 8,
    title: "兽潮",
    text: "天渊城外的荒原上，兽潮像一条黑线压过来。城头在征兵，军帐里有人在争论要不要放弃西线。",
    choices: [
      {
        label: "上城墙",
        risk: { p: 0.38, text: "你守住了西墙的一段。", fail: { death: true, cause: "战死于兽潮" } },
        effects: { karma: 8, stones: 220, mood: -6, insight: 2 },
        outcome: "兽潮退了三天。城墙上多了很多名字，你活下来，替他们记着。",
      },
      {
        label: "去守粮道",
        risk: { p: 0.2, text: "粮道没断。", fail: { death: true, cause: "死于兽潮" } },
        effects: { karma: 4, stones: 120, mood: -2 },
        outcome: "你在粮道上守了七天七夜。最后一车灵谷进城时，你靠着车轮睡着了。",
      },
      {
        label: "闭门不出",
        effects: { karma: -6, mood: -4 },
        outcome: "你把洞府禁制加了三层。城外的声音传进来，像有人在很远的地方敲鼓。",
      },
    ],
  });

  add({
    id: "i_law",
    when: (s) => s.world === "immortal" && s.age >= 1000,
    w: 8,
    title: "一线法则",
    text: "你在北寒仙域的雪线上坐了三百年，忽然摸到一条极细的线。它像是这天地的某条规矩，冷得烫手。",
    choices: [
      {
        label: "顺着它走",
        effects: { insight: 6, cult: 6, mood: 2 },
        outcome: "你没有抓住它，只是跟着走了很远。醒来时，雪停了，身上多了一层说不清的东西。",
      },
      {
        label: "斩断它",
        risk: { p: 0.3, text: "线断了，你吐出一口金色的血。", fail: { death: true, cause: "被法则反噬" } },
        effects: { cult: 15, mood: -4 },
        outcome: "线断了，你吐出一口金色的血。从此这片雪原上，再没有那条线。",
      },
      {
        label: "把它记下来",
        effects: { insight: 4, luck: 2 },
        outcome: "你用了三十年，把它画成一幅谁也看不懂的图。后来这幅图救了你一次。",
      },
    ],
  });

  /* ======================================================================
     十、问心：人生节点的问题
     ====================================================================== */
  add({
    id: "age_5",
    when: () => false,
    w: 0,
    title: "问心 · 五岁",
    text: (s) => {
      const variants = [
        "五岁这年，母亲问你想成为什么样的人。你想了很久。",
        "五岁这年，父亲把你架在肩头去看庙会。回来的路上，他问你想成为什么样的人。",
        "五岁这年，村里来了个走江湖的说书人。讲到一半，他忽然停下来问你：你想成为什么样的人？",
        "五岁这年，你在灶台边帮母亲添柴。她看着火，忽然问你想成为什么样的人。",
        "五岁这年，你发了一场烧。退烧后，母亲坐在床边问你想成为什么样的人。",
        "五岁这年，隔壁家添了小孩。你趴在门口看，父亲忽然问你想成为什么样的人。",
      ];
      return variants[(s.seed >>> 0) % variants.length];
    },
    choices: (s) => {
      const variants = [
        [
          {
            label: "让家里人过上好日子",
            effects: { mood: 5, karma: 2 },
            outcome: "大人笑了。那句话你记了很多年。",
          },
          {
            label: "去山外看看",
            effects: { luck: 3, insight: 2 },
            outcome: "你不知道山外有什么，但你知道自己想去。",
          },
          {
            label: "像现在这样就很好",
            effects: { mood: 4 },
            outcome: "母亲摸摸你的头。那一年很平静。",
          },
        ],
        [
          {
            label: "想让爹娘不再受苦",
            effects: { mood: 5, karma: 3 },
            outcome: "你说得很认真。大人沉默了一会儿，才笑着点头。",
          },
          {
            label: "想去山外看看",
            effects: { luck: 3, insight: 2 },
            outcome: "你抬头看向山的方向。那里只有云。",
          },
          {
            label: "想一辈子留在村里",
            effects: { mood: 4, karma: 1 },
            outcome: "这句话让大人笑了很久。后来你才知道，留在村里也不容易。",
          },
        ],
        [
          {
            label: "想变得很强",
            effects: { insight: 3, mood: 2 },
            outcome: "大人问你为什么。你说不上来，只觉得强了就不会怕。",
          },
          {
            label: "想保护家里人",
            effects: { karma: 4, mood: 3 },
            outcome: "大人把你抱起来，说你长大了一岁。",
          },
          {
            label: "还没想过",
            effects: { mood: 2, luck: 2 },
            outcome: "大人说没关系。五岁本来就不用想那么远。",
          },
        ],
      ];
      return variants[(s.seed >>> 0) % variants.length];
    },
  });

  add({
    id: "age_15",
    when: () => false,
    w: 0,
    title: "问心 · 十五岁",
    text: (s) => {
      if (s.tier > 0) {
        const variants = [
          "十五岁，你已经在山门里待了几年。每天挑水、劈柴、听师兄讲那些听不太懂的道理。有人问你，为什么留在这里。",
          "十五岁，山门发了冬衣。你把自己的那件让给了更小的弟子，师兄看了你一眼，问你图什么。",
          "十五岁，你第一次独自下山采买。回来时山门已经关了，你在石阶上坐了一夜。",
          "十五岁，药圃里的灵草枯了一半。执事问是谁值的夜，你站了起来。",
          "十五岁，山门里丢了东西。所有人都在看你，因为你是最后一个离开的。",
          "十五岁，你第一次领到自己的月例。灵石不多，你数了三遍。",
        ];
        return variants[(s.seed >>> 0) % variants.length];
      }
      const variants = [
        "十五岁，你第一次看见仙人御剑从天上过。剑光很快，像一道白色的线。",
        "十五岁，镇上的说书人又来了。这次讲的是有人亲眼见过仙人。",
        "十五岁，你在田里干活，抬头看见一道剑光从云后划过去。",
        "十五岁，你跟着父亲去城里送药，远远看见一位仙师从城门走进来。",
      ];
      return variants[(s.seed >>> 0) % variants.length];
    },
    choices: (s) => {
      if (s.tier > 0) {
        const variants = [
          [
            {
              label: "想走得更远",
              effects: { insight: 3, mood: 2 },
              outcome: "你说想看看山上面还有什么。师兄笑了一声，没说你痴心妄想。",
            },
            {
              label: "想护住山下的人",
              effects: { karma: 4, mood: 3 },
              outcome: "你说完，自己也有点不好意思。可这句话你后来记了很久。",
            },
            {
              label: "还没想好",
              effects: { mood: 2, luck: 2 },
              outcome: "师兄说，没想好也正常。大多数人都是走着走着才知道的。",
            },
          ],
          [
            {
              label: "想看看更高的山",
              effects: { insight: 3, mood: 2 },
              outcome: "你说这话时，师兄没有笑，只是抬头看了一眼山顶。",
            },
            {
              label: "想守住现在",
              effects: { karma: 3, mood: 3 },
              outcome: "你说完，自己也不知道这算不算志向。",
            },
            {
              label: "还没想好",
              effects: { mood: 2, luck: 2 },
              outcome: "师兄说，没想好也正常。山门里的日子还长。",
            },
          ],
          [
            {
              label: "想证明自己",
              effects: { insight: 2, mood: 3 },
              outcome: "你不想再被人看轻。这句话你没有说出口。",
            },
            {
              label: "想护住身边的人",
              effects: { karma: 4, mood: 2 },
              outcome: "你说得很轻，但没有人笑。",
            },
            {
              label: "想下山看看",
              effects: { luck: 3, insight: 1 },
              outcome: "山下的路你还没走过。你只见过它在地图上的样子。",
            },
          ],
        ];
        return variants[(s.seed >>> 0) % variants.length];
      }
      return [
        {
          label: "想学",
          effects: { insight: 3, mood: 2 },
          outcome: "你追着那道剑光跑了很远，直到它消失在云里。",
        },
        {
          label: "害怕",
          effects: { mood: 2, luck: 1 },
          outcome: "你躲到树后，心跳了很久。仙人没有看见你。",
        },
        {
          label: "不信",
          effects: { insight: 1, luck: 2 },
          outcome: "你告诉自己那是眼花。可后来很多年，你总会抬头看天。",
        },
      ];
    },
  });

  add({
    id: "age_30",
    when: () => false,
    w: 0,
    title: "问心 · 三十岁",
    text: "三十岁，你开始明白修行不是一条一定能走通的路。有人问你图什么。",
    choices: [
      {
        label: "图长生",
        effects: { cult: 3, mood: -2 },
        outcome: "你说得很平静。那人看了你一眼，没有再问。",
      },
      {
        label: "图身边的人",
        effects: { karma: 5, mood: 4 },
        outcome: "你说完自己愣了一下。原来这才是你一直没走的原因。",
      },
      {
        label: "图看一看更高的地方",
        effects: { insight: 4, luck: 2 },
        outcome: "你抬头看了看山。山后面还有山。",
      },
    ],
  });

  add({
    id: "age_50",
    when: () => false,
    w: 0,
    title: "问心 · 五十岁",
    text: "五十岁，你送走了一个认识的人。回来的路上，你忽然想：如果此生只能走到这里……",
    choices: [
      {
        label: "认了",
        effects: { mood: 6 },
        outcome: "你接受了这个念头。那天晚上，你睡得很沉。",
      },
      {
        label: "不甘",
        effects: { cult: 4, mood: -3 },
        outcome: "你把洞府里的灯点到天亮。第二天，你继续打坐。",
      },
      {
        label: "把路留给后人",
        effects: { karma: 5, insight: 3 },
        outcome: "你开始整理自己的功法。有些东西，比境界更值得留下。",
      },
    ],
  });

  add({
    id: "age_70",
    when: () => false,
    w: 0,
    title: "问心 · 七十岁",
    text: "七十岁，你坐在门口晒太阳。有人问你怕不怕死。",
    choices: [
      {
        label: "怕",
        effects: { mood: 2, insight: 2 },
        outcome: "你说怕。那人点点头，说怕是应该的。",
      },
      {
        label: "不怕",
        effects: { mood: 3, karma: 2 },
        outcome: "你说不怕。太阳很暖，你眯起眼睛。",
      },
      {
        label: "还没活够",
        effects: { cult: 3, mood: -2 },
        outcome: "你说完笑了。那人也笑了，说你像个年轻人。",
      },
    ],
  });

  add({
    id: "age_path",
    when: () => false,
    w: 0,
    title: "问心 · 此身",
    text: "你已踏上修行路，见过许多人停在半路。有人问你，走到今天，图什么。",
    choices: [
      {
        label: "图一个长生",
        effects: { cult: 3, mood: -1 },
        outcome: "你说得很轻。那人却沉默了很久。",
      },
      {
        label: "图身边的人",
        effects: { karma: 5, mood: 4 },
        outcome: "你想起几个名字。有些还在，有些已经不在了。",
      },
      {
        label: "图看一看更高的地方",
        effects: { insight: 4, luck: 2 },
        outcome: "你抬头。天很高，云后面还有云。",
      },
    ],
  });

  /* ======================================================================
     十一、后期补录：灵界与仙界的余事
     ====================================================================== */
  add({
    id: "s_newcomer",
    when: (s) => s.world === "spirit" && s.age >= 300,
    w: 9,
    title: "下界来人",
    text: "天渊城西坊最近来了个下界修士，逢人便打听回去的路。他说下面还有人在等他。",
    choices: [
      {
        label: "给他指一条活路",
        effects: { karma: 5, stones: -50, mood: 3 },
        outcome: "你给了他一张旧地图，又替他付了半个月的房钱。他走的时候，给你磕了个头。",
      },
      {
        label: "收他做杂役",
        effects: { stones: 30, karma: -2, mood: -1 },
        outcome: "他留了下来，替你扫地、喂鹤、看门。你很少和他说话。",
      },
      {
        label: "不管",
        effects: { karma: -3, mood: -1 },
        outcome: "你从他身边走过去。西坊很大，一个人很容易就找不到了。",
      },
    ],
  });

  add({
    id: "s_market",
    when: (s) => s.world === "spirit" && s.age >= 500,
    w: 10,
    title: "灵界坊市",
    text: "坊市深处有人卖一枚来路不明的空间戒指。摊主说里面有一部功法，也有一缕别人的残魂。",
    choices: [
      {
        label: "买下再说",
        effects: { stones: -120, luck: 5, insight: 3 },
        outcome: "戒指里没有功法，只有一小片旧时代的雪。你把它收进了储物袋。",
      },
      {
        label: "先请人鉴定",
        effects: { stones: -20, insight: 4 },
        outcome: "鉴定师看了很久，说这戒指不值钱，但戒指里的雪是真的。",
      },
      {
        label: "走开",
        effects: { mood: 1 },
        outcome: "你走出坊市。身后有人叫卖，声音很快被风吹散了。",
      },
    ],
  });

  add({
    id: "s_sky",
    when: (s) => s.world === "spirit" && s.age >= 1000,
    w: 8,
    title: "天渊城的雪",
    text: "天渊城下雪了。雪里有细小的空间裂缝，像黑色的线。守城的人说，今年冬天会很长。",
    choices: [
      {
        label: "上城墙帮忙",
        risk: { p: 0.25, text: "你守住了这一段墙。", fail: { death: true, cause: "殁于天渊城头" } },
        effects: { karma: 6, mood: -4, insight: 2 },
        outcome: "雪停的时候，城墙下多了很多新坟。你记住了其中几个名字。",
      },
      {
        label: "闭关",
        effects: { cult: 4, mood: 2 },
        outcome: "你把洞府的门关上。外面的风雪声，像很远的地方有人在哭。",
      },
      {
        label: "去坊市买消息",
        effects: { stones: -80, insight: 4, luck: 2 },
        outcome: "你买到的消息只有一句：今年的裂缝，比往年多。",
      },
    ],
  });

  add({
    id: "i_time",
    when: (s) => s.world === "immortal" && s.age >= 5000,
    w: 9,
    title: "山中无历日",
    text: "你闭关醒来，山下已经换了三个朝代。仙宫的玉牌还在，只是上面的名字旧了。",
    choices: [
      {
        label: "继续闭关",
        effects: { cult: 5, mood: -2 },
        outcome: "你重新闭上眼。下一次醒来，也许山下已经没有朝代了。",
      },
      {
        label: "下山走走",
        effects: { mood: 5, insight: 3, luck: 2 },
        outcome: "你在人间走了很久。有人给你让路，有人向你磕头，没有人知道你是谁。",
      },
      {
        label: "收一个徒弟",
        effects: { karma: 4, mood: 4 },
        outcome: "你在山门口收了一个孩子。他问你，山上面有什么。你说，上去就知道了。",
      },
    ],
  });

  add({
    id: "i_peer",
    when: (s) => s.world === "immortal" && s.age >= 2000,
    w: 8,
    title: "断界海的老仙",
    text: "一位老仙翁在断界海边钓鱼。他问你，愿不愿意用一半修为，换一个答案。",
    choices: [
      {
        label: "换",
        effects: { cult: -15, insight: 12, mood: 4 },
        outcome: "老仙翁说了三个字。你听懂了，又好像什么都没听懂。",
      },
      {
        label: "不换",
        effects: { mood: 2, luck: 3 },
        outcome: "你摇了摇头。老仙翁笑了笑，继续钓鱼。",
      },
      {
        label: "问他叫什么",
        effects: { insight: 2, luck: 2 },
        outcome: "他说了一个很旧的名字。你后来在仙宫的旧档里，见过这个名字。",
      },
    ],
  });

  add({
    id: "i_void",
    when: (s) => s.world === "immortal" && s.age >= 10000,
    w: 8,
    title: "无名之路",
    text: "断界海的潮水退下去，露出一条没有名字的路。路边没有碑，也没有脚印。",
    choices: [
      {
        label: "走上去",
        risk: { p: 0.35, text: "你走到了路的尽头。", fail: { death: true, cause: "被界海吞没" } },
        effects: { insight: 10, mood: 6, luck: 4 },
        outcome: "路的尽头是一片没有光的海。你站了很久，然后转身走了回来。",
      },
      {
        label: "记下坐标",
        effects: { insight: 5, luck: 2 },
        outcome: "你把坐标刻在玉简上。也许以后会有人用得上。",
      },
      {
        label: "回头",
        effects: { mood: 3 },
        outcome: "你往回走。潮水重新漫上来，把那条路盖住了。",
      },
    ],
  });

  XD.EVENTS = E;
  XD.EVENT_BY_ID = E.reduce((m, e) => ((m[e.id] = e), m), {});
})();
