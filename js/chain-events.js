/* ==========================================================================
   关键关系链：父母 / 道侣 / 弟子 / 仇敌
   只注册到 EVENT_BY_ID，不进入普通随机事件池。
   ========================================================================== */
(function () {
  "use strict";
  const XD = window.XD;
  const chainEvents = [];

  function npc(s, role) {
    if (role === "parent") return { name: "父母" };
    if (role === "partner") return s.partner || {};
    const key = s.npcStates && s.npcStates[role] && s.npcStates[role].key;
    const list = role === "disciple" ? s.disciples || [] : s.rivals || [];
    return list.find((n) => n && n.id === key) || list.find((n) => n && n.alive !== false) || {};
  }

  function add(ev) {
    ev.once = true;
    ev.when = ev.when || (() => true);
    chainEvents.push(ev);
    XD.EVENT_BY_ID[ev.id] = ev;
  }

  /* ---------------- 父母：3 个节点 ---------------- */
  add({
    id: "chain_parent_1",
    chain: { role: "parent", stage: 1, nextGap: 15 },
    title: "家树",
    text: "山门外的石阶上放着一封没有署名的信。信里只有一句：家里那棵老槐树，今年没有开花。",
    choices: [
      {
        label: "请几日假，回去看看",
        effects: { mood: 8, karma: 3 },
        outcome: "你推开院门时，母亲正在扫落叶。她看见你，扫帚停在半空，很久才说出一句：回来就好。",
      },
      {
        label: "托人带些灵石回去",
        effects: { stones: -30, mood: 3, karma: 2 },
        outcome: "灵石托同乡带走了。半个月后回信说，家里添了两床新被，父亲把旧的那床收进了柜子。",
      },
      {
        label: "把信收进袖中，继续修行",
        effects: { mood: -5, insight: 2 },
        outcome: "你把信收进袖中。那一夜打坐，你总听见窗外有风吹过空枝的声音。",
      },
    ],
  });

  add({
    id: "chain_parent_2",
    chain: { role: "parent", stage: 2, nextGap: 18 },
    title: "药渣",
    text: "邻村的人带来口信：父亲近来咳得厉害，母亲把药渣倒在门口，怕人看见。口信最后说，不严重，让你不必回。",
    choices: [
      {
        label: "立刻回去，请最好的大夫",
        effects: { stones: -80, mood: -3, karma: 4 },
        outcome: "你请来的大夫诊了半日，只说年纪到了。母亲在灶间煮了一锅粥，谁也没有先动筷。",
      },
      {
        label: "寄回一批药材，托族亲照看",
        effects: { stones: -45, mood: 2, karma: 2 },
        outcome: "药材寄到了。族亲回信说，父亲把药分了一半给隔壁同样咳嗽的老人。",
      },
      {
        label: "闭关紧要，暂不回去",
        effects: { mood: -8, cult: 4 },
        outcome: "你关上了洞府的门。那一年修为长了一截，梦里却总有一扇没有推开的院门。",
      },
    ],
  });

  add({
    id: "chain_parent_3",
    chain: { role: "parent", stage: 3, nextGap: 0 },
    title: "白烛",
    text: "你赶到家时，屋里已经点上了白烛。母亲坐在门槛上，手里攥着你小时候的一只布鞋。她抬头看见你，先说了一句：路上冷不冷。",
    choices: [
      {
        label: "在灵前守到天亮",
        effects: { mood: -12, karma: 6, flag: "parent_dead" },
        outcome: "你守了一夜。天快亮时，母亲把布鞋放进你手里，说：「以后走远路，记得换双合脚的。」",
      },
      {
        label: "办完丧事，把母亲接到山下",
        effects: { mood: -8, stones: -60, karma: 5, flag: "parent_dead" },
        outcome: "母亲没有反对。她收拾了一个很小的包袱，临走前在院门口站了一会儿，没有回头。",
      },
      {
        label: "留下灵石，连夜赶回山门",
        effects: { mood: -15, stones: -40, karma: -2, flag: "parent_dead" },
        outcome: "你走的时候，白烛还在烧。山路很长，你没有回头，也没有听见身后有人叫你。",
      },
    ],
  });

  /* ---------------- 道侣：3 个节点 ---------------- */
  add({
    id: "chain_partner_1",
    chain: { role: "partner", stage: 1, nextGap: 12 },
    title: "同心结",
    text: (s) => `${npc(s, "partner").name || "那个人"}把一枚旧同心结放在你掌心。绳结磨得发白，像是被攥过很多年。`,
    choices: [
      {
        label: "收下，替对方系在腕上",
        effects: { mood: 10, affinity: 6 },
        outcome: "你低头系绳。对方没有说话，只把手腕往你这边送了送。",
      },
      {
        label: "收下，却说自己还没准备好",
        effects: { mood: 2, insight: 3, affinity: -3 },
        outcome: "对方笑了一下，说没关系。同心结收进了你的袖中，两个人都没有再提。",
      },
      {
        label: "把绳结推回去",
        effects: { mood: -4, affinity: -10 },
        outcome: "对方把手收回去，绳结在掌心里攥了很久。那天之后，你们说话都客气了一些。",
      },
    ],
  });

  add({
    id: "chain_partner_2",
    chain: { role: "partner", stage: 2, nextGap: 18 },
    title: "共劫",
    text: (s) => `雷云压到山头时，${npc(s, "partner").name || "那个人"}站在洞府门口，替你撑着一面已经裂开的盾。对方说：「这次我来。」`,
    choices: [
      {
        label: "把对方拉到身后，自己迎上去",
        effects: { mood: -4, affinity: 10, karma: 4 },
        outcome: "雷落下来时，你听见身后有人喊你的名字。你活下来了，对方的手却抖了很久。",
      },
      {
        label: "并肩站着，一起扛",
        effects: { mood: 4, affinity: 7, cult: 2 },
        outcome: "盾碎了，雷也散了。你们坐在焦黑的地上，谁都没说话，最后一起笑了。",
      },
      {
        label: "让对方先走，自己断后",
        risk: { p: 0.35, text: "阵光亮起时，你被余波掀翻在地。", fail: { mood: -12, affinity: 2 } },
        effects: { mood: -8, affinity: 5 },
        outcome: "你把对方推入传送阵。阵光亮起时，对方隔着光看了你一眼，像是要把这一眼记很久。",
        failText: "阵光亮起时你被余波掀翻在地，缓了很久才站起来。",
      },
    ],
  });

  add({
    id: "chain_partner_3",
    chain: { role: "partner", stage: 3, nextGap: 0 },
    title: "去留",
    text: (s) => `${npc(s, "partner").name || "那个人"}把行李放在门口。对方说，前方还有一条更远的路，问你愿不愿意一起走。`,
    choices: [
      {
        label: "一起走",
        effects: { mood: 12, affinity: 12, partnerStatus: "present", flag: "partner_chain_together" },
        outcome: "你们并肩走出洞府。山路很长，谁也没有说终点在哪里。",
      },
      {
        label: "留在山门，让对方替你看更远的地方",
        effects: { mood: -5, affinity: 5, partnerStatus: "separated", flag: "partner_chain_separated" },
        outcome: "对方走了。每年冬天，你都会收到一封没有落款的信，信里只写今年的雪大不大。",
      },
      {
        label: "把路让开，各自修行",
        effects: { mood: -10, affinity: -8, insight: 4, partnerStatus: "separated", flag: "partner_chain_apart" },
        outcome: "你没有留人。门关上之后，屋里安静得能听见灰落下来的声音。",
      },
    ],
  });

  /* ---------------- 弟子：3 个节点 ---------------- */
  add({
    id: "chain_disciple_1",
    chain: { role: "disciple", stage: 1, nextGap: 15 },
    title: "第一课",
    text: (s) => `${npc(s, "disciple").name || "那名弟子"}把一本抄错三处的功法捧到你面前，手指上还沾着墨。`,
    choices: [
      {
        label: "从头教一遍，不急着让弟子练",
        effects: { mood: 5, discipleAffinity: 10 },
        outcome: "你讲了一个下午。弟子听到最后，把抄错的地方一笔一笔改了过来。",
      },
      {
        label: "把功法扔回去，让弟子自己悟",
        effects: { mood: -2, discipleAffinity: -4, insight: 2 },
        outcome: "弟子捡起功法，站在门外很久。第二天，交上来的那本还是错的，但错得少了两处。",
      },
      {
        label: "带弟子去山下走一趟",
        effects: { mood: 6, discipleAffinity: 5, stones: -10 },
        outcome: "你们在山下吃了一碗面。弟子问了很多问题，你只答了一半。",
      },
    ],
  });

  add({
    id: "chain_disciple_2",
    chain: { role: "disciple", stage: 2, nextGap: 20 },
    title: "试炼",
    text: (s) => `${npc(s, "disciple").name || "那名弟子"}第一次独自进山。第七天，山门外的雪地上出现了两行脚印，一行是人的，一行像是拖着什么东西。`,
    choices: [
      {
        label: "亲自下山去找",
        effects: { mood: -2, discipleAffinity: 12, karma: 3 },
        outcome: "你在山腰找到对方。对方背着一头小兽，腿上全是血，还坚持说这是给师门的。",
      },
      {
        label: "让同门去接，自己在山门等",
        effects: { mood: 3, discipleAffinity: 4 },
        outcome: "对方回来时已经包扎好了，见你站在门口，先把背上的猎物举起来给你看。",
      },
      {
        label: "不派人，让弟子自己回来",
        effects: { mood: -4, discipleAffinity: -6, insight: 3 },
        outcome: "对方回来得比所有人预计的晚两天。进门后没有抱怨，只把一枚带血的兽牙放在你桌上。",
      },
    ],
  });

  add({
    id: "chain_disciple_3",
    chain: { role: "disciple", stage: 3, nextGap: 0 },
    title: "出师",
    text: (s) => `${npc(s, "disciple").name || "那名弟子"}已经长成了独当一面的修士。对方站在洞府外，说想下山，去看看你年轻时走过的那些地方。`,
    choices: [
      {
        label: "把本命功法抄一份给弟子",
        effects: { mood: 8, discipleAffinity: 10, discipleStatus: "graduated", flag: "disciple_chain_graduated" },
        outcome: "你把功法交给对方，没有多说什么。对方磕了三个头，背起包袱走了。",
      },
      {
        label: "让弟子再留三年",
        effects: { mood: -2, discipleAffinity: -3, insight: 2, discipleStatus: "graduated", flag: "disciple_chain_delayed" },
        outcome: "对方留了三年。第四年春天，你还是把山门打开了。",
      },
      {
        label: "把衣钵交给弟子，自己闭关",
        effects: { mood: 10, discipleAffinity: 6, discipleStatus: "graduated", flag: "disciple_chain_inherited" },
        outcome: "你把洞府的钥匙放在对方手心。关上门之前，你听见对方在外面很轻地叫了一声师父。",
      },
    ],
  });

  /* ---------------- 仇敌：3 个节点 ---------------- */
  add({
    id: "chain_rival_1",
    chain: { role: "rival", stage: 1, nextGap: 12 },
    title: "旧怨",
    text: (s) => `${npc(s, "rival").name || "那个人"}在坊市尽头拦住你。对方没有拔剑，只把你当年说过的那句话原样还给了你。`,
    choices: [
      {
        label: "当面把话说清楚",
        effects: { mood: 4, karma: 3, rivalHostility: -6 },
        outcome: "你们站在雨里说了很久。最后谁也没有认输，但对方先转身走了。",
      },
      {
        label: "不接话，绕开",
        effects: { mood: -5, insight: 2 },
        outcome: "你从对方身边走过去。走出很远，还能感觉到那道目光落在背上。",
      },
      {
        label: "把旧账再记一笔",
        effects: { mood: -3, karma: -4, rivalHostility: 8 },
        outcome: "你留下一句更重的话。对方笑了一声，说这样也好。",
      },
    ],
  });

  add({
    id: "chain_rival_2",
    chain: { role: "rival", stage: 2, nextGap: 18 },
    title: "试锋",
    text: (s) => `${npc(s, "rival").name || "那个人"}托人送来一柄没有开刃的剑，剑穗上系着一张纸条：三日之后，老地方。`,
    choices: [
      {
        label: "赴约，堂堂正正打一场",
        risk: { p: 0.45, text: "剑断在最后一招，你们都没有再补第二剑。", fail: { mood: -8, rivalHostility: 10 } },
        effects: { mood: 6, insight: 4, rivalHostility: -8 },
        outcome: "你们打到天亮。剑断之后，对方坐在石头上喘气，忽然说：「你比我想的难缠。」",
      },
      {
        label: "先查清对方最近的底细",
        effects: { stones: -30, insight: 5, rivalHostility: -3 },
        outcome: "你查到对方最近在替人押一趟很危险的货。三日后你没有去，对方也没有再来。",
      },
      {
        label: "把剑退回，不赴约",
        effects: { mood: -4, rivalHostility: 5, karma: -2 },
        outcome: "剑被原样送回去。对方没有再送第二柄，但坊间开始有人说你怕了。",
      },
    ],
  });

  add({
    id: "chain_rival_3",
    chain: { role: "rival", stage: 3, nextGap: 0 },
    title: "了断",
    text: (s) => `你和${npc(s, "rival").name || "那个人"}站在同一处断崖上。风很大，谁都没有先动。对方说：「今天总该有个结果。」`,
    choices: [
      {
        label: "拔剑，做个了断",
        risk: { p: 0.55, text: "最后一剑停在对方喉前半寸。", fail: { death: true, cause: "死于旧怨了断" } },
        effects: { mood: 8, karma: -3, rivalHostility: -100, rivalStatus: "reconciled", flag: "rival_chain_spared" },
        outcome: "你收剑入鞘。对方看了你很久，最后把剑扔下断崖，说：「算了。」",
      },
      {
        label: "把当年的事说开",
        effects: { mood: 10, karma: 8, insight: 5, rivalHostility: -100, rivalStatus: "reconciled", flag: "rival_chain_resolved" },
        outcome: "你们从断崖上走下来时，天已经黑了。没有握手，但谁也没有再提旧账。",
      },
      {
        label: "转身离开，让风替我回答",
        effects: { mood: 2, insight: 3, rivalHostility: -8, rivalStatus: "left", flag: "rival_chain_left" },
        outcome: "你转身下山。身后没有脚步声追来。很多年后你才知道，对方在那天离开了这片地方。",
      },
    ],
  });

  XD.CHAIN_EVENTS = chainEvents;
  if (Array.isArray(XD.EVENTS)) XD.EVENTS.push(...chainEvents);

  const isCultivator = (s) => s.path === "cultivator" && s.tier > 0;
  const present = (s, role) => !!(s.npcStates && s.npcStates[role] && s.npcStates[role].present);
  XD.CHAIN_DEFS = {
    parent: [
      { id: "chain_parent_1", stage: 1, minAge: 18, when: (s) => isCultivator(s) && s.world === "human" && !s.flags.no_parents && !s.flags.parent_dead },
      { id: "chain_parent_2", stage: 2, minAge: 35, when: (s) => isCultivator(s) && s.world === "human" && !s.flags.no_parents && !s.flags.parent_dead },
      { id: "chain_parent_3", stage: 3, minAge: 55, when: (s) => isCultivator(s) && s.world === "human" && !s.flags.no_parents && !s.flags.parent_dead },
    ],
    partner: [
      { id: "chain_partner_1", stage: 1, when: (s) => isCultivator(s) && s.partner && s.partner.alive !== false && s.partner.status === "present" },
      { id: "chain_partner_2", stage: 2, when: (s) => isCultivator(s) && s.partner && s.partner.alive !== false && s.partner.status === "present" },
      { id: "chain_partner_3", stage: 3, when: (s) => isCultivator(s) && s.partner && s.partner.alive !== false && s.partner.status === "present" },
    ],
    disciple: [
      { id: "chain_disciple_1", stage: 1, when: (s) => isCultivator(s) && present(s, "disciple") },
      { id: "chain_disciple_2", stage: 2, when: (s) => isCultivator(s) && present(s, "disciple") },
      { id: "chain_disciple_3", stage: 3, when: (s) => isCultivator(s) && present(s, "disciple") },
    ],
    rival: [
      { id: "chain_rival_1", stage: 1, when: (s) => isCultivator(s) && present(s, "rival") },
      { id: "chain_rival_2", stage: 2, when: (s) => isCultivator(s) && present(s, "rival") },
      { id: "chain_rival_3", stage: 3, when: (s) => isCultivator(s) && present(s, "rival") },
    ],
  };
})();
