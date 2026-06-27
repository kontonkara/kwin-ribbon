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
const developmentSpecs = api.getRibbonActionSpecs({ enableDefaultDevelopmentShortcuts: true });
const edgeActionNames = [
  "kwin-ribbon-focus-column-first",
  "kwin-ribbon-focus-column-last",
  "kwin-ribbon-move-column-first",
  "kwin-ribbon-move-column-last",
  "kwin-ribbon-focus-window-top",
  "kwin-ribbon-focus-window-bottom",
  "kwin-ribbon-move-window-top",
  "kwin-ribbon-move-window-bottom"
];

assert.equal(specs.length > 0, true);
assert.equal(specs.every((spec) => spec.shortcut === ""), true);
assert.equal(specs.every((spec) => spec.name.indexOf("interactive") < 0), true);
assert.equal(specs.some((spec) => spec.name === "kwin-ribbon-focus-column-left" && spec.title === "KWin Ribbon: Focus Column Left"), true);
assert.equal(specs.some((spec) => spec.name === "kwin-ribbon-next-column-width"), true);
assert.equal(specs.some((spec) => spec.name === "kwin-ribbon-previous-column-width"), true);
assert.equal(specs.some((spec) => spec.name === "kwin-ribbon-maximize-column"), true);
assert.equal(specs.some((spec) => spec.name === "kwin-ribbon-fullscreen-window"), true);
assert.equal(specs.some((spec) => spec.name === "kwin-ribbon-toggle-floating"), true);
assert.equal(specs.some((spec) => spec.name === "kwin-ribbon-center-column"), true);
assert.equal(edgeActionNames.every((name) => specs.some((spec) => spec.name === name)), true);
assert.equal(developmentSpecs.some((spec) => spec.name === "kwin-ribbon-focus-column-left" && spec.shortcut === "Meta+Alt+H"), true);
assert.equal(developmentSpecs.some((spec) => spec.shortcut.length > 0), true);

const edgeState = api.createState();
api.addWindow(edgeState, "screen-1", 0, "one");
api.addWindow(edgeState, "screen-1", 0, "two");
api.addWindow(edgeState, "screen-1", 0, "three");

assert.equal(api.dispatchRibbonAction(edgeState, "kwin-ribbon-focus-column-first", { outputId: "screen-1", workspaceIndex: 0 }).columnIndex, 0);
assert.equal(api.dispatchRibbonAction(edgeState, "kwin-ribbon-focus-column-last", { outputId: "screen-1", workspaceIndex: 0 }).columnIndex, 2);
api.dispatchRibbonAction(edgeState, "kwin-ribbon-focus-column-first", { outputId: "screen-1", workspaceIndex: 0 });
api.dispatchRibbonAction(edgeState, "kwin-ribbon-move-column-last", { outputId: "screen-1", workspaceIndex: 0 });
assert.deepEqual(plain(api.getWorkspace(edgeState, "screen-1", 0).columns.map((column) => column.windows)), [
  ["two"],
  ["three"],
  ["one"]
]);
api.dispatchRibbonAction(edgeState, "kwin-ribbon-move-column-first", { outputId: "screen-1", workspaceIndex: 0 });
assert.deepEqual(plain(api.getWorkspace(edgeState, "screen-1", 0).columns.map((column) => column.windows)), [
  ["one"],
  ["two"],
  ["three"]
]);

const edgeStackState = api.createState();
const edgeStackWorkspace = api.ensureWorkspace(edgeStackState, "screen-1", 0);
const edgeStackColumn = api.createColumn(edgeStackState, ["top", "middle", "bottom"]);
edgeStackWorkspace.columns.push(edgeStackColumn);
edgeStackState.windowIndex.top = api.createLocation("screen-1", 0, 0, 0);
edgeStackState.windowIndex.middle = api.createLocation("screen-1", 0, 0, 1);
edgeStackState.windowIndex.bottom = api.createLocation("screen-1", 0, 0, 2);

assert.equal(api.dispatchRibbonAction(edgeStackState, "kwin-ribbon-focus-window-bottom", { outputId: "screen-1", workspaceIndex: 0 }).windowIndex, 2);
assert.equal(api.dispatchRibbonAction(edgeStackState, "kwin-ribbon-focus-window-top", { outputId: "screen-1", workspaceIndex: 0 }).windowIndex, 0);
api.focusWindowByIndex(edgeStackState, "screen-1", 0, 2);
api.dispatchRibbonAction(edgeStackState, "kwin-ribbon-move-window-bottom", { outputId: "screen-1", workspaceIndex: 0 });
assert.deepEqual(plain(edgeStackColumn.windows), ["top", "bottom", "middle"]);
api.dispatchRibbonAction(edgeStackState, "kwin-ribbon-move-window-top", { outputId: "screen-1", workspaceIndex: 0 });
assert.deepEqual(plain(edgeStackColumn.windows), ["middle", "top", "bottom"]);

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

api.dispatchRibbonAction(state, "kwin-ribbon-maximize-column", { outputId: "screen-1", workspaceIndex: 0 });
assert.equal(api.getWorkspace(state, "screen-1", 0).columns[0].fullWidth, true);

api.dispatchRibbonAction(state, "kwin-ribbon-center-column", {
  outputId: "screen-1",
  workspaceIndex: 0,
  area: { width: 300, height: 100 }
});
assert.equal(api.getWorkspace(state, "screen-1", 0).scrollOffset, 0);

api.dispatchRibbonAction(state, "kwin-ribbon-next-column-width", { outputId: "screen-1", workspaceIndex: 0 });
assert.equal(api.getWorkspace(state, "screen-1", 0).columns[0].presetWidthIndex, 0);
api.dispatchRibbonAction(state, "kwin-ribbon-previous-column-width", { outputId: "screen-1", workspaceIndex: 0 });
assert.equal(api.getWorkspace(state, "screen-1", 0).columns[0].presetWidthIndex, 2);

api.dispatchRibbonAction(state, "kwin-ribbon-fullscreen-window", { outputId: "screen-1", workspaceIndex: 0 });
assert.equal(state.fullscreen.one, true);
assert.equal(state.windowIndex.one, undefined);

api.dispatchRibbonAction(state, "kwin-ribbon-toggle-floating", { outputId: "screen-1", workspaceIndex: 0 });
assert.equal(state.floating.two, true);
