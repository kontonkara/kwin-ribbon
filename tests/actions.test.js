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
const mutationActionNames = [
  "kwin-ribbon-consume-or-expel-left",
  "kwin-ribbon-consume-or-expel-right",
  "kwin-ribbon-consume-into-column-left",
  "kwin-ribbon-consume-into-column-right",
  "kwin-ribbon-expel-from-column-left",
  "kwin-ribbon-expel-from-column-right",
  "kwin-ribbon-swap-window-left",
  "kwin-ribbon-swap-window-right"
];
const heightActionNames = [
  "kwin-ribbon-next-window-height",
  "kwin-ribbon-previous-window-height",
  "kwin-ribbon-reset-window-height",
  "kwin-ribbon-reset-column-heights"
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
assert.equal(specs.some((spec) => spec.name === "kwin-ribbon-close-window" && spec.title === "KWin Ribbon: Close Window"), true);
assert.equal(specs.some((spec) => spec.name === "kwin-ribbon-center-column"), true);
assert.equal(edgeActionNames.every((name) => specs.some((spec) => spec.name === name)), true);
assert.equal(mutationActionNames.every((name) => specs.some((spec) => spec.name === name)), true);
assert.equal(heightActionNames.every((name) => specs.some((spec) => spec.name === name)), true);
assert.equal(developmentSpecs.some((spec) => spec.name === "kwin-ribbon-focus-column-left" && spec.shortcut === "Meta+Alt+H"), true);
assert.equal(developmentSpecs.some((spec) => spec.name === "kwin-ribbon-close-window" && spec.shortcut === "Meta+Q"), true);
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

const mutationScope = { outputId: "screen-1", workspaceIndex: 0 };
const consumeOrExpelState = api.createState();
api.addWindow(consumeOrExpelState, "screen-1", 0, "one");
api.addWindow(consumeOrExpelState, "screen-1", 0, "two");
api.addWindow(consumeOrExpelState, "screen-1", 0, "three");
api.dispatchRibbonAction(consumeOrExpelState, "kwin-ribbon-consume-or-expel-left", mutationScope);
assert.deepEqual(plain(api.getWorkspace(consumeOrExpelState, "screen-1", 0).columns.map((column) => column.windows)), [
  ["one"],
  ["two", "three"]
]);
api.dispatchRibbonAction(consumeOrExpelState, "kwin-ribbon-consume-or-expel-left", mutationScope);
assert.deepEqual(plain(api.getWorkspace(consumeOrExpelState, "screen-1", 0).columns.map((column) => column.windows)), [
  ["one"],
  ["three"],
  ["two"]
]);

const consumeOrExpelRightState = api.createState();
api.addWindow(consumeOrExpelRightState, "screen-1", 0, "one");
api.addWindow(consumeOrExpelRightState, "screen-1", 0, "two");
api.addWindow(consumeOrExpelRightState, "screen-1", 0, "three");
api.focusColumnByIndex(consumeOrExpelRightState, "screen-1", 0, 1);
api.dispatchRibbonAction(consumeOrExpelRightState, "kwin-ribbon-consume-or-expel-right", mutationScope);
assert.deepEqual(plain(api.getWorkspace(consumeOrExpelRightState, "screen-1", 0).columns.map((column) => column.windows)), [
  ["one", "two"],
  ["three"]
]);

const consumeIntoState = api.createState();
api.addWindow(consumeIntoState, "screen-1", 0, "a");
api.addWindow(consumeIntoState, "screen-1", 0, "b");
api.addWindow(consumeIntoState, "screen-1", 0, "c");
api.focusColumnByIndex(consumeIntoState, "screen-1", 0, 2);
api.dispatchRibbonAction(consumeIntoState, "kwin-ribbon-consume-into-column-right", mutationScope);
assert.deepEqual(plain(api.getWorkspace(consumeIntoState, "screen-1", 0).columns.map((column) => column.windows)), [
  ["a"],
  ["b", "c"]
]);
api.dispatchRibbonAction(consumeIntoState, "kwin-ribbon-consume-into-column-left", mutationScope);
assert.deepEqual(plain(api.getWorkspace(consumeIntoState, "screen-1", 0).columns.map((column) => column.windows)), [["b", "c", "a"]]);

const expelLeftState = api.createState();
const expelLeftWorkspace = api.ensureWorkspace(expelLeftState, "screen-1", 0);
const expelLeftColumn = api.createColumn(expelLeftState, ["a", "b", "c"]);
expelLeftWorkspace.columns.push(expelLeftColumn);
expelLeftState.windowIndex.a = api.createLocation("screen-1", 0, 0, 0);
expelLeftState.windowIndex.b = api.createLocation("screen-1", 0, 0, 1);
expelLeftState.windowIndex.c = api.createLocation("screen-1", 0, 0, 2);
api.focusWindowByIndex(expelLeftState, "screen-1", 0, 2);
api.dispatchRibbonAction(expelLeftState, "kwin-ribbon-expel-from-column-left", mutationScope);
assert.deepEqual(plain(expelLeftWorkspace.columns.map((column) => column.windows)), [
  ["b"],
  ["a", "c"]
]);

const expelRightState = api.createState();
const expelRightWorkspace = api.ensureWorkspace(expelRightState, "screen-1", 0);
const expelRightColumn = api.createColumn(expelRightState, ["a", "b", "c"]);
expelRightWorkspace.columns.push(expelRightColumn);
expelRightState.windowIndex.a = api.createLocation("screen-1", 0, 0, 0);
expelRightState.windowIndex.b = api.createLocation("screen-1", 0, 0, 1);
expelRightState.windowIndex.c = api.createLocation("screen-1", 0, 0, 2);
api.focusWindowByIndex(expelRightState, "screen-1", 0, 2);
api.dispatchRibbonAction(expelRightState, "kwin-ribbon-expel-from-column-right", mutationScope);
assert.deepEqual(plain(expelRightWorkspace.columns.map((column) => column.windows)), [
  ["a", "c"],
  ["b"]
]);

const swapState = api.createState();
api.addWindow(swapState, "screen-1", 0, "one");
api.addWindow(swapState, "screen-1", 0, "two");
api.addWindow(swapState, "screen-1", 0, "three");
api.focusColumnByIndex(swapState, "screen-1", 0, 2);
api.dispatchRibbonAction(swapState, "kwin-ribbon-swap-window-left", mutationScope);
assert.deepEqual(plain(api.getWorkspace(swapState, "screen-1", 0).columns.map((column) => column.windows)), [
  ["two"],
  ["one"],
  ["three"]
]);
api.dispatchRibbonAction(swapState, "kwin-ribbon-swap-window-right", mutationScope);
assert.deepEqual(plain(api.getWorkspace(swapState, "screen-1", 0).columns.map((column) => column.windows)), [
  ["one"],
  ["two"],
  ["three"]
]);

const heightActionState = api.createState({ presetWindowHeights: [0.25, 0.5, 0.75] });
const heightActionWorkspace = api.ensureWorkspace(heightActionState, "screen-1", 0);
const heightActionColumn = api.createColumn(heightActionState, ["top", "middle", "bottom"]);
heightActionWorkspace.columns.push(heightActionColumn);
heightActionState.windowIndex.top = api.createLocation("screen-1", 0, 0, 0);
heightActionState.windowIndex.middle = api.createLocation("screen-1", 0, 0, 1);
heightActionState.windowIndex.bottom = api.createLocation("screen-1", 0, 0, 2);
api.focusWindowByIndex(heightActionState, "screen-1", 0, 2);
api.setWindowHeight(heightActionState, "screen-1", 0, 0.5);
api.dispatchRibbonAction(heightActionState, "kwin-ribbon-next-window-height", mutationScope);
assert.deepEqual(plain(heightActionColumn.heightWeights), { middle: 0.75 });
api.dispatchRibbonAction(heightActionState, "kwin-ribbon-previous-window-height", mutationScope);
assert.deepEqual(plain(heightActionColumn.heightWeights), { middle: 0.5 });
api.dispatchRibbonAction(heightActionState, "kwin-ribbon-reset-window-height", mutationScope);
assert.deepEqual(plain(heightActionColumn.heightWeights), {});
api.setWindowHeight(heightActionState, "screen-1", 0, 0.25);
api.focusWindowByIndex(heightActionState, "screen-1", 0, 3);
api.setWindowHeight(heightActionState, "screen-1", 0, 0.75);
api.dispatchRibbonAction(heightActionState, "kwin-ribbon-reset-column-heights", mutationScope);
assert.deepEqual(plain(heightActionColumn.heightWeights), {});

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
assert.equal(api.dispatchRibbonAction(state, "kwin-ribbon-close-window", { outputId: "screen-1", workspaceIndex: 0 }), true);
