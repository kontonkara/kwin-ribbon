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
assert.equal(specs.every((spec) => typeof spec.shortcut === "string" && spec.shortcut.length > 0), true);
assert.equal(specs.every((spec) => spec.name.startsWith("kwin-ribbon-interactive-")), true);
assert.equal(specs.some((spec) => spec.name === "kwin-ribbon-interactive-focus-column-left"), true);
assert.equal(specs.some((spec) => spec.name === "kwin-ribbon-interactive-next-column-width"), true);
assert.equal(specs.some((spec) => spec.name === "kwin-ribbon-interactive-previous-column-width"), true);
assert.equal(specs.some((spec) => spec.name === "kwin-ribbon-interactive-maximize-column"), true);
assert.equal(specs.some((spec) => spec.name === "kwin-ribbon-interactive-fullscreen-window"), true);
assert.equal(specs.some((spec) => spec.name === "kwin-ribbon-interactive-toggle-floating"), true);
assert.equal(specs.some((spec) => spec.name === "kwin-ribbon-interactive-center-column"), true);

const state = api.createState();
api.addWindow(state, "screen-1", 0, "one");
api.addWindow(state, "screen-1", 0, "two");

assert.deepEqual(plain(api.dispatchRibbonAction(state, "kwin-ribbon-interactive-focus-column-left", {
  outputId: "screen-1",
  workspaceIndex: 0
})), {
  outputId: "screen-1",
  workspaceIndex: 0,
  columnIndex: 0,
  windowIndex: 0
});
assert.equal(api.dispatchRibbonAction(state, "unknown-action", { outputId: "screen-1" }), null);

api.dispatchRibbonAction(state, "kwin-ribbon-interactive-maximize-column", { outputId: "screen-1", workspaceIndex: 0 });
assert.equal(api.getWorkspace(state, "screen-1", 0).columns[0].fullWidth, true);

api.dispatchRibbonAction(state, "kwin-ribbon-interactive-center-column", {
  outputId: "screen-1",
  workspaceIndex: 0,
  area: { width: 300, height: 100 }
});
assert.equal(api.getWorkspace(state, "screen-1", 0).scrollOffset, 0);

api.dispatchRibbonAction(state, "kwin-ribbon-interactive-next-column-width", { outputId: "screen-1", workspaceIndex: 0 });
assert.equal(api.getWorkspace(state, "screen-1", 0).columns[0].presetWidthIndex, 0);
api.dispatchRibbonAction(state, "kwin-ribbon-interactive-previous-column-width", { outputId: "screen-1", workspaceIndex: 0 });
assert.equal(api.getWorkspace(state, "screen-1", 0).columns[0].presetWidthIndex, 2);

api.dispatchRibbonAction(state, "kwin-ribbon-interactive-fullscreen-window", { outputId: "screen-1", workspaceIndex: 0 });
assert.equal(state.fullscreen.one, true);
assert.equal(state.windowIndex.one, undefined);

api.dispatchRibbonAction(state, "kwin-ribbon-interactive-toggle-floating", { outputId: "screen-1", workspaceIndex: 0 });
assert.equal(state.floating.two, true);
