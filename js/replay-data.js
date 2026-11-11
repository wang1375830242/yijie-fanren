/* 重开层：身世底牌、时代相位、自缚誓约 */
(function () {
  "use strict";
  const XD = (window.XD = window.XD || {});

  const OATHS = [
    { key: "none", name: "不立誓", desc: "这一世不给自己加约束。" },
    { key: "no_kill", name: "不杀生", desc: "不主动夺人性命。违约会伤道心。" },
    { key: "no_sect", name: "不拜师", desc: "不入宗门，不做弟子。违约会伤道心。" },
    { key: "no_core", name: "不结丹", desc: "不借金丹捷径，不结丹。违约会伤道心。" },
  ];

  const PHASES = [
    {
      key: "peace",
      name: "承平",
      desc: "山门安稳，市镇有序。机缘不多，但人命也没那么轻。",
      cultMul: 1,
      eventLabel: "承平之世",
    },
    {
      key: "war",
      name: "兵灾",
      desc: "边境在打仗，散修和流民一起上路。活下去比破境更难。",
      cultMul: 0.96,
      eventLabel: "兵灾之年",
    },
    {
      key: "decline",
      name: "末法",
      desc: "灵气一年比一年薄。旧功法还能练，但没人敢保证明天。",
      cultMul: 0.9,
      eventLabel: "末法之秋",
    },
    {
      key: "surge",
      name: "灵潮",
      desc: "灵气反常地浓，妖族和天才一起冒出来。机会多，争抢也多。",
      cultMul: 1.1,
      eventLabel: "灵潮之春",
    },
  ];

  const SECRETS = [
    {
      key: "orphan",
      name: "弃婴",
      hint: "你襁褓里有一块旧布，角上绣着半个「云」字。",
      desc: "你并非这户人家亲生。二十年前，有人在河埠头把一个孩子放进竹篮。",
    },
    {
      key: "fallen",
      name: "罪宗之后",
      hint: "有人看见你耳后有一道旧印，像某个已经除名的宗门标记。",
      desc: "你的生父是一个被除名宗门的旧人。宗门没有死绝，只是换了名字。",
    },
    {
      key: "yao",
      name: "妖族血脉",
      hint: "你从小怕铜镜。镜子里偶尔会多出一双不属于你的眼睛。",
      desc: "你的母系有一缕妖族血脉。它没有给你力量，只让你在夜里听见山林。",
    },
    {
      key: "replaced",
      name: "被顶替的遗孤",
      hint: "有人叫你另一个名字。那名字不属于你，却有人替你应过。",
      desc: "你小时候被用来顶替另一个孩子。真正的那个人被抱去了哪里，没人肯说。",
    },
  ];

  XD.REPLAY = { OATHS, PHASES, SECRETS };
})();
