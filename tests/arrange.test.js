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

const state = api.createState({ gaps: 10 });
const workspace = api.ensureWorkspace(state, "screen-1", 0);
const left = api.createColumn(state, ["a", "b"], { width: 100, widthFixed: true });
const right = api.createColumn(state, ["c"], { width: 100, widthFixed: true });
left.heightWeights = { a: 1, b: 3 };
workspace.columns.push(left, right);
workspace.scrollOffset = 20;

assert.deepEqual(plain(api.projectArrangeScope(state, {
  outputId: "screen-1",
  workspaceIndex: 0,
  area: { x: 5, y: 7, width: 250, height: 210 }
}).frames), [
  { windowId: "a", frameGeometry: { x: -15, y: 7, width: 100, height: 50 } },
  { windowId: "b", frameGeometry: { x: -15, y: 67, width: 100, height: 150 } },
  { windowId: "c", frameGeometry: { x: 95, y: 7, width: 100, height: 210 } }
]);

right.tabbed = true;
right.windows.push("d");
assert.deepEqual(plain(api.projectArrangeScope(state, {
  outputId: "screen-1",
  workspaceIndex: 0,
  area: { x: 0, y: 0, width: 250, height: 100 },
  gap: 5
}).frames.slice(2)), [
  { windowId: "c", frameGeometry: { x: 85, y: 0, width: 100, height: 100 } },
  { windowId: "d", frameGeometry: { x: 85, y: 0, width: 100, height: 100 } }
]);
