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
console.log(`syntax-check: ${files.length} js files ok`);
