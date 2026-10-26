/* 在 CSS 之前执行，避免日间主题首屏闪烁；默认夜间。 */
(function () {
  "use strict";
  let theme = "night";
  let font = "serif";
  try {
    const raw = localStorage.getItem("yijie.prefs.v1");
    const prefs = raw ? JSON.parse(raw) : {};
    if (prefs && prefs.theme === "day") theme = "day";
    if (prefs && ["serif", "kai", "fangsong", "sans"].includes(prefs.font)) font = prefs.font;
  } catch (err) {}
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.font = font;
  document.documentElement.style.colorScheme = theme === "day" ? "light" : "dark";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "day" ? "#f7f4ec" : "#0b0f0b");
})();
