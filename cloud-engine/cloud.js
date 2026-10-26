"use strict";

/*
 * LeanCloud 云函数：statsAdmin
 *
 * 部署时在 LeanCloud 云引擎环境变量里设置：
 *   STATS_ADMIN_TOKEN=<只告诉站长的随机口令>
 *
 * 统计页只在输入正确口令后取得聚合数据；
 * 该函数使用 MasterKey 查询，公开客户端不需要、也不应该持有 MasterKey。
 */

const AV = require("leanengine");

const MAX_DAYS = 14;
const MAX_PAGES = 20;
const CLASS_VISIT = "SiteVisit";
const CLASS_VISITOR = "SiteVisitor";

function cleanList(value, max) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item) => typeof item === "string" && item.length <= 120))].slice(0, max);
}

function unauthorized() {
  const err = new AV.Cloud.Error("unauthorized");
  err.code = 401;
  return err;
}

async function count(className, configure) {
  const query = new AV.Query(className);
  if (configure) configure(query);
  return query.count({ useMasterKey: true });
}

AV.Cloud.define("statsAdmin", async (request) => {
  const expected = String(process.env.STATS_ADMIN_TOKEN || "");
  const supplied = request && request.params ? String(request.params.token || "") : "";
  if (!expected || supplied !== expected) throw unauthorized();

  const params = request.params || {};
  const days = cleanList(params.days, MAX_DAYS);
  const pages = cleanList(params.pages, MAX_PAGES);
  const today = typeof params.today === "string" ? params.today.slice(0, 10) : "";

  const total = await count(CLASS_VISIT);
  const unique = await count(CLASS_VISITOR);
  const todayCount = today
    ? await count(CLASS_VISIT, (q) => q.equalTo("day", today))
    : 0;

  const dayRows = [];
  for (const day of days) {
    dayRows.push({ day, count: await count(CLASS_VISIT, (q) => q.equalTo("day", day)) });
  }

  const pageRows = [];
  for (const page of pages) {
    pageRows.push({ page, count: await count(CLASS_VISIT, (q) => q.equalTo("page", page)) });
  }

  return { total, unique, today: todayCount, days: dayRows, pages: pageRows };
});
