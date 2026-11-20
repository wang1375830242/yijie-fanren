/* ==========================================================================
   故人回身：原创泛修仙人物线，不指称原著角色或原著事件。
   初遇进入普通事件池；回归只由 sim.maybeOldFriends 触发。
   ========================================================================== */
(function () {
  "use strict";
  const XD = window.XD;
  if (!XD || !Array.isArray(XD.EVENTS)) return;

  function current(s) {
    if (s.pending && s.pending.oldFriend) return s.pending.oldFriend;
    const list = Array.isArray(s.oldFriends) ? s.oldFriends : [];
    return list.find((item) => item && item.status === "returning") || list.find((item) => item && item.status === "done") || list[0] || {};
  }

  function originText(person) {
    return {
      shelter: "当年你让他进洞府躲了三个月",
      paid: "当年你给了他八十块灵石，让他自己走",
      closed: "当年你在门后站了很久，最终没有开门",
      spared: "当年你的剑停在他喉前，最后收了回去",
      resolved: "当年你们把旧账说开，各自走下山崖",
      left: "当年你转身离开，没有回答他的最后一句问话",
      gift: "当年你把药递给了他",
      paid_herb: "当年他按市价付了药钱",
      turned: "当年你让他去别处求医",
    }[person.originChoice] || "你们曾经有过一面之缘";
  }

  function addReturn(ev) {
    ev.once = true;
    ev.major = true;
    ev.when = () => false;
    XD.EVENT_BY_ID[ev.id] = ev;
  }

  const herb = {
    id: "oldfriend_herbalist_meet",
    once: true,
    w: 5,
    sceneKey: "oldfriend_herbalist_meet",
    title: "山脚药篓",
    when: (s) => s.world === "human" && s.tier >= 1 && s.tier <= 3 && s.age >= 16 && s.age <= 70,
    text: "你下山时，一个采药人坐在石阶上整理药篓。他认出你衣角的药香，问能不能换一剂治风寒的药。家里有人病了，他已经走了两座山。",
    choices: [
      {
        label: "把药递给他，不收钱",
        oldFriend: { kind: "herbalist", choice: "gift" },
        effects: { stones: -12, mood: 2, karma: 2 },
        outcome: "他把药包了两层，放进怀里。下山前又回头谢了一次，你已经被山雾遮住了。",
      },
      {
        label: "按市价收他的钱",
        oldFriend: { kind: "herbalist", choice: "paid_herb" },
        effects: { stones: 8, mood: 1 },
        outcome: "他数出几枚旧钱，坚持让你收下。交易很清楚，谁也没有欠谁。",
      },
      {
        label: "让他去别处求医",
        oldFriend: { kind: "herbalist", choice: "turned" },
        effects: { insight: 1, mood: -1 },
        outcome: "他背起药篓继续往山下走。你站了一会儿，后来再没有见过这个人。",
      },
    ],
  };
  XD.EVENTS.push(herb);
  XD.EVENT_BY_ID[herb.id] = herb;

  addReturn({
    id: "oldfriend_refugee_return",
    title: "旧洞府",
    text: (s) => {
      const p = current(s);
      const origin = originText(p);
      if (p.returnForm === "letter") {
        const letters = [
          `一封越界来信送到你手里。${origin}。信里说他如今已在${p.world === "spirit" ? "灵界" : "另一界"}落脚，却一直犹豫要不要承认认识过你。`,
          `一封很短的信从另一界辗转而来。${origin}。他没有道谢，只问你如今是否还住在原来的地方。`,
          `信辗转了很多年才到你手上。${origin}。他说这件事自己记得，但不想让它变成一辈子还不完的债。`,
        ];
        return letters[p.variant % letters.length];
      }
      const visits = [
        `${p.name}在山门外停下。${origin}。如今他已有自己的名声，随行的人称他前辈。他看见你，先拱手，却没有提当年那间洞府。`,
        `多年不见的${p.name}忽然来访。${origin}。他坐了很久，只说最近遇到了一件难事，始终没开口求你。你知道，他在等你先提当年。`,
        `${p.name}把一件旧物放在桌上，正是当年离开时带走的东西。他说今天不是来还恩，只是想确认，你还记得的他和现在的他，是不是同一个人。`,
      ];
      return visits[p.variant % visits.length];
    },
    choices: (s) => {
      const p = current(s);
      if (p.returnForm === "letter") {
        return [
          {
            label: "回信认下这段旧交",
            effects: { mood: 3, karma: 1, oldFriendResolution: "acknowledged" },
            outcome: "你写了姓名和住处，没有写恩情。信送出去以后，你继续过自己的生活。",
          },
          {
            label: "把信收好，不作回复",
            effects: { mood: 1, insight: 2, oldFriendResolution: "withheld" },
            outcome: "信和旧物放在了一起。没有回复，也是一种回答。",
          },
          {
            label: "只问他如今过得好不好",
            effects: { mood: 2, insight: 1, oldFriendResolution: "questioned" },
            outcome: "你把当年的事留在信外，只问了一句近况。至于他如何理解，那是他的事。",
          },
        ];
      }
      return [
        {
          label: "认下当年那段交情",
          effects: { mood: 4, karma: 1, oldFriendResolution: "acknowledged" },
          outcome: (s) => {
            const p = current(s);
            return p.variant === 1
              ? "你说自己记得。他沉默片刻，终于把眼前的难事说了出来；你没有承诺一定会帮。"
              : "你说自己记得。他反而有些不自在，过了一会儿才说：那就别按恩情算，坐下来喝一盏茶吧。";
          },
        },
        {
          label: "只谈眼前，不提旧恩",
          effects: { mood: 2, insight: 3, oldFriendResolution: "peer" },
          outcome: "你们谈功法、路途和这些年的天气。临走时，他把旧物收回袖中，像是终于放下了一件小事。",
        },
        {
          label: "问他究竟为何回来",
          effects: { mood: -1, insight: 2, oldFriendResolution: "questioned" },
          outcome: (s) => {
            const p = current(s);
            return p.variant === 2
              ? "他说不是来索取答案，只是不愿再被那一年定义。你们没有谈拢，但告别时都平静了一些。"
              : "他想了很久，说连自己也分不清是来还愿，还是来证明如今不必再怕你。你没有替他回答。";
          },
        },
      ];
    },
  });

  addReturn({
    id: "oldfriend_rival_return",
    title: "旧名",
    text: (s) => {
      const p = current(s);
      const origin = originText(p);
      if (p.returnForm === "letter") {
        return `越界而来的一封信没有写旧名，落款却是${p.name}如今使用的名字。${origin}。信里只有一句：过去的事我认得，但我如今是另一个人。`;
      }
      const visits = [
        `你在异乡遇见一个换了名字的人。${origin}。他如今的名字是${p.name}，身边的人都不知道你们的旧事。他看见你时停了一步，像是在等你决定叫什么。`,
        `${p.name}主动报了一个陌生的名字。${origin}。他说旧人已经死在另一条路上，今日来见你，只想知道你是否还坚持当年的看法。`,
        `你和${p.name}在同一处避雨。${origin}。这些年他并没有变成善人，也没有再来寻仇。雨停之前，他忽然问：你那时认出的，究竟是我，还是一个该输给你的人？`,
      ];
      return visits[p.variant % visits.length];
    },
    choices: [
      {
        label: "点破他的旧名",
        effects: { mood: -1, insight: 3, oldFriendResolution: "old_name" },
        outcome: "旧名说出口，他很久没有接话。最后他说：你还记着就好，但别再替我向别人解释。",
      },
      {
        label: "称他现在的名字",
        effects: { mood: 3, karma: 1, oldFriendResolution: "new_name" },
        outcome: (s) => {
          const p = current(s);
          return `你叫了他现在的名字。${p.name}看了你一眼，没有道谢。你们把那场雨听完，然后各自上路。`;
        },
      },
      {
        label: "只谈当年自己的选择",
        effects: { mood: 2, insight: 2, oldFriendResolution: "own_choice" },
        outcome: "你没有评价他变成了什么人，只说当年那一步是自己愿意走的。他听完，没有再追问。",
      },
    ],
  });

  addReturn({
    id: "oldfriend_herbalist_return",
    title: "旧药篓",
    text: (s) => {
      const p = current(s);
      const origin = originText(p);
      if (p.alive === false) {
        return `一个年轻药农背着旧药篓来找你。他说自己是${p.name}的后人，老人已经过世。${origin}。老人后来很少提山上的事，只留下一句话：那位修士也有自己的难处。药农不为讨账，只想把这只药篓给你看一眼。`;
      }
      return `一个年轻药农替父亲${p.name}带来口信。${origin}。老人如今已经走不动远路，只记得那天山上的雾很大。他让后辈来问一句：你是否还记得那条下山的路。`;
    },
    choices: [
      {
        label: "留下那只旧药篓",
        effects: { mood: 2, karma: 1, oldFriendResolution: "kept_basket" },
        outcome: "药农把药篓留在门边。里面没有灵药，只有一股晒过很多年的干草气味。",
      },
      {
        label: "问他后来过得怎样",
        effects: { mood: -1, insight: 2, oldFriendResolution: "asked_life" },
        outcome: (s) => {
          const p = current(s);
          return p.alive === false
            ? "后辈说了一些很平常的事：修屋、采药、过冬、送葬。你听完，才发现自己当年记住的只是一小段山路。"
            : "后辈说老人日子过得平常，病过几次，也抱过孙子。你听到最后，没有再问修行的事。";
        },
      },
      {
        label: "承认自己几乎忘了",
        effects: { mood: 1, insight: 3, oldFriendResolution: "admitted_forgot" },
        outcome: "后辈没有责怪你，只说记得多少都算。下山时，他仍背着那只旧药篓。",
      },
    ],
  });

  XD.OLD_FRIEND_EVENTS = [herb, XD.EVENT_BY_ID.oldfriend_refugee_return, XD.EVENT_BY_ID.oldfriend_rival_return, XD.EVENT_BY_ID.oldfriend_herbalist_return];
})();
