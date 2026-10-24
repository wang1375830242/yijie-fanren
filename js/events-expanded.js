/* ==========================================================================
   一介凡人 · 事件扩展（程序化补编）
   目标：把事件池从 63 条扩到约 3000 条（约 48 倍量级），前期事件扩到 400 条，并让道侣在后续
   人生里持续出现。所有条目仍是本地原创文案，不复制原著正文。
   ========================================================================== */
(function () {
  "use strict";
  const XD = window.XD;
  if (!XD || !Array.isArray(XD.EVENTS)) return;

  const E = XD.EVENTS;
  const D = XD.DATA;
  const N = 104;

  function fill(text, s) {
    const name = s.partner ? s.partner.name : "那个人";
    const title = s.partner ? s.partner.title : "故人";
    let out = String(text)
      .replace(/\{p\}/g, name)
      .replace(/\{t\}/g, title)
      .replace(/\{family\}/g, (s.origin && s.origin.family) || "家里")
      .replace(/\{place\}/g, (s.origin && s.origin.place) || "村子")
      .replace(/\{root\}/g, (s.root && s.root.name) || "灵根")
      .replace(
        /\{familyWord\}/g,
        (s.origin && CHILD_IDENTITY_WORDS[s.origin.family]) || "家里"
      )
      .replace(/\{world\}/g, (D.WORLD_META[s.world] && D.WORLD_META[s.world].name) || "此界");
    if (
      s.flags && s.flags.no_parents ||
      /孤儿|父母.*(死|亡)|散修之后/.test(
        `${s.origin && s.origin.family || ""}${s.origin && s.origin.text || ""}`
      )
    ) {
      out = out
        .replace(/父母|爹娘|双亲/g, "收养你的老人")
        .replace(/母亲|娘/g, "收养你的老人")
        .replace(/父亲|爹/g, "抚养你的人");
    }
    return out;
  }

  function partnerLine(s) {
    const p = s.partner;
    if (!p) return "";
    const realm = D.REALMS[p.tier || 0];
    const world = D.WORLD_META[p.world || s.world];
    const where =
      p.status === "apart"
        ? `如今在${world ? world.name : "另一界"}`
        : "如今还在你身边";
    return `${p.name}${where}，修为是${realm ? realm.name : "凡人"}。`;
  }

  const POOLS = {
    child: {
      scenes: [
        "村口的老槐树下，几个孩子围着一只受伤的鸟。",
        "你在河边捡到一枚生锈的铜钱，正面磨得看不清了。",
        "夜里下大雨，屋顶漏了一角，母亲用盆接水。",
        "镇上的私塾先生病倒了，学堂空了半个月。",
        "你在山坡上放牛，看见远处有车队经过。",
        "邻家女孩送你一颗糖，纸已经化了。",
        "父亲从集市回来，带了一小包盐和一段红绳。",
        "冬天来得早，井面结了一层薄冰。",
        "你蹲在田埂上看蚂蚁搬家，一看就是一下午。",
        "村里的老井枯了，大人们围着井口商量。",
        "你捡到一只断线的风筝，纸面上画着一只鹤。",
        "秋收后，村里搭了戏台，唱到半夜。",
        "母亲病了几天，你学着煮粥，煮糊了。",
        "你在山神庙里躲雨，看见供桌上放着半块饼。",
        "邻村的孩子来走亲戚，你们在晒谷场上打了一架。",
        "父亲用木头给你削了一把小剑。",
        "村口的老井边，两个大人压低声音说话。",
        "春天开河，冰排撞在桥墩上，发出闷响。",
        "你跟着母亲去邻村探亲，走了很久的夜路。",
        "你在打谷场上睡了一觉，醒来时天已经黑了。",
        "晒谷场上摊着一层金黄的谷子，风一吹，谷壳飞得到处都是。",
        "井台边结了一层薄冰，你蹲下去看自己的影子。",
        "村里死了人，唢呐从早吹到晚。",
        "父亲从镇上回来，带了一小块麦芽糖。",
        "你在屋檐下数雨滴，数到一百就忘了。",
        "灶膛里的火忽明忽暗，母亲让你添一把柴。",
        "你偷偷穿上大人的鞋，走了两步就摔了。",
        "村后的竹林里，笋尖顶开了一块石头。",
        "货郎摇着拨浪鼓进村，孩子们跟了半条路。",
        "你把一只萤火虫扣在掌心，又放它走了。",
        "秋后的田里只剩秸秆，你在里面搭了一个窝。",
        "祖母坐在门槛上择菜，讲了一个很长的故事。",
        "你第一次看见雪，伸手去接，雪在掌心化了。",
        "河面结冰，大人不许你上去，你还是伸了一只脚。",
        "你在灶台边偷吃刚出锅的饼，烫了舌头。",
        "一只黄狗跟着你回家，赶了几次都没有走。",
        "村里来了个卖艺的，胸口碎大石，你信了很久。",
        "母亲把旧衣改小，针脚从这一头走到那一头。",
        "你和小伙伴约好去山那边，走到一半就天黑了。",
        "庙会上的糖人捏成一条龙，你舍不得吃。",
        "父亲修屋顶，你在下面递瓦片，递错了好几块。",
        "你在溪边放纸船，船走了几步就沉了。",
        "有人家娶亲，你挤在人群里捡了几颗喜糖。",
        "冬天的被窝很冷，母亲先把你的被角掖好。",
        "你在树下埋了一颗桃核，说好第二年来看。",
        "村口来了个游方道士，看了你一眼就走了。",
        "你把捡来的石头排成一排，说那是你的兵。",
        "麦收时你跟在牛车后面，捡掉下来的麦穗。",
        "祖母病了，屋里第一次这么安静。",
        "你爬上树掏鸟窝，最后只看见空空的树枝。",
        "雨后的路上有蜗牛，你蹲下来看了很久。",
        "家里添了一盏新灯，夜里比从前亮一些。",
        "你把自己的名字写在泥地上，写完就下雨了。",
        "邻家办丧事，你第一次听见大人哭出声。",
        "你在山坡上追一只蝴蝶，追到太阳落山。",
        "父亲说今年收成好，晚饭多了一碗白米饭。",
        "你把一枚铜钱藏在墙缝里，后来忘了是哪一个缝。",
        "你第一次跟着大人去赶集，回来时在牛车上睡着了。",
        "屋后的枣树熟了，你爬上去摇了一地。",
        "村外的官道上走过一队骑马的人，扬起很多灰。",
      ],
      details: [
        "那时候你还不知道山外有修仙者。",
        "你把这件小事记了很久。",
        "母亲说，日子就是这样一天一天过的。",
        "你第一次觉得，世界比村子大。",
        "后来你才知道，那天是个转折。",
        "没有人注意到你。",
        "你把它藏进了枕头底下。",
        "那一年，收成不好。",
        "你不知道这些事后来有什么用。",
        "你只记得那天的光。",
        "大人们说，小孩子不要问。",
        "你把它忘了很多年，后来又想起来。",
        "那是你第一次觉得，日子会变。",
        "你没有告诉别人。",
        "后来你走过很多地方，再没见过那样的院子。",
        "你当时觉得很平常。",
        "你后来才明白，他们在说一件大事。",
        "那声音你记了很久。",
        "你第一次觉得，路可以走到很远。",
        "你当时只想再睡一会儿。",
      ],
      outcomes: [
        "你后来常常想起这一天。",
        "事情不大，但你记得很清楚。",
        "那一年过得很快。",
        "你学会了一点点大人的沉默。",
        "你没有告诉任何人。",
        "这件事像一颗小石子，沉进了水里。",
        "你做了一个很小的决定。",
        "很久以后，它还会回来。",
      ],
      choices: [
        [
          { label: "搭把手", effects: { karma: 3, mood: 3 }, outcome: "你伸了手。对方看了你一眼，没有说话。" },
          { label: "装作没看见", effects: { karma: -2, mood: -1 }, outcome: "你走开了。身后的声音很快听不见了。" },
        ],
        [
          { label: "收好它", effects: { luck: 2, mood: 2 }, outcome: "你把它放进怀里，像藏起一个秘密。" },
          { label: "交给大人", effects: { karma: 2, mood: 1 }, outcome: "大人看了一眼，说这东西不值钱。" },
        ],
        [
          { label: "去问问", effects: { insight: 3, mood: 1 }, outcome: "你问了很多问题。有的有答案，有的没有。" },
          { label: "留在家里", effects: { mood: 2 }, outcome: "你留在屋里，听外面的雨下了一夜。" },
        ],
        [
          { label: "跟着去看", effects: { luck: 3, insight: 2 }, outcome: "你走了很远，最后在路口停下。" },
          { label: "回去", effects: { mood: 1 }, outcome: "你转身回家。晚饭的香味从门缝里飘出来。" },
        ],
        [
          { label: "先看看再说", effects: { insight: 2, mood: 1 }, outcome: "你蹲下来看了很久，直到大人们把话说完。" },
          { label: "叫上大人", effects: { karma: 2, mood: 1 }, outcome: "大人来了，事情很快就被处理掉了。" },
        ],
        [
          { label: "记在心里", effects: { insight: 2, mood: 1 }, outcome: "你没有说出口，但一直没有忘。" },
          { label: "找人问问", effects: { luck: 2, insight: 2 }, outcome: "你问了一圈，得到的答案互相矛盾。" },
        ],
        [
          { label: "照着做", effects: { mood: 1, karma: 1 }, outcome: "你照着大人的样子做了一遍，居然像模像样。" },
          { label: "偏要试一次", effects: { luck: 3, mood: -1 }, outcome: "你试了。结果和你想的不太一样。" },
        ],
        [
          { label: "分给别人", effects: { karma: 3, mood: 2 }, outcome: "你把东西分了出去，自己只剩一点点。" },
          { label: "自己留着", effects: { luck: 2, mood: 1 }, outcome: "你把它留在自己身边，谁也没告诉。" },
        ],
        [
          { label: "跟着走", effects: { luck: 3, insight: 1 }, outcome: "你跟着走了很远，直到看不见来时的路。" },
          { label: "留在原地", effects: { mood: 2, insight: 1 }, outcome: "你留在原地，听见风从屋檐下穿过去。" },
        ],
        [
          { label: "放回原处", effects: { karma: 2, mood: 1 }, outcome: "你把它放回原处，像什么都没有发生过。" },
          { label: "带回家", effects: { luck: 2, insight: 1 }, outcome: "你把它带回家，藏在一个只有你知道的角落。" },
        ],
        [
          { label: "学大人的样子", effects: { insight: 2, mood: 1 }, outcome: "你学着大人的样子说话，逗得他们笑了起来。" },
          { label: "按自己的想法", effects: { luck: 3, mood: -1 }, outcome: "你按自己的想法做了，没有人拦你，也没有人夸你。" },
        ],
        [
          { label: "跑回家", effects: { mood: 3 }, outcome: "你一路跑回家，推开门时还在喘气。" },
          { label: "再多待一会儿", effects: { insight: 2, luck: 1 }, outcome: "你又待了一会儿，直到天色彻底暗下来。" },
        ],
        [
          { label: "先听他说完", effects: { insight: 2, mood: 1 }, outcome: "你听他把话说完，才发现重点在最后一句。" },
          { label: "转身走开", effects: { mood: 2, luck: -1 }, outcome: "你转身走开，身后的声音越来越远。" },
        ],
        [
          { label: "把手伸过去", effects: { luck: 2, mood: 1 }, outcome: "你伸出手，碰到了那件东西。凉的。" },
          { label: "缩回来", effects: { insight: 1, mood: 1 }, outcome: "你把手缩回来，决定再等一等。" },
        ],
        [
          { label: "记住这个地方", effects: { insight: 2, luck: 1 }, outcome: "你记住了路怎么走，也记住了那天的风。" },
          { label: "不再回头", effects: { mood: 2 }, outcome: "你没有回头。后来也没有再回去过。" },
        ],
        [
          { label: "跟着笑", effects: { mood: 2, karma: 1 }, outcome: "你跟着笑了。其实你没太听懂他们在笑什么。" },
          { label: "没有笑", effects: { insight: 2, mood: -1 }, outcome: "你没有笑。大人们很快就不说了。" },
        ],
      ],
    },

    home: {
      scenes: [
        "院子里的灯亮着，屋里有人在等你。",
        "桌上放着一封没有署名的信。",
        "家里的旧物被翻了出来，落了一地灰。",
        "门外有人敲门，说是来讨一笔旧账。",
        "你在灶台边站了很久，锅里的水已经开了。",
        "院子里那棵树今年没有开花。",
        "亲人从远处回来，带了一身风尘。",
        "你收拾出一间空屋，想留给谁住。",
        "雨打在瓦上，屋里的人都没有睡。",
        "旧箱子底下压着一张发黄的纸。",
        "有人在你门前放了一篮新摘的菜。",
        "晚饭多摆了一双筷子，谁也没有动。",
        "你把墙上的旧画取下来，后面有一道裂缝。",
        "亲人在灯下算账，算盘珠子响到很晚。",
        "院子里晒着被褥，风把它们吹得鼓起来。",
        "你听见隔壁传来婴儿的哭声。",
        "桌上那碗汤热了三次，还是没人喝。",
        "你出门时，家里人在门口站了很久。",
        "屋檐下挂着一串干辣椒，红得有些旧了。",
        "你听见有人在院子里磨刀，声音一直没停。",
      ],
      details: [
        "你忽然发现自己已经很久没有回来过。",
        "屋里的摆设和你离开时一样。",
        "没有人先开口，只有灯芯在响。",
        "你想起很多年前的一个下午。",
        "这件事说大不大，说小也不小。",
        "你把话咽了回去。",
        "外面的风停了。",
        "你坐了很久，直到茶凉。",
      ],
      outcomes: [
        "你后来常想起这顿饭。",
        "那封信你一直没拆。",
        "旧物最后还是留下了。",
        "你把门关上了。",
        "那一夜你睡得很浅。",
        "树没有再开花。",
        "亲人走的时候，你没有送到门口。",
        "空屋后来住进了别人。",
      ],
      choices: [
        [
          { label: "留下吃顿饭", effects: { mood: 5, karma: 2 }, outcome: "你坐下来，吃了很久。" },
          { label: "说还有事", effects: { mood: -2, insight: 1 }, outcome: "你站起来，走到门口又停了一下。" },
        ],
        [
          { label: "拆开信", effects: { insight: 3, mood: -1 }, outcome: "信很短，你看完又看了一遍。" },
          { label: "先放着", effects: { mood: 2, luck: 1 }, outcome: "你把信压在灯下，后来忘了。" },
        ],
        [
          { label: "把旧物收好", effects: { mood: 3, karma: 1 }, outcome: "你一件一件擦干净，放回原处。" },
          { label: "扔掉", effects: { mood: 1, insight: 2 }, outcome: "你把它们丢进灶膛，火很快旺了起来。" },
        ],
        [
          { label: "开门", effects: { karma: 2, mood: -1 }, outcome: "门外的人比你想象的更老。" },
          { label: "装作没听见", effects: { mood: 2, luck: -1 }, outcome: "敲门声响了很久，最后停了。" },
        ],
        [
          { label: "添一把柴", effects: { mood: 3 }, outcome: "火重新烧起来，屋里暖了一点。" },
          { label: "熄了火", effects: { insight: 2, mood: 1 }, outcome: "你看着最后一点火星灭掉。" },
        ],
        [
          { label: "浇水", effects: { karma: 2, mood: 2 }, outcome: "你给树浇了水，虽然不知道还有没有用。" },
          { label: "砍掉", effects: { mood: -1, insight: 2 }, outcome: "斧头落下去时，你听见一声很轻的响。" },
        ],
        [
          { label: "迎进去", effects: { karma: 3, mood: 3 }, outcome: "你接过他手里的包袱，发现比想象中轻。" },
          { label: "问清楚", effects: { insight: 2, mood: -1 }, outcome: "你问了很多，最后只记住一句。" },
        ],
        [
          { label: "铺好床", effects: { karma: 2, mood: 3 }, outcome: "你把床铺得很平整，像在等一个不会来的人。" },
          { label: "关上门", effects: { mood: 1, insight: 2 }, outcome: "门关上后，屋里安静得能听见灰落下来。" },
        ],
      ],
    },

    sect: {
      scenes: [
        "山门的钟响了三声，师兄们从各自洞府里出来。",
        "执事把一叠任务牌放在桌上，最上面那块沾着泥。",
        "丹房的火慢了，你守了一夜，眼皮发沉。",
        "山门前有人在等你，说是来讨一个说法。",
        "后山的灵田被野兽拱了，脚印一路进了云雾里。",
        "传功长老讲到一半停了，点名叫你复述。",
        "同门在比试台上赢了你一招，收手时笑了一下。",
        "你被罚在祖师堂前跪三天，理由是“心不诚”。",
        "外门弟子在院子里排队领丹药，队伍拐了两道弯。",
        "山门的石阶上落着一层松针，没人扫。",
        "藏经阁的灯还亮着，守阁老人靠在门边打盹。",
        "演武场上有人练剑，剑风把落叶卷成一圈。",
        "执事说今年外门只留三个人，堂下没有人说话。",
        "你在灵兽园里喂了一只不肯进食的鹤。",
        "师兄把一枚旧玉简塞给你，说看完就还。",
        "山雨封了路，宗门里的人都被困在各自院里。",
        "祖师堂的香灭了，你重新点了一炷。",
        "有人在你的洞府门口留下一道剑痕。",
        "执事房外的石阶被雨冲出一道浅沟。",
        "你在后山看见一只受伤的灵鹿，腿上夹着捕兽夹。",
      ],
      details: [
        "山门里的规矩比山下的路还多。",
        "没有人告诉你，修行先要学会低头。",
        "你开始明白，资源不会自己走过来。",
        "这件事在宗门里传了很久。",
        "你第一次觉得，师兄也不全是师兄。",
        "长老看了你很久，没有说破。",
        "你把委屈咽了下去。",
        "那晚山风很大。",
      ],
      outcomes: [
        "你回到洞府，把门关上。",
        "这件事让你在宗门里多了一点位置。",
        "你记住了那个人的脸。",
        "你开始学着不把心思写在脸上。",
        "你失去了一次机会，也看清了一个人。",
        "长老后来再没提过。",
        "你在心里记了一笔。",
        "第二天，一切照旧。",
      ],
      choices: [
        [
          { label: "接下任务", effects: { stones: 35, mood: -2, insight: 2 }, outcome: "你接过任务牌。山路很长，天黑前未必回得来。" },
          { label: "让给别人", effects: { karma: 2, mood: 2 }, outcome: "你把任务让了出去。对方愣了一下，说了声谢。" },
        ],
        [
          { label: "替同门说话", effects: { karma: 4, mood: -2 }, outcome: "你站出来说了几句。有人记你的好，也有人记你的名字。" },
          { label: "沉默", effects: { insight: 3, mood: -1 }, outcome: "你没有开口。堂上的声音继续往下走。" },
        ],
        [
          { label: "争一口气", effects: { cult: 3, mood: -3 }, outcome: "你把那口气压进了丹田。修炼快了一点，心却更硬了。" },
          { label: "退一步", effects: { mood: 3, karma: 1 }, outcome: "你退了一步。山没有变矮，路也没有变短。" },
        ],
        [
          { label: "收下好处", effects: { stones: 50, karma: -3 }, outcome: "你收下了。对方笑得很客气，你也笑得很客气。" },
          { label: "拒绝", effects: { karma: 3, mood: 1 }, outcome: "你摇了摇头。对方收起笑容，转身走了。" },
        ],
      ],
    },

    wild: {
      scenes: [
        "荒原上起了雾，远处的山影像一排牙齿。",
        "你在古洞里看见一具坐化的遗蜕，膝上放着一只旧储物袋。",
        "秘境的门每百年开一次，今年门口多了很多陌生人。",
        "雨下了七天，山路塌了，你被困在一座破庙里。",
        "一只受伤的妖兽跟着你走了很远，没有攻击。",
        "你在一处废弃药园里闻到很淡的丹香。",
        "同行的人半夜不见了，只留下半截烧过的符。",
        "天边出现一道白光，落点就在你脚下百里。",
        "沼泽里浮着一层绿色的雾，鸟从上面飞过就掉了下去。",
        "你在崖壁上发现一条被藤蔓遮住的栈道。",
        "夜里有人在你帐篷外绕了三圈，没有进来。",
        "溪水突然倒流，你顺着源头走了半天。",
        "一只白鹿站在林间，看了你一会儿，转身没入雾里。",
        "你捡到一枚带血的令牌，背面刻着不认识的姓。",
        "山洞深处传来敲击声，像是有人在凿石。",
        "暴雪封山，你在一棵空心树里躲了两天。",
        "前方的路被新塌的山石堵死，石缝里露出一角衣料。",
        "你在一座无名坟前看见刚烧过的纸钱。",
        "溪边的石头上晒着一张旧渔网，主人不见踪影。",
        "林子里突然安静下来，连虫声都停了。",
      ],
      details: [
        "野外的规矩很简单：先活下来。",
        "你没有再往前走。",
        "有些机缘看起来像陷阱，陷阱看起来也像机缘。",
        "你开始习惯一个人做决定。",
        "那晚你没有睡。",
        "你听见远处有东西在叫。",
        "你摸不清对方的修为。",
        "天亮之后，雾散了一半。",
      ],
      outcomes: [
        "你带着一身泥回到了洞府。",
        "你后来再没去过那个地方。",
        "你把这件事写进了自己的札记。",
        "你得了一点东西，也丢了一点。",
        "你活着回来了。",
        "没有人知道你去过那里。",
        "你在心里给这条路画了一个叉。",
        "很久以后，你还会梦见那片雾。",
      ],
      choices: [
        [
          { label: "进去看看", risk: { p: 0.35, text: "你摸到了洞底。", fail: { death: true, cause: "殁于古洞" } }, effects: { insight: 5, luck: 4 }, outcome: "洞底有一面石壁，上面刻着半个字。" },
          { label: "绕开", effects: { mood: 2, luck: 1 }, outcome: "你绕了很远。回头时，洞口已经被雾盖住了。" },
        ],
        [
          { label: "追上去", risk: { p: 0.3, text: "你追上了那道光。", fail: { death: true, cause: "殁于天外坠落" } }, effects: { luck: 5, insight: 3 }, outcome: "落点只有一块温热的石头。" },
          { label: "退回洞府", effects: { cult: 3, mood: 1 }, outcome: "你关上门。外面的光很快暗了。" },
        ],
        [
          { label: "救那只妖兽", effects: { karma: 4, mood: 3 }, outcome: "你给它包扎了伤口。它走的时候，回头看了你三次。" },
          { label: "不管", effects: { mood: -1 }, outcome: "你从它身边走过。它没有跟上来。" },
        ],
        [
          { label: "继续赶路", effects: { stones: 20, mood: -2 }, outcome: "你在天黑前赶到了下一座城。" },
          { label: "留下过夜", effects: { mood: 3, insight: 2 }, outcome: "你在破庙里睡了一夜。梦里有人叫你的名字。" },
        ],
      ],
    },

    market: {
      scenes: [
        "坊市的摊主把一块黑布掀开，下面是一枚看不出品阶的玉简。",
        "拍卖行里有人在争一株灵草，价格已经翻了四倍。",
        "一个散修拉住你，说他有门路弄到筑基丹。",
        "旧书铺的角落里堆着一摞发霉的札记。",
        "有人在卖“从秘境里带出来的”地图，每张都不一样。",
        "丹药铺的掌柜看了你一眼，报了一个明显偏高的价。",
        "你在摊子前停下，摊主立刻开始讲一个很长的故事。",
        "坊市尽头有人在收灵石，利息低得不像真的。",
        "雨棚下有人卖旧法器，摊主说每一件都死过人。",
        "一个孩子举着糖葫芦从人群里挤过去。",
        "茶棚里有人压低声音，说城外新开了一座秘境。",
        "你在一个只收灵石的摊前看见半张残图。",
        "拍卖行的二楼帘子动了一下，有人一直没露面。",
        "一个老妇卖着看不出用途的种子，说种下去才知道。",
        "赌坊门口围了很多人，里面传来一阵哄笑。",
        "你被人撞了一下，回头只看见一片衣角。",
        "药铺后门停着一辆盖着黑布的车。",
        "有人在墙上贴了一张寻人启事，画像已经淋花了。",
        "巷子里有人摆了一盘残棋，等一个愿意坐下的人。",
        "一个货郎挑着担子从人群里穿过，铃铛响得很轻。",
      ],
      details: [
        "坊市里最贵的东西，往往不是摆在台面上的。",
        "你没有立刻开口。",
        "灵石在袖子里，沉得像一块石头。",
        "你想起有人说过，贪便宜的人走不远。",
        "摊主的眼睛一直看着你的手。",
        "这里每天都有新的故事。",
        "你闻到了假丹的味道。",
        "人群把你往前推。",
      ],
      outcomes: [
        "你离开坊市时，天已经黑了。",
        "你把买来的东西收进储物袋。",
        "你后来觉得自己可能买亏了。",
        "这件事没有留下证据。",
        "你记住了摊主的脸。",
        "你决定下次不再来这家。",
        "灵石花了，心安了一点。",
        "你什么也没买。",
      ],
      choices: [
        [
          { label: "买下", effects: { stones: -80, luck: 3, insight: 2 }, outcome: "你付了灵石。摊主笑得很快，像怕你反悔。" },
          { label: "先鉴定", effects: { stones: -15, insight: 3 }, outcome: "鉴定师说了一半，忽然不说了。" },
          { label: "走开", effects: { mood: 1 }, outcome: "你走出几步，摊主又在后面叫别的客人。" },
        ],
        [
          { label: "竞价", effects: { stones: -120, mood: 3 }, outcome: "你举了牌。全场安静了一瞬。" },
          { label: "看着", effects: { insight: 3, mood: 1 }, outcome: "你看着价格一路往上，最后没有开口。" },
        ],
        [
          { label: "借他灵石", effects: { stones: -50, karma: 4 }, outcome: "他千恩万谢。你不知道他会不会还。" },
          { label: "不借", effects: { mood: -1, insight: 1 }, outcome: "你摇了摇头。他转身去找下一个人。" },
        ],
        [
          { label: "买一份消息", effects: { stones: -30, insight: 4 }, outcome: "消息很短：最近别去北边。" },
          { label: "不听", effects: { luck: 2, mood: 1 }, outcome: "你没有买。后来听说北边确实出了事。" },
        ],
      ],
    },

    war: {
      scenes: [
        "城墙上的号角响了一夜，天亮时还没有停。",
        "军帐里有人在争论要不要放弃西线，桌上摊着一张血渍的地图。",
        "你被编进一支十人的小队，队里最小的才十七岁。",
        "伤兵营里没有空床，走廊上躺满了人。",
        "异族的使者来了，说要谈和，条件是割让三座城。",
        "城外的尸体堆了三天，没有人敢出去收。",
        "你的队长战死了，副队长看着你，等你说话。",
        "后方送来的粮草少了一半，押粮官说不清去了哪里。",
        "城里的井开始发苦，军医说是水脉被动了手脚。",
        "夜里有人试图开城门，被巡夜的人按在门洞里。",
        "你收到一封家书，封口已经被人拆过。",
        "敌军退了三里，营地却安静得不像真的。",
        "一个少年兵把护身符塞给你，说他用不上。",
        "城墙缺口处堆着沙袋，血把沙染成了黑色。",
        "军令让你带十个人去引开敌军，没有说回来几个。",
        "战后的田野里，乌鸦落满了没有收的庄稼。",
        "庆功宴上没有人说话，酒一碗一碗地喝。",
        "你在一面残旗上看见自己熟悉的名字。",
        "城墙下有人在埋一匹死马，动作很快。",
        "军中的祭司在火堆前念了一夜的名字。",
      ],
      details: [
        "战争不是一场架，是一年一年地耗。",
        "你开始习惯在夜里睁着眼。",
        "没有人知道自己能不能活到明天。",
        "你记住了几个名字，又很快忘了。",
        "城墙上风很大。",
        "你没有退。",
        "有人在你身后哭。",
        "天亮之前，声音停了。",
      ],
      outcomes: [
        "你活了下来。",
        "你受了伤，但没有死。",
        "你被记了一功。",
        "你把这件事压在了心底。",
        "城里的人为你让开了一条路。",
        "你后来再没上过城墙。",
        "你梦见那些脸。",
        "战争还在继续。",
      ],
      choices: [
        [
          { label: "上城墙", risk: { p: 0.32, text: "你守住了这一段墙。", fail: { death: true, cause: "殁于城头" } }, effects: { karma: 7, mood: -5, stones: 80 }, outcome: "你在城墙上站了三天。下来时，腿已经不听使唤。" },
          { label: "守粮道", risk: { p: 0.18, text: "粮道没有断。", fail: { death: true, cause: "殁于粮道" } }, effects: { karma: 4, stones: 50 }, outcome: "粮车一辆一辆进了城。你靠在车边睡着了。" },
          { label: "闭门", effects: { karma: -5, mood: -4 }, outcome: "你把门关紧。外面的声音像潮水。" },
        ],
        [
          { label: "救伤员", effects: { karma: 5, mood: -2, insight: 2 }, outcome: "你背了七个人回来。第八个没来得及。" },
          { label: "追敌", risk: { p: 0.35, text: "你追上了。", fail: { death: true, cause: "殁于追击" } }, effects: { stones: 100, mood: -3 }, outcome: "你带回了敌人的旗。" },
        ],
        [
          {
            label: "捐出灵石",
            donate: { min: 10, max: 1000, step: 10, unit: 10, karmaPer: 1 },
            effects: { karma: 0 },
            outcome: (s, amount) => `你把 ${amount} 块灵石交到军需官手里。他看了你一眼，把名字记下了。`,
          },
          { label: "留下", effects: { stones: 30, karma: -3 }, outcome: "你把灵石收好。没人知道。" },
        ],
        [
          { label: "夜袭", risk: { p: 0.38, text: "你摸进了敌营。", fail: { death: true, cause: "殁于夜袭" } }, effects: { stones: 120, karma: 4, mood: -4 }, outcome: "你烧了对方的粮车，回来时天刚亮。" },
          { label: "守营", effects: { mood: 1, karma: 1 }, outcome: "你守了一夜。什么都没有发生。" },
        ],
      ],
    },

    spirit: {
      scenes: [
        "天渊城的钟声穿过云层，异族又在城下集结。",
        "风元大陆的荒原上，你走了三个月，没有遇见一个活人。",
        "空间裂缝在远处张开又合拢，像一只眨动的眼。",
        "雷鸣大陆的雷声从不停，整片天都在发白。",
        "血天大陆的赤色尘土落在肩上，像一层干了的锈。",
        "天渊城的旧书铺里，有人卖一页从下界带上来的残卷。",
        "一个异族商队在城外停下，用生硬的官话问你要不要买会唱歌的石头。",
        "你忽然想起人界的雨。灵界的雨，落在身上没有声音。",
        "天渊城西坊的灯一盏一盏亮起来，照不到城墙外的黑。",
        "风元大陆的商队带来一车矿石，车夫不肯说从哪里来。",
        "雷鸣大陆的天空裂开一道细缝，雷声却迟迟没有落下。",
        "血天大陆的夜里，远处有兽潮经过，地面像在呼吸。",
        "一座废弃的传送阵前，有人用灵界文字刻了三个字。",
        "异族城池的钟声和人界不一样，听着像有人在哭。",
        "你在天渊城的城墙上看见下界的云海，隔着很远的距离。",
        "灵界坊市里，一个摊主只收一种你从未见过的灵石。",
        "荒野中的石碑上刻着上古文字，已经被风磨平了一半。",
        "你在一场灵界拍卖会上看见一件人界法器，起价低得可疑。",
        "天渊城的夜里有人吹笛，声音传不到城墙外。",
        "灵界的一轮月挂得很低，像伸手就能碰到。",
      ],
      details: [
        "灵界很大，大到一个人很容易消失。",
        "你开始用百年为单位记事。",
        "这里的灵气比人界浓十倍，也冷十倍。",
        "你不再轻易相信陌生人。",
        "城墙上的旗换了三次。",
        "你听见远处有东西在呼吸。",
        "这件事在灵界不算大。",
        "你走了很久，才看见一盏灯。",
      ],
      outcomes: [
        "你回到了天渊城。",
        "你把这件事告诉了少数几个人。",
        "你后来再没走过那条路。",
        "你得到了一点消息。",
        "你活着回来了。",
        "你开始习惯灵界的沉默。",
        "你在城里住了几年。",
        "你记住了那盏灯。",
      ],
      choices: [
        [
          { label: "进城", effects: { stones: 40, mood: 3 }, outcome: "你交了入城费。城里的灯比外面暖。" },
          { label: "绕城而过", effects: { insight: 3, luck: 2 }, outcome: "你没有进城。荒原上的风一直跟着你。" },
        ],
        [
          { label: "买下残卷", effects: { stones: -60, insight: 4 }, outcome: "残卷上只有半句口诀，剩下的是空白。" },
          { label: "不买", effects: { mood: 1, luck: 1 }, outcome: "你走出书铺。老板没有再留你。" },
        ],
        [
          { label: "帮商队", effects: { karma: 4, stones: 30 }, outcome: "你替他们赶走了几只低阶妖兽。商队请你喝了一碗热汤。" },
          { label: "抢商队", risk: { p: 0.25, text: "你拿到了东西。", fail: { death: true, cause: "殁于荒原" } }, effects: { stones: 100, karma: -6 }, outcome: "你拿走了他们的货。没有人追上来。" },
        ],
        [
          { label: "进裂缝看看", risk: { p: 0.4, text: "你从裂缝里带回了东西。", fail: { death: true, cause: "殁于空间裂缝" } }, effects: { insight: 8, luck: 5 }, outcome: "裂缝里没有路，只有一片很旧的星空。" },
          { label: "退开", effects: { mood: 2, insight: 1 }, outcome: "你退到安全的地方。裂缝在你面前合上了。" },
        ],
      ],
    },

    immortal: {
      scenes: [
        "仙宫的钟声响了九下，云海翻涌。",
        "你站在北寒仙域的雪线上，看见下方的界域像一枚小小的灯。",
        "仙灵气浓得化不开，呼吸之间便是百年。",
        "你又送走了一位同辈。仙界的时间，比下界更冷。",
        "仙宫的使者来过一次，留下一枚玉简就走了。",
        "断界海的潮水退下去，露出一条没有名字的路。",
        "天外有光坠落，砸穿了半座仙山。没有人去看。",
        "你在大罗天上回望，万界如尘。",
        "仙宫的偏院里有一棵不开花的树，树下埋着旧剑。",
        "北寒仙域的雪下了三百年，把一座城埋得只剩下塔尖。",
        "你在仙市上看见一件凡间旧物，标价却比仙器还高。",
        "一位金仙在云海上讲道，听的人比来时少了一半。",
        "断界海的潮声里，偶尔能听见下界的钟。",
        "仙宫送来的玉牌上，刻着一个你从未用过的名字。",
        "你在一场仙宴上坐了整夜，没有动面前那杯酒。",
        "天外的裂缝又扩大了一点，仙官们说无碍。",
        "你收了一个刚从下界飞升的弟子，他连云海都怕。",
        "大罗天的风穿过宫殿，吹动了早已不响的旧钟。",
        "仙宫的旧档里夹着一片凡间的树叶，颜色还没有褪。",
        "你在云海尽头看见一座没有名字的碑。",
      ],
      details: [
        "仙界不是享福的地方。",
        "你已经很久没有数过自己的岁数。",
        "这里的规矩，比灵气还重。",
        "你开始忘记一些凡间的字。",
        "没有人敢走得太近。",
        "你听见云海下面有人在哭。",
        "这件事在仙宫不算新闻。",
        "你站了很久，才想起回去。",
      ],
      outcomes: [
        "你回到了仙宫。",
        "你把这件事记在玉简上。",
        "你后来再没提过。",
        "你得了一点东西。",
        "你失去了一点东西。",
        "你开始习惯一个人看云。",
        "你在雪线上坐了很久。",
        "仙界还是老样子。",
      ],
      choices: [
        [
          { label: "接下玉牌", effects: { stones: 120, mood: 3 }, outcome: "玉牌上刻着你的名字，下面一行小字。" },
          { label: "不接", effects: { luck: 4, insight: 3 }, outcome: "你转身走了。仙官没有拦你。" },
        ],
        [
          { label: "闭关", effects: { cult: 5, mood: -2 }, outcome: "你闭上眼。再睁开时，山下已经换了朝代。" },
          { label: "下山", effects: { mood: 5, insight: 3 }, outcome: "你在人间走了很久。没有人知道你是谁。" },
        ],
        [
          { label: "收徒", effects: { karma: 4, mood: 4 }, outcome: "你在山门口收了一个孩子。他问你，山上面有什么。" },
          { label: "不收", effects: { mood: -1, insight: 2 }, outcome: "你从他身边走过。他后来去了别的山门。" },
        ],
        [
          { label: "走上去", risk: { p: 0.35, text: "你走到了路的尽头。", fail: { death: true, cause: "被界海吞没" } }, effects: { insight: 9, mood: 5 }, outcome: "路的尽头没有光。你站了很久，然后转身。" },
          { label: "回头", effects: { mood: 3 }, outcome: "你往回走。潮水重新漫上来。" },
        ],
      ],
    },

    partner: {
      scenes: [
        "{p}在灯下替你补一件旧袍，针脚很密。",
        "{p}从外面回来，带了一身雨气。",
        "{p}把一碗热汤放在你手边，没有说话。",
        "你和{p}为了一件小事争执，最后谁也没有先低头。",
        "{p}在洞府前种了一株桃树，说等它开花。",
        "{p}病了。你守在床边，听见对方的呼吸很轻。",
        "{p}问你，修行到最后，会不会只剩下一个人。",
        "{p}把一枚旧玉放在你手心，说是从家里带来的。",
        "{p}在窗边等你回来，桌上的饭菜已经凉了。",
        "你和{p}并肩走了很远，谁都没有提要去哪里。",
        "{p}替你挡了一次麻烦，回来时衣角破了。",
        "{p}说不喜欢你现在看人的眼神。",
        "{p}把这些年的灵石都收在一只旧匣子里。",
        "你在夜里醒来，听见{p}在低声念你的名字。",
        "{p}要出一趟远门，问你有没有话要带。",
        "你和{p}在山门前站了很久，谁也没有进去。",
        "{p}病了以后，院里的桃树再没有人浇。",
        "{p}把旧袍叠好，说这件衣服该换了。",
        "{p}在门口等你，手里提着一盏没有点的灯。",
        "你和{p}坐在屋顶上看了一夜的星。",
      ],
      details: [
        "你们在一起已经很多年了。",
        "有些话，你们都没有说出口。",
        "修行路长，一个人走确实太冷。",
        "你开始记得对方的一些小习惯。",
        "这间洞府，慢慢有了两个人的痕迹。",
        "你不知道这样的日子还能有多久。",
        "对方很少问你外面的事。",
        "你也没有问对方的过去。",
      ],
      outcomes: [
        "你们谁也没有再提这件事。",
        "那天晚上，洞府里很安静。",
        "你后来常常想起这一幕。",
        "你们又一起过了很多年。",
        "你开始把对方算进自己的打算里。",
        "有些东西，比修为更难放下。",
        "你不知道自己做得对不对。",
        "你们都还活着。",
      ],
      choices: [
        [
          { label: "陪对方", effects: { mood: 8, cult: -1, affinity: 5 }, outcome: "你放下手里的事，陪对方坐了一会儿。" },
          { label: "闭关", effects: { cult: 4, mood: -4, affinity: -2 }, outcome: "你进了闭关室。门关上时，对方还站在那里。" },
          { label: "争执", effects: { mood: -6, insight: 3, affinity: -8 }, outcome: "你们吵了几句。最后谁也没有赢。" },
        ],
        [
          { label: "送对方一件东西", effects: { stones: -60, mood: 6, affinity: 5 }, outcome: "你把东西放在对方手里。对方看了很久。" },
          { label: "一起游历", effects: { mood: 5, luck: 2, insight: 2, affinity: 5 }, outcome: "你们一起下了山。路上遇见一场很长的雨。" },
          { label: "留下修炼", effects: { cult: 3, mood: 1, affinity: -1 }, outcome: "你留在洞府。对方一个人出了门。" },
        ],
        [
          { label: "坦白", effects: { mood: 4, karma: 2, affinity: 6 }, outcome: "你把心里的事说了。对方听完，没有笑你。" },
          { label: "瞒着", effects: { mood: -3, insight: 2, affinity: -3 }, outcome: "你把话咽了回去。对方看了你一眼，什么也没问。" },
        ],
        [
          { label: "等对方", effects: { mood: 2, karma: 2, affinity: 4 }, outcome: "你在洞府里等。对方回来时，天已经黑了。" },
          { label: "先走", effects: { cult: 3, mood: -2, affinity: -2 }, outcome: "你先走了。回头时，门口没有人。" },
        ],
      ],
    },
  };

  /* 给回归测试读取场景池；运行时只读，不参与事件生成。 */
  XD.SCENE_POOLS = POOLS;

  /* 童年选择组：16 组通用 + 14 种出身 × 6 组 = 100 组 */
  const CHILD_IDENTITIES = [
    "山村农家",
    "药铺学徒之家",
    "外门杂役",
    "武林世家旁支",
    "没落修仙家族",
    "县城书香门第",
    "皇城商贾",
    "渔村孤儿",
    "镖师之子",
    "猎户之家",
    "采药人之家",
    "渡船人家",
    "牧场人家",
    "矿工之家",
  ];

  const CHILD_IDENTITY_WORDS = {
    山村农家: "种田",
    药铺学徒之家: "抓药",
    外门杂役: "做事",
    武林世家旁支: "拳脚",
    没落修仙家族: "祖传功法",
    县城书香门第: "读书",
    皇城商贾: "算账",
    渔村孤儿: "打鱼",
    镖师之子: "走镖",
    猎户之家: "打猎",
    采药人之家: "认药",
    渡船人家: "撑船",
    牧场人家: "放牧",
    矿工之家: "下矿",
  };

  const CHILD_IDENTITY_TEMPLATES = [
    {
      a: {
        label: "跟着家里学点{familyWord}的门道",
        effects: { insight: 2, mood: 2 },
        outcome: "你跟在大人身后，看他们怎么把日子过下去。",
      },
      b: {
        label: "跑去{place}看热闹",
        effects: { luck: 2, insight: 1 },
        outcome: "你跑出去看了半天，回来时饭已经凉了。",
      },
    },
    {
      a: {
        label: "把这事告诉家里",
        effects: { karma: 2, mood: 1 },
        outcome: "大人听完，沉默了一会儿，说以后别一个人乱跑。",
      },
      b: {
        label: "自己藏着不说",
        effects: { mood: 2, insight: 1 },
        outcome: "你把它藏在心里，连睡觉时都记得。",
      },
    },
    {
      a: {
        label: "按{familyWord}的规矩来",
        effects: { insight: 2, mood: 1 },
        outcome: "你照着家里的规矩做了，没人夸你，也没人骂你。",
      },
      b: {
        label: "偏要试一次",
        effects: { luck: 3, mood: -1 },
        outcome: "你试了。结果不算好，但你没有后悔。",
      },
    },
    {
      a: {
        label: "带上家里的家伙",
        effects: { luck: 2, insight: 1 },
        outcome: "你带上了家里常用的东西，心里踏实了一点。",
      },
      b: {
        label: "空着手去",
        effects: { mood: 2, luck: -1 },
        outcome: "你空着手去了，回来时才知道大人为什么总让你带东西。",
      },
    },
    {
      a: {
        label: "先问{place}的老人",
        effects: { insight: 2, luck: 1 },
        outcome: "老人说了很多，你只听懂了一半。",
      },
      b: {
        label: "自己找答案",
        effects: { insight: 2, mood: 1 },
        outcome: "你找了很久，最后在一个不起眼的角落找到了答案。",
      },
    },
    {
      a: {
        label: "帮家里做点{familyWord}的活",
        effects: { karma: 2, mood: 2 },
        outcome: "你帮了半天忙，手上沾了灰，心里却很高兴。",
      },
      b: {
        label: "去外面看看",
        effects: { luck: 3, insight: 1 },
        outcome: "你走出去很远，直到看见一条没走过的路。",
      },
    },
  ];

  const CHILD_SPECIFIC_GROUPS = [];
  CHILD_IDENTITIES.forEach((family) => {
    CHILD_SPECIFIC_GROUPS.push({
      family,
      choices: CHILD_IDENTITY_TEMPLATES.map((tpl) => [
        {
          label: tpl.a.label,
          effects: Object.assign({}, tpl.a.effects),
          outcome: tpl.a.outcome,
        },
        {
          label: tpl.b.label,
          effects: Object.assign({}, tpl.b.effects),
          outcome: tpl.b.outcome,
        },
      ]),
    });
  });

  XD.CHILD_CHOICE_GROUP_COUNT =
    POOLS.child.choices.length +
    CHILD_SPECIFIC_GROUPS.reduce((sum, group) => sum + group.choices.length, 0);

  function childChoiceGroups(s) {
    const family = (s.origin && s.origin.family) || "";
    const specific = CHILD_SPECIFIC_GROUPS.filter((g) => g.family === family).flatMap(
      (g) => g.choices
    );
    if (!specific.length) return POOLS.child.choices;
    const generic = POOLS.child.choices;
    const start = (s.seed >>> 0) % generic.length;
    const picked = [];
    for (let k = 0; k < 6; k++) picked.push(generic[(start + k) % generic.length]);
    return specific.concat(picked);
  }

  const THEMES = [
    { key: "h_child", pool: "child", when: (s) => s.world === "human" && s.age >= 2 && s.age <= 16, w: 8, titles: ["小时候", "村口", "旧事", "那年", "一枚铜钱", "雨夜"], hook: "那一年，你还小。" },
    { key: "h_school", pool: "sect", when: (s) => s.world === "human" && s.path === "cultivator" && s.sect && s.sect !== "散修" && s.age >= 10 && s.age <= 45 && s.tier <= 2, w: 5, titles: ["山门", "外门", "任务牌", "比试", "罚跪", "传功"], hook: "山门里的日子，和你想的不一样。" },
    { key: "h_alchemy", pool: "sect", when: (s) => s.world === "human" && s.sect && s.sect !== "散修" && s.tier >= 1 && s.tier <= 5 && s.age >= 16, w: 5, titles: ["丹房", "炉火", "药香", "一炉丹", "守火", "废丹"], hook: "丹炉边的日子，安静得能听见火。" },
    { key: "h_travel", pool: "wild", when: (s) => s.world === "human" && s.tier >= 1 && s.tier <= 5 && s.age >= 20, w: 5, titles: ["远行", "荒原", "古洞", "雾", "夜宿", "路上"], hook: "你离开熟悉的地方，走了很远。" },
    { key: "h_rival", pool: "sect", when: (s) => s.world === "human" && s.sect && s.sect !== "散修" && s.tier >= 2 && s.age >= 50, w: 5, titles: ["对手", "旧怨", "比试", "一步", "山门", "心气"], hook: "有人把你当成了对手。" },
    { key: "h_market", pool: "market", when: (s) => s.world === "human" && s.tier >= 1 && s.tier <= 4 && s.age >= 16, w: 5, titles: ["坊市", "摊子", "拍卖", "旧书", "假丹", "灵石"], hook: "坊市里什么都有，也什么都没有。" },
    { key: "h_war", pool: "war", when: (s) => s.world === "human" && s.tier >= 2 && s.tier <= 5 && s.age >= 80, w: 4, titles: ["城墙", "征召", "伤兵", "夜袭", "军帐", "断后"], hook: "战争不是一场架，是一年一年地耗。" },
    { key: "h_family", pool: "home", when: (s) => s.world === "human" && s.tier <= 2 && s.age >= 18, w: 4, titles: ["家里", "婚事", "孩子", "旧屋", "年节", "回信"], hook: "凡俗的亲事，比修行更难算。" },
    { key: "h_love", pool: "partner", when: (s) => s.world === "human" && !s.partner && s.tier >= 2 && s.age >= 30, w: 5, titles: ["心动", "同心结", "一个人", "山门", "雨", "道侣"], hook: "有个人，开始在你的日子里出现。", choices: [[{ label: "表明心意", effects: { partner: "道侣", mood: 12, karma: 3 }, outcome: "你把话说出口。对方愣了很久，然后笑了。" }, { label: "把心思收起来", effects: { insight: 4, mood: -3 }, outcome: "你什么也没说。那个人后来下了山。" }]] },
    { key: "h_trib", pool: "wild", when: (s) => s.world === "human" && s.tier >= 2 && s.age >= 100, w: 4, titles: ["关口", "雷声", "心魔", "冲关", "旧伤", "一线"], hook: "修行到某个地方，天会问你一句。" },
    { key: "h_disciple", pool: "sect", when: (s) => s.world === "human" && s.sect && s.sect !== "散修" && s.tier >= 3, w: 4, titles: ["收徒", "弟子", "传功", "山门", "旧书", "后辈"], hook: "你开始教别人。" },
    { key: "s_city", pool: "spirit", when: (s) => s.world === "spirit" && s.age >= 0, w: 5, titles: ["天渊城", "西坊", "长街", "雪", "旧书铺", "城门"], hook: "天渊城的日子，和人间很像，又完全不一样。" },
    { key: "s_clan", pool: "spirit", when: (s) => s.world === "spirit" && s.tier >= 6, w: 4, titles: ["族老", "祠堂", "旁支", "长明灯", "族谱", "旧宅"], hook: "族里的老人开始把事交给你。" },
    { key: "s_war", pool: "spirit", when: (s) => s.world === "spirit" && s.age >= 100, w: 4, titles: ["异族", "城墙", "号角", "西线", "军功", "雪夜"], hook: "城墙上的风，永远带着铁锈味。" },
    { key: "s_market", pool: "spirit", when: (s) => s.world === "spirit" && s.age >= 100, w: 4, titles: ["灵界坊市", "拍卖", "残卷", "灵石", "摊主", "假货"], hook: "灵界的坊市，比人界大十倍，也冷十倍。" },
    { key: "s_beast", pool: "spirit", when: (s) => s.world === "spirit" && s.age >= 200, w: 4, titles: ["荒原", "妖兽", "兽潮", "古洞", "追踪", "夜里"], hook: "荒原上的东西，不全是妖兽。" },
    { key: "s_law", pool: "spirit", when: (s) => s.world === "spirit" && s.age >= 500, w: 3, titles: ["一线", "法则", "雪线", "虚空", "旧路", "天边"], hook: "你摸到了一条看不见的线。" },
    { key: "s_disciple", pool: "spirit", when: (s) => s.world === "spirit" && s.age >= 500, w: 3, titles: ["收徒", "弟子", "传功", "后辈", "山门", "旧人"], hook: "你收了一个徒弟。" },
    { key: "i_palace", pool: "immortal", when: (s) => s.world === "immortal" && s.age >= 0, w: 5, titles: ["仙宫", "玉牌", "云海", "偏院", "仙官", "旧钟"], hook: "仙宫不是家。" },
    { key: "i_time", pool: "immortal", when: (s) => s.world === "immortal" && s.age >= 1000, w: 4, titles: ["山中", "无历日", "醒来", "旧朝代", "雪线", "人间"], hook: "你开始记不清年份。" },
    { key: "i_law", pool: "immortal", when: (s) => s.world === "immortal" && s.age >= 2000, w: 3, titles: ["法则", "断界海", "无名之路", "天外", "一线", "旧规"], hook: "仙界也有规矩，只是规矩不写在纸上。" },
    { key: "i_market", pool: "immortal", when: (s) => s.world === "immortal" && s.age >= 500, w: 4, titles: ["仙市", "摊主", "旧物", "灵石", "拍卖", "假货"], hook: "仙市的摊主，很多比你活得久。" },
    { key: "p_mortal", pool: "partner", when: (s) => s.world === "human" && s.partner && s.partner.alive !== false && s.partner.status === "present" && s.tier === 0, w: 16, titles: ["家里人", "灯下", "旧衣", "年节", "院子里", "孩子"], hook: "{p}还在你身边。", extra: (s) => (s.partner ? `你们已经一起过了 ${Math.max(1, s.age - s.partner.since)} 年。${partnerLine(s)}` : "") },
    { key: "p_human", pool: "partner", when: (s) => s.world === "human" && s.partner && s.partner.alive !== false && s.partner.status === "present" && s.tier >= 2, w: 16, titles: ["道侣", "旧袍", "灯下", "同行", "争执", "桃树"], hook: "{p}还在你身边。", extra: (s) => (s.partner ? `你们在一起已经 ${Math.max(1, s.age - s.partner.since)} 年了。${partnerLine(s)}` : "") },
    { key: "p_spirit", pool: "partner", when: (s) => s.world === "spirit" && s.partner && s.partner.alive !== false && s.partner.status === "present", w: 16, titles: ["道侣", "灵界", "旧玉", "雪夜", "同行", "洞府"], hook: "在灵界，{p}是你少数认得的人。", extra: (s) => (s.partner ? `你们一起走过了 ${Math.max(1, s.age - s.partner.since)} 年。${partnerLine(s)}` : "") },
    { key: "p_immortal", pool: "partner", when: (s) => s.world === "immortal" && s.partner && s.partner.alive !== false && s.partner.status === "present", w: 16, titles: ["道侣", "仙宫", "雪线", "旧事", "时间", "人间"], hook: "仙界的时间太长，{p}是少数还让你觉得时间在走的人。", extra: (s) => (s.partner ? `你们已经相伴 ${Math.max(1, s.age - s.partner.since)} 年。${partnerLine(s)}` : "") },
  ];

  /* 每个主题只在对应阶段抽取，避免后期出现前期的童年/凡俗心境 */
  const STAGE_BY_THEME = {
    h_child: "childhood",
    h_school: ["childhood", "mortal", "qi"],
    h_alchemy: ["qi", "core", "spirit"],
    h_travel: ["qi", "core", "spirit"],
    h_rival: ["qi", "core", "spirit"],
    h_market: ["qi", "core"],
    h_war: ["qi", "core", "spirit"],
    h_family: ["mortal", "qi"],
    h_love: ["qi", "core", "spirit"],
    h_trib: ["qi", "core", "spirit"],
    h_disciple: ["core", "spirit"],
    s_city: "spirit",
    s_clan: "spirit",
    s_war: "spirit",
    s_market: "spirit",
    s_beast: "spirit",
    s_law: "spirit",
    s_disciple: "spirit",
    i_palace: "immortal",
    i_time: "immortal",
    i_law: "immortal",
    i_market: "immortal",
  };
  const DANGER_BY_THEME = {
    h_war: "battlefield",
    s_war: "battlefield",
    h_travel: "wild",
    s_beast: "wild",
    i_ruin: "wild",
    h_market: "market",
    s_market: "market",
    s_city: "market",
    i_market: "market",
    h_school: "sect",
    h_rival: "sect",
    h_disciple: "sect",
    s_clan: "sect",
    s_disciple: "sect",
    s_law: "sect",
    h_alchemy: "alchemy",
    i_palace: "immortal",
    i_time: "immortal",
    i_law: "immortal",
  };
  THEMES.forEach((theme) => {
    if (STAGE_BY_THEME[theme.key]) theme.stage = STAGE_BY_THEME[theme.key];
    if (DANGER_BY_THEME[theme.key]) theme.danger = DANGER_BY_THEME[theme.key];
    if (theme.key === "h_trib") theme.noRescue = true;
  });

  THEMES.forEach((theme, ti) => {
    const pool = POOLS[theme.pool];
    const count = theme.key === "h_child" ? 400 : N;
    for (let i = 0; i < count; i++) {
      const title = theme.titles[i % theme.titles.length];
      const scene = pool.scenes[i % pool.scenes.length];
      const detail =
        pool.details[
          (Math.floor(i / pool.scenes.length) + i) % pool.details.length
        ];
      const outcome = pool.outcomes[(i * 3 + 1) % pool.outcomes.length];
      const baseSets = theme.choices || pool.choices;
      const setFor = (s) => {
        const sets = theme.key === "h_child" ? childChoiceGroups(s) : baseSets;
        return sets[i % sets.length];
      };
      add({
        id: `g_${theme.key}_${i}`,
        when: theme.when,
        w: theme.w + (i % 3),
        title,
        sceneKey: `${theme.key}:${scene}`,
        stage: theme.stage,
        tone: ["kind", "curious", "bold", "calm", "ruthless"][i % 5],
        text: (s) =>
          fill(
            `${scene}${detail}${theme.hook}${theme.extra ? theme.extra(s) : ""}`,
            s
          ),
        choices: (s) =>
          setFor(s).map((c, ci) => {
            const text =
              typeof c.outcome === "function"
                ? c.outcome
                : c.outcome
                ? fill(c.outcome, s)
                : fill(outcome, s);
            return {
              ...c,
              label: fill(c.label, s),
              danger: theme.danger,
              noRescue: theme.noRescue,
              outcome:
                theme.key === "h_child" && typeof c.outcome !== "function"
                  ? `${text}${pool.outcomes[(i + ci) % pool.outcomes.length]}`
                  : text,
            };
          }),
      });
    }
  });

  function add(ev) {
    if (ev.once === undefined) ev.once = true;
    if (ev.w === undefined) ev.w = 5;
    E.push(ev);
  }

  XD.EVENTS = E;
  XD.EVENT_BY_ID = E.reduce((m, e) => ((m[e.id] = e), m), {});
})();
