/* 身世错认、时代相位、自缚誓约事件 */
(function () {
  "use strict";
  const XD = window.XD;
  if (!XD || !Array.isArray(XD.EVENTS)) return;
  const E = XD.EVENTS;

  function add(ev) {
    ev.once = true;
    ev.major = true;
    ev.w = 1;
    ev.when = () => false;
    E.push(ev);
    XD.EVENT_BY_ID[ev.id] = ev;
  }

  function secretOf(s) {
    return (s && s.birthSecret) || { name: "旧事", hint: "", desc: "" };
  }

  add({
    id: "identity_mistake",
    title: "错认",
    text: (s) =>
      `一个陌生老人在渡口叫住你，叫的是一个你从没听过的名字。他盯着你耳后看了很久，说：你和他年轻时一模一样。${secretOf(s).hint ? `你忽然想起：${secretOf(s).hint}` : ""}`,
    choices: [
      {
        label: "承认自己就是他口中的那个人",
        effects: { secretStage: 1, mood: -2, insight: 2, karma: -1 },
        outcome: "老人把一块旧木牌塞进你手里。你收下了，没有解释。",
      },
      {
        label: "否认，转身离开",
        effects: { secretStage: 1, mood: 3, insight: 1 },
        outcome: "你走出一段路，回头时老人还在原地。他没有追上来。",
      },
      {
        label: "追问那块旧布 / 旧印的来历",
        effects: { secretStage: 1, insight: 4, mood: -3 },
        outcome: "老人只说了一半，就被同行的人拉走了。剩下的半句，你记了很多年。",
      },
    ],
  });

  add({
    id: "identity_truth",
    title: "身世",
    text: (s) => {
      const secret = secretOf(s);
      return `你终于找到了那个能说清来处的人。${secret.desc || "旧事没有答案，只有一只手把你从原处抱走。"} 你听完，没有立刻说话。`;
    },
    choices: [
      {
        label: "接受自己的来处",
        effects: { secretRevealed: true, mood: 4, insight: 6 },
        outcome: "你没有原谅谁，也没有恨谁。你只是把自己放回了那条更长的时间里。",
      },
      {
        label: "不再追问，把旧物收起来",
        effects: { secretRevealed: true, mood: 2, insight: 3 },
        outcome: "旧物被放回箱底。你照常吃饭、修行，像什么都没发生过。",
      },
      {
        label: "把旧物烧掉",
        effects: { secretRevealed: true, mood: -2, insight: 4, karma: 2 },
        outcome: "火烧得很慢。你看着它灭，心里有一块地方也跟着安静了。",
      },
    ],
  });

  add({
    id: "phase_turn",
    title: "时代",
    text: (s) => {
      const phase = (s && s.phase) || { name: "承平", desc: "天下暂时没有大事。" };
      return `这一世赶上了${phase.name}。${phase.desc} 你在这样的天色里做了第一个真正属于自己的决定。`;
    },
    choices: [
      {
        label: "顺势而为，先活下去",
        effects: { mood: 4, cult: 3 },
        outcome: "你没有和时代争。你只是把今天过完，再说明天。",
      },
      {
        label: "逆势而行，争一线先机",
        effects: { mood: -3, cult: 6, insight: 3 },
        outcome: "你迎着风走了一段。风没有停，但你的脚步也没有停。",
      },
      {
        label: "闭关不出，等这阵风过去",
        effects: { mood: 2, cult: -2, insight: 4 },
        outcome: "你把洞门关上。外面的消息一年比一年少，你的心却慢慢静下来。",
      },
    ],
  });

  add({
    id: "oath_trial",
    title: "誓约",
    text: (s) => {
      const oath = (s && s.oath) || { name: "不立誓", desc: "" };
      return `你这一世立过誓：${oath.name}。今天，有人把一件你最想要的东西放在你面前，代价是违背它。${oath.desc || ""}`;
    },
    choices: (s) => {
      const key = s && s.oath ? s.oath.key : "none";
      if (key === "no_kill") {
        return [
          { label: "放过那个人", effects: { mood: 3, insight: 3 }, outcome: "你收回手。那个人跑进雨里，再也没有回头。" },
          { label: "杀了他，永绝后患", effects: { oathBreak: true, cult: 8, mood: -8, karma: -6 }, outcome: "你擦干净手。那一夜，你梦见自己的名字被写在墙上。" },
          { label: "把他交给宗门处置", effects: { mood: -1, insight: 2 }, outcome: "宗门收下了人。你没有问后来。" },
        ];
      }
      if (key === "no_sect") {
        return [
          { label: "拒绝入门，继续做散修", effects: { mood: 4, insight: 4 }, outcome: "你把名帖放回桌上。长老看了你很久，最后没有挽留。" },
          { label: "接受名帖，拜入山门", effects: { oathBreak: true, stones: 60, cult: 6, mood: -4 }, outcome: "山门在你身后合上。你得到了一个位置，也失去了一点别的东西。" },
          { label: "只借阅功法，不拜师", effects: { mood: 2, insight: 3, stones: -20 }, outcome: "你抄了半个月的经。长老没有再提拜师的事。" },
        ];
      }
      if (key === "no_core") {
        return [
          { label: "拒绝捷径，按自己的路走", effects: { mood: 4, insight: 4 }, outcome: "你把丹药推回去。炉火还在烧，你的心却比刚才稳。" },
          { label: "服下捷径丹，提前结丹", effects: { oathBreak: true, cult: 12, mood: -6, injury: 1 }, outcome: "金丹成了。你听见身体里有一层很轻的裂响。" },
          { label: "把丹药留给后来的人", effects: { mood: 3, karma: 3, insight: 2 }, outcome: "后来的人拿走了丹药。你没有告诉他这枚丹原本是给谁的。" },
        ];
      }
      return [
        { label: "不为所动", effects: { mood: 2, insight: 2 }, outcome: "你看了一眼，又低下头。今天和昨天没有不同。" },
      ];
    },
  });
})();
