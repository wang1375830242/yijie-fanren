const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const files = fs
  .readdirSync(path.join(root, "js"))
  .filter((name) => name.endsWith(".js"))
  .sort();

for (const name of files) {
  const file = path.join(root, "js", name);
  const source = fs.readFileSync(file, "utf8");
  try {
    new vm.Script(source, { filename: file });
  } catch (err) {
    console.error(`syntax-check: ${name}: ${err.message}`);
    process.exit(1);
  }
}
const cloudFile = path.join(root, "cloud-engine", "cloud.js");
try {
  new vm.Script(fs.readFileSync(cloudFile, "utf8"), { filename: cloudFile });
} catch (err) {
  console.error(`syntax-check: cloud-engine/cloud.js: ${err.message}`);
  process.exit(1);
}
console.log(`syntax-check: ${files.length + 1} js files ok`);
