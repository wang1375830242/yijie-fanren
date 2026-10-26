const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const root = path.join(__dirname, "..");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};
const candidates = [
  process.env.CHROME_BIN,
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);
const chrome = candidates.find((file) => fs.existsSync(file));
if (!chrome || typeof WebSocket !== "function") {
  console.log("browser-smoke: skipped (no Chrome/CDP support)");
  process.exit(0);
}

const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname);
  const file = path.join(root, pathname === "/" ? "index.html" : pathname.replace(/^\/+/, ""));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end("not found");
    return;
  }
  res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

function requestJson(port, method, pathname) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port, method, path: pathname }, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

function cdpValue(wsUrl, expression) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error("CDP timeout"));
    }, 8000);
    ws.addEventListener("open", () => {
      ws.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: { expression, awaitPromise: true, returnByValue: true } }));
    });
    ws.addEventListener("message", (event) => {
      const data = JSON.parse(event.data);
      if (data.id !== 1) return;
      clearTimeout(timer);
      ws.close();
      if (data.result && data.result.exceptionDetails) reject(new Error("CDP evaluation failed"));
      else resolve(data.result && data.result.result ? data.result.result.value : undefined);
    });
    ws.addEventListener("error", () => {
      clearTimeout(timer);
      reject(new Error("CDP websocket error"));
    });
  });
}

function waitForChrome(port) {
  return new Promise((resolve, reject) => {
    const end = Date.now() + 6000;
    const tick = () => {
      requestJson(port, "GET", "/json/version")
        .then(() => resolve())
        .catch(() => {
          if (Date.now() > end) reject(new Error("Chrome did not start"));
          else setTimeout(tick, 150);
        });
    };
    tick();
  });
}

(async () => {
  const port = 9223;
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "yijie-smoke-"));
  const chromeProcess = spawn(chrome, [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--remote-debugging-port=" + port,
    "--user-data-dir=" + profile,
    "about:blank",
  ], { stdio: "ignore" });
  try {
    await waitForChrome(port);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const pages = [
      {
        url: `${base}/index.html`,
        expression: "document.title.includes('一介凡人')",
        expected: true,
      },
      { url: `${base}/stats.html`, expression: "!!document.getElementById('statsLogin')", expected: true },
      { url: `${base}/play.html`, expression: "document.title.includes('一介凡人')", expected: true },
    ];
    for (const page of pages) {
      const target = await requestJson(port, "PUT", "/json/new?" + encodeURIComponent(page.url));
      await new Promise((resolve) => setTimeout(resolve, 800));
      const value = await cdpValue(target.webSocketDebuggerUrl, page.expression);
      if (value !== page.expected) throw new Error(`${page.url} returned ${value}`);
    }
    console.log(`browser-smoke: ${pages.length} pages ok`);
  } catch (err) {
    console.error(`browser-smoke: ${err.message}`);
    process.exitCode = 1;
  } finally {
    chromeProcess.kill();
    server.close();
    try {
      fs.rmSync(profile, { recursive: true, force: true });
    } catch (err) {}
  }
})();
