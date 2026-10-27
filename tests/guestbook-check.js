const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const root = path.join(__dirname, "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "yijie-guestbook-"));
const port = 8781;
const python = process.env.PYTHON || "python";
let child;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(pathname, options) {
  return fetch(`http://127.0.0.1:${port}${pathname}`, options);
}

async function waitReady() {
  for (let i = 0; i < 50; i += 1) {
    try {
      const res = await request("/api/hall");
      if (res.ok) return;
    } catch (err) {}
    await sleep(100);
  }
  throw new Error("server did not start");
}

async function postMessage(text, headers = {}, body) {
  return request("/api/guestbook", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: body || JSON.stringify({ text }),
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

  let res = await request("/api/guestbook");
  if (!res.ok) throw new Error("empty guestbook should be readable");
  let data = await res.json();
  if (data.messages.length !== 0) throw new Error("guestbook should start empty");

  // Honeypot and invalid content type must not consume the valid-post budget.
  res = await postMessage("", { "Content-Type": "text/plain" }, JSON.stringify({ text: "honeypot" }));
  if (res.status !== 415) throw new Error(`text/plain should be rejected, got ${res.status}`);
  res = await postMessage("", {}, JSON.stringify({ website: "bot", text: "honeypot" }));
  if (res.status !== 400) throw new Error("honeypot should be rejected");

  res = await postMessage("第一条");
  if (res.status !== 201) throw new Error(`expected first post 201, got ${res.status}`);
  const first = (await res.json()).message;
  if (!first || first.text !== "第一条") throw new Error("first message mismatch");
  if ("ip_hash" in first || "ipHash" in first) throw new Error("public response leaks ip hash");

  res = await postMessage("第二条");
  if (res.status !== 201) throw new Error(`expected second post 201, got ${res.status}`);

  res = await postMessage("第三条");
  if (res.status !== 429) throw new Error("third post should be rate limited");

  res = await request("/api/guestbook");
  data = await res.json();
  if (data.messages.length !== 2) throw new Error(`expected two messages, got ${data.messages.length}`);

  res = await postMessage("x".repeat(201));
  if (res.status !== 400) throw new Error("201-character message should be rejected");

  res = await request("/api/guestbook", {
    method: "OPTIONS",
    headers: { Origin: "https://wang1375830242.github.io" },
  });
  if (res.status !== 204) throw new Error(`OPTIONS should return 204, got ${res.status}`);
  if (res.headers.get("access-control-allow-origin") !== "https://wang1375830242.github.io") {
    throw new Error("CORS allow-origin missing");
  }

  for (const protectedPath of ["/SERVER.PY", "/DATA/guestbook.db", "/data/guestbook.db"]) {
    res = await request(protectedPath);
    if (res.status !== 404) throw new Error(`${protectedPath} should be blocked`);
  }

  console.log("guestbook-check: ok");
}

run()
  .catch((err) => {
    console.error(`guestbook-check: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (child) child.kill();
    await sleep(200);
    fs.rmSync(temp, { recursive: true, force: true });
  });
