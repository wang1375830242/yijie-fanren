const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const pages = ["index.html", "play.html", "hall.html", "guestbook.html", "codex.html", "about.html", "changelog.html"];
const cssFiles = ["css/base.css", "css/tokens.css", "css/day.css", "css/guestbook.css"];
let checks = 0;

function ok(value, message) {
  checks += 1;
  if (!value) throw new Error(message);
}

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

for (const page of pages) {
  const source = read(page);
  ok(/<html[^>]*\blang="zh-Hans"/.test(source), `${page}: missing zh-Hans lang`);
  ok(/<main\b/.test(source), `${page}: missing main landmark`);
  ok(/<title>[^<]+<\/title>/.test(source), `${page}: missing title`);
  ok(!/<img\b(?![^>]*\balt=)/i.test(source), `${page}: image without alt`);
}

const play = read("play.html");
ok(/id="choiceOverlay"/.test(play) && /role="dialog"/.test(play), "play: choice overlay should be a dialog");
ok(/aria-modal="true"/.test(play), "play: choice dialog should be modal");
ok(/id="log"[^>]*aria-live="polite"/.test(play), "play: log should announce updates");

const guestbook = read("guestbook.html");
ok(/<label[^>]*for="gbName"/.test(guestbook) && /id="gbName"/.test(guestbook), "guestbook: name input needs a label");
ok(/<label[^>]*for="gbText"/.test(guestbook) && /id="gbText"/.test(guestbook), "guestbook: text input needs a label");
ok(/id="gbStatus"[^>]*aria-live="polite"/.test(guestbook), "guestbook: status needs aria-live");

const css = cssFiles.map(read).join("\n");
ok(/@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(css), "css: missing reduced-motion fallback");
ok(/:focus-visible/.test(css), "css: missing focus-visible styles");
ok(/@media\s*\(max-width:\s*720px\)/.test(css), "css: missing mobile breakpoint");

const game = read("js/game.js");
ok(/trapFocus|trapChoicePrompt/.test(game), "game: missing focus trap");
ok(/Escape/.test(game), "game: missing Escape handling");

console.log(`a11y-check: ${checks} checks passed`);
