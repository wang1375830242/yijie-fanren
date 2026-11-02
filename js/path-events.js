/* ==========================================================================
   四道统中期事件 · 筑基到元婴
   每条道统八条，均为原创短文，不替代通用事件池。
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

  const pathWhen = (path) => (s) => s.world === "human" && s.tier >= 2 && s.tier <= 4 && s.sectPath === path;

  const events = {
    jian: [
      {
        id: "p_jian_1", title: "剑痕",
        text: "山门前那块旧石上，多了一道没有主人的剑痕。你伸手比了比，剑意竟和你昨夜梦里的一模一样。",
        choices: [
          { label: "顺着剑痕追出去", effects: { cult: 4, mood: 2, insight: 2 }, outcome: "你在溪边找到一截断剑。剑柄上刻着一个早已磨平的名字。" },
          { label: "把剑痕记在心里", effects: { insight: 5, mood: -1 }, outcome: "你没有追。那道剑痕在你识海里留了很久，像一根没有拔出的刺。" },
        ],
      },
      {
        id: "p_jian_2", title: "磨剑",
        text: "同门都在比谁的剑快。你的剑很钝，师父却说，钝剑才听得见风。",
        choices: [
          { label: "继续磨这把钝剑", effects: { cult: 3, insight: 3, mood: 1 }, outcome: "剑刃没有变亮，但每一次落剑都比昨天更稳。" },
          { label: "换一把快剑", effects: { cult: 5, mood: 2, karma: -1 }, outcome: "快剑赢了三场。第四场，你在对手眼里看见了自己的急躁。" },
        ],
      },
      {
        id: "p_jian_3", title: "剑冢",
        text: "后山有一片无名的剑冢。每一柄断剑都朝着同一个方向，像在等一个不会再回来的人。",
        choices: [
          { label: "替它们把剑立正", effects: { karma: 3, mood: 3, insight: 2 }, outcome: "你忙了三天。最后一柄剑立起来时，山风忽然停了。" },
          { label: "取走一截剑尖", effects: { cult: 4, insight: 2, karma: -1 }, outcome: "剑尖很轻。你离开时，身后的断剑轻轻响了一声。" },
        ],
      },
      {
        id: "p_jian_4", title: "雨夜问剑",
        text: "雨下了一夜。你在檐下练剑，剑气把雨切成两半，又很快合拢。",
        choices: [
          { label: "练到雨停", effects: { cult: 6, mood: -3, insight: 3 }, outcome: "天亮时你握不住剑，却第一次看清了自己的剑路。" },
          { label: "收剑，听雨", effects: { mood: 5, insight: 2 }, outcome: "你听见雨落在瓦上，也听见自己心里那点不肯认输的声音。" },
        ],
      },
      {
        id: "p_jian_5", title: "同门试剑",
        text: "一位师兄邀你试剑。他的剑比你快，但起手时总会先看一眼自己的影子。",
        choices: [
          { label: "攻他的影子", effects: { cult: 4, mood: 2, insight: 2 }, outcome: "你赢得很不漂亮。师兄收剑时笑了，说你看得比他还清楚。" },
          { label: "正面接他一剑", effects: { cult: 2, injury: 1, mood: -1 }, outcome: "虎口裂了。你却记住了那一剑真正落下的声音。" },
        ],
      },
      {
        id: "p_jian_6", title: "旧剑匣",
        text: "你在坊市买到一只旧剑匣，匣底刻着一行小字：剑在人在，剑亡人亡。",
        choices: [
          { label: "把剑匣修好", effects: { stones: -10, insight: 4, mood: 2 }, outcome: "修好后的剑匣合上时会发出一声很轻的叹息。" },
          { label: "把匣子转卖", effects: { stones: 20, karma: -2 }, outcome: "买主很高兴。你却总觉得那声叹息跟着你走了很远。" },
        ],
      },
      {
        id: "p_jian_7", title: "一剑破雾",
        text: "山下的雾困住了整座镇子。你拔剑时，剑身比平时轻了半分。",
        choices: [
          { label: "斩开雾", effects: { cult: 5, karma: 3, mood: 2 }, outcome: "雾散了一条街。镇上的人没有看见你，只看见天亮得比往常早。" },
          { label: "等雾自己散", effects: { mood: 3, insight: 3 }, outcome: "雾到午后散了。你在雾里坐了一整天，想明白了一件事。" },
        ],
      },
      {
        id: "p_jian_8", title: "剑心",
        text: "你第一次听见自己的剑心。它不说杀，也不说赢，只说：再往前一步。",
        choices: [
          { label: "再往前一步", effects: { cult: 7, mood: -2, insight: 4 }, outcome: "剑鸣了很久。你收剑时，掌心留下了一道细细的剑纹。" },
          { label: "停在这里", effects: { mood: 5, insight: 2 }, outcome: "你没有再走。剑心没有催你，像一个终于学会等待的人。" },
        ],
      },
    ],
    dan: [
      {
        id: "p_dan_1", title: "丹房夜火",
        text: "丹房的火一夜没灭。炉里那枚丹从下午开始就发出不合时宜的香味。",
        choices: [
          { label: "守到开炉", effects: { cult: 4, mood: -2, insight: 2 }, outcome: "丹成了，品相却只有中下。师父闻了闻，说火候比丹贵。" },
          { label: "提前开炉", effects: { stones: 18, mood: 1, karma: -1 }, outcome: "丹没有炸。你把它卖了，买主没有问你为什么少了一味药。" },
        ],
      },
      {
        id: "p_dan_2", title: "药园",
        text: "药园里有一株灵草，每月只在没有月亮的夜里长一寸。",
        choices: [
          { label: "守着它长", effects: { insight: 4, mood: 3 }, outcome: "你守了三个月。最后一夜，灵草开出一朵很小的白花。" },
          { label: "采下入药", effects: { cult: 3, stones: 12, karma: -1 }, outcome: "丹药很苦。你后来再经过药园，那块地一直空着。" },
        ],
      },
      {
        id: "p_dan_3", title: "药人",
        text: "坊市里有人卖“药人”——从小以药汤养大的凡人，血肉可以入丹。",
        choices: [
          { label: "买下并放走", effects: { stones: -30, karma: 8, mood: 4 }, outcome: "那人走时没有回头。你不知道他后来去了哪里，只记得他手腕很细。" },
          { label: "转身离开", effects: { mood: -4, insight: 3 }, outcome: "你走出三条街，才发觉自己一直攥着袖口。" },
        ],
      },
      {
        id: "p_dan_4", title: "丹劫",
        text: "一炉丹引来了雷。乌云压得很低，丹炉里却传来婴儿一样的哭声。",
        choices: [
          { label: "护住丹炉", effects: { cult: 6, injury: 1, mood: -3 }, outcome: "雷落了七道。丹炉裂了，丹却留了下来，表面有一道细纹。" },
          { label: "弃丹保人", effects: { karma: 5, mood: 3 }, outcome: "丹炸了。丹房里的人都活着，屋顶却没了。" },
        ],
      },
      {
        id: "p_dan_5", title: "旧方",
        text: "你在祖师遗物里翻到一张旧丹方，最后一味药写着“自愿”。",
        choices: [
          { label: "按方试炼", effects: { insight: 5, mood: -2, karma: -2 }, outcome: "丹成了。你盯着那枚丹看了很久，最终没有服下。" },
          { label: "把方子烧了", effects: { karma: 4, mood: 3 }, outcome: "纸灰落在丹炉里，像一场没有下完的雪。" },
        ],
      },
      {
        id: "p_dan_6", title: "药庐",
        text: "山下的药庐缺一个坐堂大夫。你只在小时候跟人认过几年草药。",
        choices: [
          { label: "去坐堂", effects: { karma: 6, stones: 20, mood: 2 }, outcome: "你治好了三个人，也送走了一个。药庐的灯火让你想起家。" },
          { label: "留在山上炼丹", effects: { cult: 4, stones: 8 }, outcome: "丹炉没有停。你偶尔会想起那三个人的脸。" },
        ],
      },
      {
        id: "p_dan_7", title: "丹成",
        text: "丹成那一刻，炉中有一道小小的虹。师父说，这是丹在看你。",
        choices: [
          { label: "服下", effects: { cult: 6, mood: 2, insight: 2 }, outcome: "丹药入腹，你看见自己身体里有一盏很小的灯。" },
          { label: "留给更需要的人", effects: { karma: 6, mood: 4 }, outcome: "你把丹送给了山下病重的孩子。他后来活了很久。" },
        ],
      },
      {
        id: "p_dan_8", title: "炉心",
        text: "你第一次听见丹炉的心跳。它和你的心跳不一样，却慢慢合上了拍子。",
        choices: [
          { label: "与炉同息", effects: { cult: 7, insight: 4, mood: -2 }, outcome: "丹炉温了整夜。你醒来时，掌心多了一层薄薄的药香。" },
          { label: "熄火", effects: { mood: 4, insight: 2 }, outcome: "炉火灭了。你听见自己的心跳，第一次觉得它也很响。" },
        ],
      },
    ],
    zhen: [
      {
        id: "p_zhen_1", title: "地脉",
        text: "你脚下的地脉在夜里翻了一次身。第二天，山门前的石阶裂开了一线。",
        choices: [
          { label: "顺着裂纹布阵", effects: { cult: 4, insight: 3, mood: -1 }, outcome: "阵纹顺着裂纹走了一圈。夜里，山门第一次没有被风吹响。" },
          { label: "把裂纹填平", effects: { stones: -12, karma: 3, mood: 2 }, outcome: "石阶恢复了原样。地脉却在你脚下轻轻叹了口气。" },
        ],
      },
      {
        id: "p_zhen_2", title: "旧阵盘",
        text: "一只旧阵盘在货栈角落放了三年，标价低得不像真的。",
        choices: [
          { label: "买下研究", effects: { stones: -20, insight: 4, cult: 2 }, outcome: "阵盘里藏着一座很小的困阵。阵心是一只早已死去的虫子。" },
          { label: "不碰来历不明的东西", effects: { mood: 2, insight: 1 }, outcome: "你走了。后来听说买走它的人失踪了三天。" },
        ],
      },
      {
        id: "p_zhen_3", title: "护山",
        text: "山门大阵年久失修。掌门问你，是补阵，还是把阵眼迁到后山。",
        choices: [
          { label: "补阵", effects: { cult: 3, sectContrib: 20, karma: 3 }, outcome: "你在阵眼里坐了七天。大阵重新亮起时，像一只慢慢睁开的眼。" },
          { label: "迁阵眼", effects: { cult: 5, insight: 3, mood: -2 }, outcome: "阵眼迁走了。旧阵眼留下一个空洞，夜里会有风从那里经过。" },
        ],
      },
      {
        id: "p_zhen_4", title: "困阵",
        text: "你在山谷里误入一座困阵。阵里没有敌人，只有一条永远走不到头的路。",
        choices: [
          { label: "拆阵", effects: { cult: 5, insight: 4, mood: -2 }, outcome: "你拆了三天。最后一枚阵钉拔出时，山谷里的风终于有了方向。" },
          { label: "在阵里打坐", effects: { mood: 5, insight: 3 }, outcome: "你不再找路。第三天，阵自己开了一扇门。" },
        ],
      },
      {
        id: "p_zhen_5", title: "阵眼",
        text: "宗门大阵的阵眼需要一个人守。守阵的人不能离开，也不能说话。",
        choices: [
          { label: "去守阵", effects: { sectContrib: 35, karma: 4, mood: -5 }, outcome: "你守了三年。出关时，山门里的人已经换了一茬。" },
          { label: "举荐别人", effects: { mood: 2, karma: -1 }, outcome: "你举荐了师兄。他守了三年，回来后再也没有和你说过话。" },
        ],
      },
      {
        id: "p_zhen_6", title: "阵图",
        text: "你在旧书里找到一张残缺阵图，缺的那一角恰好是阵心。",
        choices: [
          { label: "照图补全", effects: { cult: 4, insight: 4, mood: -2 }, outcome: "阵图成了。你发现它护住的不是山门，而是一间空屋。" },
          { label: "把图交给宗门", effects: { sectContrib: 25, karma: 4 }, outcome: "掌门收下阵图，给了你一块旧令牌。令牌背面刻着你的名字。" },
        ],
      },
      {
        id: "p_zhen_7", title: "山雨",
        text: "暴雨冲垮了半座护山阵。山下的人说，阵破的时候听见了一声钟。",
        choices: [
          { label: "冒雨补阵", effects: { cult: 5, injury: 1, sectContrib: 20 }, outcome: "你在雨里泡了一夜。阵补好了，第二天却病得说不出话。" },
          { label: "先救山下的人", effects: { karma: 7, mood: 3, sectContrib: 10 }, outcome: "人比阵重要。你背回了七个人，山门却塌了一角。" },
        ],
      },
      {
        id: "p_zhen_8", title: "阵心",
        text: "你第一次把自己的心跳放进阵里。整座山门跟着你一起呼吸。",
        choices: [
          { label: "与阵同息", effects: { cult: 7, insight: 4, mood: -2 }, outcome: "阵光在你脚下铺开。你听见山门里每一块石头都在回应。" },
          { label: "退出阵眼", effects: { mood: 4, insight: 2 }, outcome: "你退了出来。阵还在呼吸，只是不再和你同步。" },
        ],
      },
    ],
    you: [
      {
        id: "p_you_1", title: "无名路",
        text: "你在地图上找不到这条路。路牌写着两个字：远方。",
        choices: [
          { label: "走进去", effects: { cult: 3, luck: 3, mood: 2 }, outcome: "路的尽头是一座没有名字的渡口。船夫说，你来得正好。" },
          { label: "原路返回", effects: { mood: 2, insight: 2 }, outcome: "你回去了。那两个字在原地站了很久。" },
        ],
      },
      {
        id: "p_you_2", title: "旧友",
        text: "你在异乡的酒馆里听见一个熟悉的名字。回头时，那人已经走出了门。",
        choices: [
          { label: "追出去", effects: { mood: 5, karma: 2, stones: -8 }, outcome: "你追了两条街，只捡到一枚旧铜钱。铜钱上刻着你幼时的乳名。" },
          { label: "坐下喝完这杯", effects: { mood: -2, insight: 3 }, outcome: "酒很烈。你喝完时，窗外已经下起了雨。" },
        ],
      },
      {
        id: "p_you_3", title: "渡口",
        text: "渡口只剩一条船。船夫说，船可以去任何地方，但只能载一个人。",
        choices: [
          { label: "上船", effects: { cult: 4, luck: 4, mood: 1 }, outcome: "船开了。你回头时，岸上的人已经变成了很小的黑点。" },
          { label: "把船让给老人", effects: { karma: 7, mood: 3 }, outcome: "老人上船前看了你一眼，说你会有自己的路。" },
        ],
      },
      {
        id: "p_you_4", title: "雨夜客栈",
        text: "客栈只剩一间房，隔壁住着一个不肯露脸的剑客。",
        choices: [
          { label: "请他喝一杯", effects: { stones: -10, mood: 4, insight: 2 }, outcome: "他喝了酒，留下一句：你的路，不在别人的剑上。" },
          { label: "关好门窗", effects: { mood: 1, insight: 2 }, outcome: "你一夜没睡。天亮时，隔壁已经空了。" },
        ],
      },
      {
        id: "p_you_5", title: "旧债",
        text: "一个陌生人拦住你，说你欠他一笔债。你从未见过他。",
        choices: [
          { label: "替前世的自己还", effects: { stones: -25, karma: 6, mood: 1 }, outcome: "他收了钱，转身走进人群。你忽然觉得轻松了一点。" },
          { label: "不认", effects: { mood: -3, karma: -2, luck: 1 }, outcome: "他没有纠缠。只是你后来每次走夜路，都觉得有人在后面。" },
        ],
      },
      {
        id: "p_you_6", title: "山外山",
        text: "你翻过一座山，看见山外还有一座更高的山。山上有人在向你招手。",
        choices: [
          { label: "继续走", effects: { cult: 5, mood: -2, insight: 3 }, outcome: "你走了七天。招手的人始终没有近，也没有远。" },
          { label: "在这里歇脚", effects: { mood: 5, stones: 10 }, outcome: "你在山脚开了一间小茶棚。来往的人都说，这里的茶很暖。" },
        ],
      },
      {
        id: "p_you_7", title: "无名碑",
        text: "路边有一块无字碑。碑前放着半壶酒，酒还是温的。",
        choices: [
          { label: "添一壶酒", effects: { stones: -6, karma: 4, mood: 3 }, outcome: "你把酒放下。风把酒香吹得很远，像有人替你说了句什么。" },
          { label: "把碑上的灰擦掉", effects: { insight: 4, mood: 2 }, outcome: "碑上什么也没有。你却看见自己的影子在石面上停了一瞬。" },
        ],
      },
      {
        id: "p_you_8", title: "归途",
        text: "你走了很远，忽然想起自己已经很久没有回头看。",
        choices: [
          { label: "回头", effects: { mood: 5, insight: 3, karma: 2 }, outcome: "来路很长。你看见那些走过的地方，一盏一盏亮着。" },
          { label: "继续向前", effects: { cult: 6, mood: -1, luck: 3 }, outcome: "你没有回头。前方的雾里，隐约有一条新的路。" },
        ],
      },
    ],
  };

  Object.keys(events).forEach((path) => {
    events[path].forEach((ev, index) => {
      add({
        id: ev.id,
        when: pathWhen(path),
        title: ev.title,
        text: ev.text,
        choices: ev.choices,
        w: 3,
        sceneKey: `path:${path}:${index + 1}`,
      });
    });
  });
})();
