/* LeanCloud 客户端配置。
   AppKey 是公开客户端密钥；不要在这里放 MasterKey。
   正式发布前建议绑定自己的 API 域名，并设置类权限。 */
window.XD_LEAN = {
  enabled: true,
  appId: "r3SfxaL0srvP2HGc5072ODlm-gzGzoHsz",
  appKey: "SyxUPSvzhKLjx6Gy7TsB0CEI",
  serverURL: "https://r3sfxal0.lc-cn-n1-shared.com",
  trackLocal: false,
  // 静态站点默认只读；点灯/留言/访问上报必须走同源 server.py 或 LeanCloud 云函数。
  writeMode: "server",
  classes: {
    visit: "SiteVisit",
    visitor: "SiteVisitor",
    candle: "HallCandle",
    message: "HallMessage",
  },
};
