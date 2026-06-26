"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const script = fs.readFileSync(path.join(root, "contents", "code", "main.js"), "utf8");
const sandbox = {};

vm.runInNewContext(script, sandbox, { filename: "contents/code/main.js" });

const api = sandbox.KWinRibbon;

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

const specs = api.getRibbonActionSpecs();

assert.equal(specs.length > 0, true);
assert.equal(specs.every((spec) => spec.shortcut === ""), true);
assert.equal(specs.some((spec) => spec.name === "kwin-ribbon-focus-column-left"), true);

const state = api.createState();
api.addWindow(state, "screen-1", 0, "one");
api.addWindow(state, "screen-1", 0, "two");

assert.deepEqual(plain(api.dispatchRibbonAction(state, "kwin-ribbon-focus-column-left", {
  outputId: "screen-1",
  workspaceIndex: 0
})), {
  outputId: "screen-1",
  workspaceIndex: 0,
  columnIndex: 0,
  windowIndex: 0
});
assert.equal(api.dispatchRibbonAction(state, "unknown-action", { outputId: "screen-1" }), null);
