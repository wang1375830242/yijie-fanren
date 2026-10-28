const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");

const root = path.join(__dirname, "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "yijie-security-"));
const port = 8782;
const python = process.env.PYTHON || "python";
let child;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestRaw(pathname, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        method: options.method || "GET",
        path: pathname,
        headers: options.headers || {},
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body }));
      }
    );
    req.on("error", reject);
    if (options.body) {
      req.setHeader("Content-Length", Buffer.byteLength(options.body));
      req.write(options.body);
    }
    req.end();
  });
}

async function waitReady() {
  for (let i = 0; i < 50; i += 1) {
    try {
      const res = await requestRaw("/api/hall");
      if (res.status === 200) return;
    } catch (err) {}
    await sleep(100);
  }
  throw new Error("server did not start");
}

async function post(pathname, body, headers = {}) {
  return requestRaw(pathname, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

async function run() {
  child = spawn(python, ["server.py", "--port", String(port)], {
    cwd: root,
    env: { ...process.env, YIJIE_DATA_DIR: temp },
    stdio: "ignore",
    windowsHide: true,
  });
  await waitReady();

  // Candle/message writes must obey the same origin and JSON rules as guestbook.
  let res = await post("/api/candle", { id: "test-stele" }, { "Content-Type": "text/plain", Origin: "https://evil.example" });
  if (res.status !== 415) throw new Error(`candle text/plain should be 415, got ${res.status}`);
  res = await post("/api/candle", { id: "test-stele" }, { Origin: "https://evil.example" });
  if (res.status !== 403) throw new Error(`candle evil origin should be 403, got ${res.status}`);
  res = await post("/api/candle", { id: "test-stele" });
  if (res.status !== 200) throw new Error(`candle valid post should be 200, got ${res.status}`);

  res = await post("/api/message", { id: "test-stele", text: "hello" }, { "Content-Type": "text/plain", Origin: "https://evil.example" });
  if (res.status !== 415) throw new Error(`message text/plain should be 415, got ${res.status}`);
  res = await post("/api/message", { id: "test-stele", text: "hello" }, { Origin: "https://evil.example" });
  if (res.status !== 403) throw new Error(`message evil origin should be 403, got ${res.status}`);
  res = await post("/api/message", { id: "test-stele", text: "hello" });
  if (res.status !== 200) throw new Error(`message valid post should be 200, got ${res.status}`);

  // Static path hardening: NUL and backslash traversal.
  res = await requestRaw("/css/base%00.css");
  if (res.status === 200) throw new Error("NUL path should not return 200");
  res = await requestRaw("/js/foo%5c..%5c..%5cdata%5chall.json");
  if (res.status === 200) throw new Error("backslash traversal should not return 200");
  res = await requestRaw("/data/hall.json");
  if (res.status !== 404) throw new Error(`/data should remain blocked, got ${res.status}`);

  // XFF: rightmost hop is the trusted proxy-appended client. Varying the
  // leftmost spoofed hop must not create fresh rate-limit buckets.
  const form = JSON.stringify({ text: "xff-check" });
  for (let i = 0; i < 2; i += 1) {
    res = await requestRaw("/api/guestbook", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": `10.0.0.${i + 1}, 9.9.9.9` },
      body: form,
    });
    if (res.status !== 201) throw new Error(`XFF valid post ${i + 1} should be 201, got ${res.status}`);
  }
  res = await requestRaw("/api/guestbook", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": "10.0.0.99, 9.9.9.9" },
    body: form,
  });
  if (res.status !== 429) throw new Error(`same rightmost XFF should be rate limited, got ${res.status}`);

  console.log("server-security-check: ok");
}

run()
  .catch((err) => {
    console.error(`server-security-check: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (child) child.kill();
    await sleep(200);
    fs.rmSync(temp, { recursive: true, force: true });
  });
