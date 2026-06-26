#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const outputFile = path.join(root, "contents", "code", "main.js");
const sourceFiles = [
  path.join(root, "src", "runtime", "header.js"),
  path.join(root, "src", "runtime", "core.js"),
  path.join(root, "src", "runtime", "classification.js"),
  path.join(root, "src", "runtime", "arrange.js"),
  path.join(root, "src", "runtime", "actions.js"),
  path.join(root, "src", "runtime", "kwin-adapter.js"),
  path.join(root, "src", "runtime", "bootstrap.js"),
  path.join(root, "src", "runtime", "footer.js")
];

const expected = sourceFiles
  .map((file) => fs.readFileSync(file, "utf8").trimEnd())
  .join("\n\n") + "\n";

if (process.argv.includes("--check")) {
  const actual = fs.existsSync(outputFile) ? fs.readFileSync(outputFile, "utf8") : "";
  if (actual !== expected) {
    console.error("contents/code/main.js is out of date; run npm run build");
    process.exit(1);
  }
  process.exit(0);
}

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, expected);
