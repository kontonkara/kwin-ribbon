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

assert.equal(api.version, "0.1.0");
assert.deepEqual(plain(api.copyOptions({
  gaps: -4,
  presetColumnWidths: "0.25,2,nope",
  presetWindowHeights: [0.2],
  defaultColumnWidth: "0.5",
  defaultColumnDisplay: "tabbed",
  centerFocusedColumn: "always",
  alwaysCenterSingleColumn: true,
  tileNewWindows: false,
  enableWindowManagementShortcuts: false,
  debugLogging: true
})), {
  gaps: 0,
  presetColumnWidths: [0.25, 1.5, 1],
  presetWindowHeights: [0.2],
  defaultColumnWidth: 0.5,
  defaultColumnDisplay: "tabbed",
  centerFocusedColumn: "always",
  alwaysCenterSingleColumn: true,
  tileNewWindows: false,
  enableWindowManagementShortcuts: false,
  debugLogging: true
});

assert.deepEqual(plain(api.createState({ centerFocusedColumn: "invalid" })), {
  options: {
    gaps: 16,
    presetColumnWidths: [1 / 3, 1 / 2, 2 / 3],
    presetWindowHeights: [1 / 3, 1 / 2, 2 / 3],
    defaultColumnWidth: 1,
    defaultColumnDisplay: "normal",
    centerFocusedColumn: "never",
    alwaysCenterSingleColumn: false,
    tileNewWindows: true,
    enableWindowManagementShortcuts: true,
    debugLogging: false
  },
  outputs: {},
  windowIndex: {},
  parked: {},
  floating: {},
  manualFloating: {},
  manualTiled: {},
  ruleFloating: {},
  fullscreen: {},
  lastTiledWindowId: null,
  lastFloatingWindowId: null,
  previousTiledWindowId: null,
  nextColumnId: 1,
  nextWorkspaceId: 1
});

const state = api.createState({ defaultColumnDisplay: "tabbed", defaultColumnWidth: 0.4 });
const output = api.ensureOutput(state, "HDMI-A-1");

assert.deepEqual(plain(output), {
  id: "HDMI-A-1",
  currentWorkspaceIndex: 0,
  previousWorkspaceId: null,
  workspaceRenderIndex: 0,
  workspaces: [{
    id: "workspace-1",
    name: null,
    columns: [],
    focusColumn: 0,
    prevFocusColumn: -1,
    prevColumnOnRemoval: -1,
    scrollOffset: 0
  }]
});
assert.equal(api.ensureOutput(state, "HDMI-A-1"), output);

const thirdWorkspace = api.ensureWorkspace(state, "HDMI-A-1", 2);
assert.equal(thirdWorkspace.id, "workspace-3");
assert.equal(output.workspaces.length, 3);
assert.equal(api.getWorkspace(state, "HDMI-A-1"), output.workspaces[0]);

assert.deepEqual(plain(api.createColumn(state, ["win-1", "win-1", "win-2"])), {
  id: "column-1",
  width: 0.4,
  widthFixed: false,
  fullWidth: false,
  restoreWidth: null,
  restoreWidthFixed: null,
  windows: ["win-1", "win-2"],
  focusWindow: 0,
  presetWidthIndex: -1,
  tabbed: true,
  heightWeights: {}
});

assert.deepEqual(plain(api.createColumn(state, "win-3", {
  width: 2,
  widthFixed: true,
  fullWidth: true,
  display: "normal"
})), {
  id: "column-2",
  width: 2,
  widthFixed: true,
  fullWidth: true,
  restoreWidth: null,
  restoreWidthFixed: null,
  windows: ["win-3"],
  focusWindow: 0,
  presetWidthIndex: -1,
  tabbed: false,
  heightWeights: {}
});

assert.deepEqual(plain(api.createLocation("HDMI-A-1", "2", "4", "1")), {
  outputId: "HDMI-A-1",
  workspaceIndex: 2,
  columnIndex: 4,
  windowIndex: 1
});

const windows = api.createState({ defaultColumnWidth: 0.5 });

assert.deepEqual(plain(api.addWindow(windows, "screen-1", 0, "alpha", { width: 0.25 })), {
  outputId: "screen-1",
  workspaceIndex: 0,
  columnIndex: 0,
  windowIndex: 0
});
api.addWindow(windows, "screen-1", 0, "beta", { width: 0.75 });
api.addWindow(windows, "screen-1", 0, "gamma");
api.addWindow(windows, "screen-1", 0, "beta");

const windowWorkspace = api.getWorkspace(windows, "screen-1", 0);

assert.deepEqual(plain(windowWorkspace.columns.map((column) => column.windows)), [
  ["alpha"],
  ["beta"],
  ["gamma"]
]);
assert.deepEqual(plain(windowWorkspace.columns.map((column) => column.width)), [0.25, 0.75, 0.5]);
assert.equal(windowWorkspace.focusColumn, 2);
assert.equal(windowWorkspace.prevColumnOnRemoval, 1);
assert.equal(windows.lastTiledWindowId, "gamma");
assert.equal(windows.previousTiledWindowId, "beta");

api.removeWindow(windows, "gamma");

assert.deepEqual(plain(windowWorkspace.columns.map((column) => column.windows)), [
  ["alpha"],
  ["beta"]
]);
assert.equal(windowWorkspace.focusColumn, 1);
assert.equal(windowWorkspace.prevColumnOnRemoval, -1);
assert.equal(windows.lastTiledWindowId, "beta");
assert.equal(windows.previousTiledWindowId, "gamma");
assert.equal(windows.windowIndex.gamma, undefined);

assert.deepEqual(plain(api.parkWindow(windows, "beta", "minimized")), {
  reason: "minimized",
  outputId: "screen-1",
  workspaceIndex: 0,
  columnIndex: 1,
  windowIndex: 0,
  column: {
    id: "column-2",
    width: 0.75,
    widthFixed: false,
    fullWidth: false,
    restoreWidth: null,
    restoreWidthFixed: null,
    windows: ["beta"],
    focusWindow: 0,
    presetWidthIndex: -1,
    tabbed: false,
    heightWeights: {}
  }
});
assert.deepEqual(plain(windowWorkspace.columns.map((column) => column.windows)), [["alpha"]]);
assert.equal(windows.windowIndex.beta, undefined);
assert.equal(windowWorkspace.focusColumn, 0);

assert.deepEqual(plain(api.restoreWindow(windows, "beta")), {
  outputId: "screen-1",
  workspaceIndex: 0,
  columnIndex: 1,
  windowIndex: 0
});
assert.deepEqual(plain(windowWorkspace.columns.map((column) => column.windows)), [
  ["alpha"],
  ["beta"]
]);
assert.equal(windowWorkspace.columns[1].id, "column-2");
assert.equal(windowWorkspace.focusColumn, 1);
assert.equal(windows.parked.beta, undefined);
assert.equal(windows.lastTiledWindowId, "beta");

const columns = api.createState();
api.addWindow(columns, "screen-1", 0, "one");
api.addWindow(columns, "screen-1", 0, "two");
api.addWindow(columns, "screen-1", 0, "three");

const columnWorkspace = api.getWorkspace(columns, "screen-1", 0);

assert.deepEqual(plain(api.focusColumnLeft(columns, "screen-1", 0)), {
  outputId: "screen-1",
  workspaceIndex: 0,
  columnIndex: 1,
  windowIndex: 0
});
assert.deepEqual(plain(columnWorkspace.columns.map((column) => column.windows)), [
  ["one"],
  ["two"],
  ["three"]
]);
assert.equal(columnWorkspace.prevColumnOnRemoval, -1);
assert.equal(columns.lastTiledWindowId, "two");

api.focusColumnRight(columns, "screen-1", 0);
api.focusFirstColumn(columns, "screen-1", 0);
assert.equal(columns.lastTiledWindowId, "one");
api.focusLastColumn(columns, "screen-1", 0);
assert.equal(columns.lastTiledWindowId, "three");
api.focusColumnByIndex(columns, "screen-1", 0, 2);
assert.equal(columns.lastTiledWindowId, "two");

assert.deepEqual(plain(api.moveColumnLeft(columns, "screen-1", 0)), {
  outputId: "screen-1",
  workspaceIndex: 0,
  columnIndex: 0,
  windowIndex: 0
});
assert.deepEqual(plain(columnWorkspace.columns.map((column) => column.windows)), [
  ["two"],
  ["one"],
  ["three"]
]);
assert.equal(columnWorkspace.focusColumn, 0);

api.moveColumnLast(columns, "screen-1", 0);
assert.deepEqual(plain(columnWorkspace.columns.map((column) => column.windows)), [
  ["one"],
  ["three"],
  ["two"]
]);
assert.equal(columnWorkspace.focusColumn, 2);
assert.deepEqual(plain(columns.windowIndex.two), {
  outputId: "screen-1",
  workspaceIndex: 0,
  columnIndex: 2,
  windowIndex: 0
});

api.moveColumnByIndex(columns, "screen-1", 0, 1);
assert.deepEqual(plain(columnWorkspace.columns.map((column) => column.windows)), [
  ["two"],
  ["one"],
  ["three"]
]);
assert.equal(columnWorkspace.focusColumn, 0);
const previousColumnFocusHint = columnWorkspace.prevFocusColumn;
api.moveColumnLeft(columns, "screen-1", 0);
assert.deepEqual(plain(columnWorkspace.columns.map((column) => column.windows)), [
  ["two"],
  ["one"],
  ["three"]
]);
assert.equal(columnWorkspace.prevFocusColumn, previousColumnFocusHint);

const stack = api.createState();
const stackWorkspace = api.ensureWorkspace(stack, "screen-1", 0);
const stackColumn = api.createColumn(stack, ["top", "middle", "bottom"]);
stackColumn.heightWeights = { top: 1, middle: 2, bottom: 3 };
stackWorkspace.columns.push(stackColumn);
stack.windowIndex.top = api.createLocation("screen-1", 0, 0, 0);
stack.windowIndex.middle = api.createLocation("screen-1", 0, 0, 1);
stack.windowIndex.bottom = api.createLocation("screen-1", 0, 0, 2);

assert.deepEqual(plain(api.focusWindowDown(stack, "screen-1", 0)), {
  outputId: "screen-1",
  workspaceIndex: 0,
  columnIndex: 0,
  windowIndex: 1
});
assert.equal(stack.lastTiledWindowId, "middle");
api.focusWindowByIndex(stack, "screen-1", 0, 3);
assert.equal(stack.lastTiledWindowId, "bottom");
api.focusTopWindow(stack, "screen-1", 0);
assert.equal(stack.lastTiledWindowId, "top");
api.focusBottomWindow(stack, "screen-1", 0);
assert.equal(stack.lastTiledWindowId, "bottom");
api.focusWindowByIndex(stack, "screen-1", 0, 2);

assert.deepEqual(plain(api.moveWindowUp(stack, "screen-1", 0)), {
  outputId: "screen-1",
  workspaceIndex: 0,
  columnIndex: 0,
  windowIndex: 0
});
assert.deepEqual(plain(stackColumn.windows), ["middle", "top", "bottom"]);
assert.deepEqual(plain(stackColumn.heightWeights), { top: 1, middle: 2, bottom: 3 });

api.moveWindowBottom(stack, "screen-1", 0);
assert.deepEqual(plain(stackColumn.windows), ["top", "bottom", "middle"]);
assert.deepEqual(plain(stack.windowIndex.middle), {
  outputId: "screen-1",
  workspaceIndex: 0,
  columnIndex: 0,
  windowIndex: 2
});

api.moveWindowTop(stack, "screen-1", 0);
assert.deepEqual(plain(stackColumn.windows), ["middle", "top", "bottom"]);
assert.equal(stackColumn.focusWindow, 0);
api.moveWindowUp(stack, "screen-1", 0);
assert.deepEqual(plain(stackColumn.windows), ["middle", "top", "bottom"]);
assert.equal(stackColumn.focusWindow, 0);

const emptyWidth = api.createState();
assert.equal(api.setColumnWidth(emptyWidth, "screen-1", 0, 0.5), null);

const widthState = api.createState({
  defaultColumnWidth: 0.4,
  presetColumnWidths: [0.25, 0.5, 0.75]
});
api.addWindow(widthState, "screen-1", 0, "wide");

const widthWorkspace = api.getWorkspace(widthState, "screen-1", 0);
const widthColumn = widthWorkspace.columns[0];

assert.equal(widthColumn.width, 0.4);
assert.equal(widthColumn.presetWidthIndex, -1);

api.setColumnWidth(widthState, "screen-1", 0, 0.5);
assert.equal(widthColumn.width, 0.5);
assert.equal(widthColumn.widthFixed, false);
assert.equal(widthColumn.presetWidthIndex, 1);

api.switchPresetColumnWidth(widthState, "screen-1", 0, 1);
assert.equal(widthColumn.width, 0.75);
assert.equal(widthColumn.presetWidthIndex, 2);
api.switchPresetColumnWidth(widthState, "screen-1", 0, 1);
assert.equal(widthColumn.width, 0.25);
assert.equal(widthColumn.presetWidthIndex, 0);
api.switchPresetColumnWidthBack(widthState, "screen-1", 0);
assert.equal(widthColumn.width, 0.75);
assert.equal(widthColumn.presetWidthIndex, 2);

api.adjustColumnWidth(widthState, "screen-1", 0, -0.15);
assert.equal(widthColumn.width, 0.6);
assert.equal(widthColumn.widthFixed, false);
assert.equal(widthColumn.presetWidthIndex, -1);
api.switchPresetColumnWidth(widthState, "screen-1", 0, 1);
assert.equal(widthColumn.width, 0.75);
assert.equal(widthColumn.presetWidthIndex, 2);

api.setColumnFixedWidth(widthState, "screen-1", 0, 720);
assert.equal(widthColumn.width, 720);
assert.equal(widthColumn.widthFixed, true);
assert.equal(widthColumn.presetWidthIndex, -1);
api.adjustColumnFixedWidth(widthState, "screen-1", 0, -800);
assert.equal(widthColumn.width, 1);
assert.equal(widthColumn.widthFixed, true);

api.toggleColumnFullWidth(widthState, "screen-1", 0);
assert.equal(widthColumn.fullWidth, true);
assert.equal(widthColumn.restoreWidth, 1);
assert.equal(widthColumn.restoreWidthFixed, true);
api.toggleColumnFullWidth(widthState, "screen-1", 0);
assert.equal(widthColumn.fullWidth, false);
assert.equal(widthColumn.width, 1);
assert.equal(widthColumn.widthFixed, true);
assert.equal(widthColumn.restoreWidth, null);
assert.equal(widthColumn.restoreWidthFixed, null);

api.toggleColumnFullWidth(widthState, "screen-1", 0);
api.setColumnWidth(widthState, "screen-1", 0, 0.5);
assert.equal(widthColumn.fullWidth, false);
assert.equal(widthColumn.restoreWidth, null);
assert.equal(widthColumn.restoreWidthFixed, null);
assert.equal(widthColumn.widthFixed, false);
assert.equal(widthColumn.presetWidthIndex, 1);

api.setColumnFixedWidth(widthState, "screen-1", 0, 640);
api.toggleColumnFullWidth(widthState, "screen-1", 0);
api.parkWindow(widthState, "wide", "hidden");
assert.equal(widthWorkspace.columns.length, 0);
api.restoreWindow(widthState, "wide");
assert.equal(widthWorkspace.columns[0].width, 640);
assert.equal(widthWorkspace.columns[0].widthFixed, true);
assert.equal(widthWorkspace.columns[0].fullWidth, true);
assert.equal(widthWorkspace.columns[0].restoreWidth, 640);
assert.equal(widthWorkspace.columns[0].restoreWidthFixed, true);

const emptyHeight = api.createState();
assert.equal(api.setWindowHeight(emptyHeight, "screen-1", 0, 0.5), null);

const heightSingle = api.createState();
api.addWindow(heightSingle, "screen-1", 0, "solo");
api.setWindowHeight(heightSingle, "screen-1", 0, 0.5);
assert.deepEqual(plain(api.getWorkspace(heightSingle, "screen-1", 0).columns[0].heightWeights), {});

const heightState = api.createState({ presetWindowHeights: [0.25, 0.5, 0.75] });
const heightWorkspace = api.ensureWorkspace(heightState, "screen-1", 0);
const heightColumn = api.createColumn(heightState, ["top", "middle", "bottom"]);
heightWorkspace.columns.push(heightColumn);
heightState.windowIndex.top = api.createLocation("screen-1", 0, 0, 0);
heightState.windowIndex.middle = api.createLocation("screen-1", 0, 0, 1);
heightState.windowIndex.bottom = api.createLocation("screen-1", 0, 0, 2);

api.focusWindowByIndex(heightState, "screen-1", 0, 2);
api.setWindowHeight(heightState, "screen-1", 0, 0.5);
assert.deepEqual(plain(heightColumn.heightWeights), { middle: 0.5 });
api.switchPresetWindowHeight(heightState, "screen-1", 0, 1);
assert.deepEqual(plain(heightColumn.heightWeights), { middle: 0.75 });
api.switchPresetWindowHeight(heightState, "screen-1", 0, 1);
assert.deepEqual(plain(heightColumn.heightWeights), { middle: 0.25 });
api.switchPresetWindowHeightBack(heightState, "screen-1", 0);
assert.deepEqual(plain(heightColumn.heightWeights), { middle: 0.75 });
api.adjustWindowHeight(heightState, "screen-1", 0, -0.15);
assert.deepEqual(plain(heightColumn.heightWeights), { middle: 0.6 });

api.focusWindowByIndex(heightState, "screen-1", 0, 1);
api.setWindowHeight(heightState, "screen-1", 0, 0.25);
api.focusWindowByIndex(heightState, "screen-1", 0, 2);
api.resetWindowHeight(heightState, "screen-1", 0);
assert.deepEqual(plain(heightColumn.heightWeights), { top: 0.25 });

heightColumn.tabbed = true;
api.focusWindowByIndex(heightState, "screen-1", 0, 1);
api.setWindowHeight(heightState, "screen-1", 0, 0.75);
api.resetWindowHeight(heightState, "screen-1", 0);
assert.deepEqual(plain(heightColumn.heightWeights), {});
heightColumn.tabbed = false;

api.setWindowHeight(heightState, "screen-1", 0, 0.25);
api.focusWindowByIndex(heightState, "screen-1", 0, 3);
api.setWindowHeight(heightState, "screen-1", 0, 0.75);
api.resetColumnHeights(heightState, "screen-1", 0);
assert.deepEqual(plain(heightColumn.heightWeights), {});

const heightPark = api.createState();
const heightParkWorkspace = api.ensureWorkspace(heightPark, "screen-1", 0);
const heightParkColumn = api.createColumn(heightPark, ["a", "b", "c"]);
heightParkColumn.heightWeights = { a: 0.25, b: 0.5, c: 0.75 };
heightParkWorkspace.columns.push(heightParkColumn);
heightPark.windowIndex.a = api.createLocation("screen-1", 0, 0, 0);
heightPark.windowIndex.b = api.createLocation("screen-1", 0, 0, 1);
heightPark.windowIndex.c = api.createLocation("screen-1", 0, 0, 2);
api.focusWindowByIndex(heightPark, "screen-1", 0, 2);

api.parkWindow(heightPark, "b", "hidden");
assert.deepEqual(plain(heightParkColumn.windows), ["a", "c"]);
assert.deepEqual(plain(heightParkColumn.heightWeights), { a: 0.25, c: 0.75 });
api.restoreWindow(heightPark, "b");
assert.deepEqual(plain(heightParkColumn.windows), ["a", "b", "c"]);
assert.deepEqual(plain(heightParkColumn.heightWeights), { a: 0.25, c: 0.75, b: 0.5 });

api.removeWindow(heightPark, "c");
api.removeWindow(heightPark, "b");
assert.deepEqual(plain(heightParkColumn.windows), ["a"]);
assert.deepEqual(plain(heightParkColumn.heightWeights), {});

const consumeState = api.createState();
const consumeWorkspace = api.ensureWorkspace(consumeState, "screen-1", 0);
const consumeLeft = api.createColumn(consumeState, ["a"]);
const consumeRight = api.createColumn(consumeState, ["b1", "b2"]);
consumeRight.heightWeights = { b1: 0.25, b2: 0.75 };
consumeWorkspace.columns.push(consumeLeft, consumeRight);
consumeState.windowIndex.a = api.createLocation("screen-1", 0, 0, 0);
consumeState.windowIndex.b1 = api.createLocation("screen-1", 0, 1, 0);
consumeState.windowIndex.b2 = api.createLocation("screen-1", 0, 1, 1);

assert.deepEqual(plain(api.consumeIntoColumnRight(consumeState, "screen-1", 0)), {
  outputId: "screen-1",
  workspaceIndex: 0,
  columnIndex: 0,
  windowIndex: 0
});
assert.deepEqual(plain(consumeWorkspace.columns.map((column) => column.windows)), [
  ["a", "b1"],
  ["b2"]
]);
assert.deepEqual(plain(consumeWorkspace.columns[0].heightWeights), { b1: 0.25 });
assert.deepEqual(plain(consumeWorkspace.columns[1].heightWeights), {});
assert.equal(consumeState.lastTiledWindowId, "a");
assert.deepEqual(plain(consumeState.windowIndex.b1), {
  outputId: "screen-1",
  workspaceIndex: 0,
  columnIndex: 0,
  windowIndex: 1
});

const mergeState = api.createState();
api.addWindow(mergeState, "screen-1", 0, "left");
api.addWindow(mergeState, "screen-1", 0, "right");
api.focusFirstColumn(mergeState, "screen-1", 0);
const mergeWorkspace = api.getWorkspace(mergeState, "screen-1", 0);

assert.deepEqual(plain(api.consumeOrExpelRight(mergeState, "screen-1", 0)), {
  outputId: "screen-1",
  workspaceIndex: 0,
  columnIndex: 0,
  windowIndex: 0
});
assert.deepEqual(plain(mergeWorkspace.columns.map((column) => column.windows)), [["left", "right"]]);
assert.equal(mergeWorkspace.focusColumn, 0);
assert.equal(mergeWorkspace.columns[0].focusWindow, 0);

const expelState = api.createState();
const expelWorkspace = api.ensureWorkspace(expelState, "screen-1", 0);
const expelLeft = api.createColumn(expelState, ["l"]);
const expelActive = api.createColumn(expelState, ["x", "y", "z"]);
expelActive.heightWeights = { x: 0.25, y: 0.5, z: 0.75 };
expelWorkspace.columns.push(expelLeft, expelActive);
expelWorkspace.focusColumn = 1;
expelActive.focusWindow = 1;
expelState.windowIndex.l = api.createLocation("screen-1", 0, 0, 0);
expelState.windowIndex.x = api.createLocation("screen-1", 0, 1, 0);
expelState.windowIndex.y = api.createLocation("screen-1", 0, 1, 1);
expelState.windowIndex.z = api.createLocation("screen-1", 0, 1, 2);

assert.deepEqual(plain(api.consumeOrExpelLeft(expelState, "screen-1", 0)), {
  outputId: "screen-1",
  workspaceIndex: 0,
  columnIndex: 1,
  windowIndex: 0
});
assert.deepEqual(plain(expelWorkspace.columns.map((column) => column.windows)), [
  ["l"],
  ["y"],
  ["x", "z"]
]);
assert.equal(expelWorkspace.focusColumn, 1);
assert.deepEqual(plain(expelWorkspace.columns[2].heightWeights), { x: 0.25, z: 0.75 });
assert.deepEqual(plain(expelState.windowIndex.y), {
  outputId: "screen-1",
  workspaceIndex: 0,
  columnIndex: 1,
  windowIndex: 0
});

assert.deepEqual(plain(api.expelFromColumnRight(expelState, "screen-1", 0)), {
  outputId: "screen-1",
  workspaceIndex: 0,
  columnIndex: 1,
  windowIndex: 0
});
assert.deepEqual(plain(expelWorkspace.columns.map((column) => column.windows)), [
  ["l"],
  ["y"],
  ["x", "z"]
]);

const swapState = api.createState();
const swapWorkspace = api.ensureWorkspace(swapState, "screen-1", 0);
const swapLeft = api.createColumn(swapState, ["a1", "a2"]);
const swapRight = api.createColumn(swapState, ["b1", "b2"]);
swapLeft.focusWindow = 1;
swapRight.focusWindow = 0;
swapLeft.heightWeights = { a2: 0.5 };
swapRight.heightWeights = { b1: 0.25 };
swapWorkspace.columns.push(swapLeft, swapRight);
swapState.windowIndex.a1 = api.createLocation("screen-1", 0, 0, 0);
swapState.windowIndex.a2 = api.createLocation("screen-1", 0, 0, 1);
swapState.windowIndex.b1 = api.createLocation("screen-1", 0, 1, 0);
swapState.windowIndex.b2 = api.createLocation("screen-1", 0, 1, 1);

assert.deepEqual(plain(api.swapWindowRight(swapState, "screen-1", 0)), {
  outputId: "screen-1",
  workspaceIndex: 0,
  columnIndex: 1,
  windowIndex: 0
});
assert.deepEqual(plain(swapWorkspace.columns.map((column) => column.windows)), [
  ["a1", "b1"],
  ["a2", "b2"]
]);
assert.deepEqual(plain(swapLeft.heightWeights), { b1: 0.25 });
assert.deepEqual(plain(swapRight.heightWeights), { a2: 0.5 });
assert.equal(swapState.lastTiledWindowId, "a2");

const swapColumnState = api.createState();
api.addWindow(swapColumnState, "screen-1", 0, "one");
api.addWindow(swapColumnState, "screen-1", 0, "two");
const swapColumnWorkspace = api.getWorkspace(swapColumnState, "screen-1", 0);

assert.deepEqual(plain(api.swapWindowLeft(swapColumnState, "screen-1", 0)), {
  outputId: "screen-1",
  workspaceIndex: 0,
  columnIndex: 0,
  windowIndex: 0
});
assert.deepEqual(plain(swapColumnWorkspace.columns.map((column) => column.windows)), [
  ["two"],
  ["one"]
]);
assert.equal(swapColumnWorkspace.focusColumn, 0);

const floatingState = api.createState();
api.addWindow(floatingState, "screen-1", 0, "tile");
const floatingWorkspace = api.getWorkspace(floatingState, "screen-1", 0);

api.setWindowFloating(floatingState, "tile", true);
assert.equal(floatingState.windowIndex.tile, undefined);
assert.equal(floatingWorkspace.columns.length, 0);
assert.equal(floatingState.floating.tile, true);
assert.equal(floatingState.manualFloating.tile, true);
assert.equal(floatingState.manualTiled.tile, undefined);
assert.equal(floatingState.lastFloatingWindowId, "tile");
assert.equal(floatingState.parked.tile.reason, "floating");

api.setWindowFloating(floatingState, "tile", false);
assert.deepEqual(plain(floatingState.windowIndex.tile), {
  outputId: "screen-1",
  workspaceIndex: 0,
  columnIndex: 0,
  windowIndex: 0
});
assert.equal(floatingState.floating.tile, undefined);
assert.equal(floatingState.manualFloating.tile, undefined);
assert.equal(floatingState.manualTiled.tile, true);
assert.equal(floatingState.parked.tile, undefined);

api.setWindowFloating(floatingState, "tile", true);
api.setRuleFloating(floatingState, "tile", true);
api.setRuleFloating(floatingState, "tile", false);
assert.equal(floatingState.floating.tile, true);
assert.equal(floatingState.manualFloating.tile, true);
assert.equal(floatingState.parked.tile.reason, "floating");
api.setWindowFloating(floatingState, "tile", false);
assert.equal(floatingState.windowIndex.tile.windowIndex, 0);
assert.equal(floatingState.floating.tile, undefined);

const ruleState = api.createState();
api.addWindow(ruleState, "screen-1", 0, "rule");
api.setRuleFloating(ruleState, "rule", true);
assert.equal(ruleState.windowIndex.rule, undefined);
assert.equal(ruleState.ruleFloating.rule, true);
assert.equal(ruleState.floating.rule, true);
api.setRuleFloating(ruleState, "rule", false);
assert.equal(ruleState.ruleFloating.rule, undefined);
assert.equal(ruleState.floating.rule, undefined);
assert.equal(ruleState.windowIndex.rule.windowIndex, 0);

const fullscreenState = api.createState();
api.addWindow(fullscreenState, "screen-1", 0, "full");
api.setWindowFullscreen(fullscreenState, "full", true);
assert.equal(fullscreenState.windowIndex.full, undefined);
assert.equal(fullscreenState.fullscreen.full, true);
assert.equal(fullscreenState.floating.full, undefined);
assert.equal(fullscreenState.parked.full.reason, "fullscreen");
api.setWindowFullscreen(fullscreenState, "full", false);
assert.equal(fullscreenState.fullscreen.full, undefined);
assert.deepEqual(plain(fullscreenState.windowIndex.full), {
  outputId: "screen-1",
  workspaceIndex: 0,
  columnIndex: 0,
  windowIndex: 0
});

const transitionState = api.createState();
api.addWindow(transitionState, "screen-1", 0, "transition");
api.setWindowFullscreen(transitionState, "transition", true);
api.setWindowFloating(transitionState, "transition", true);
assert.equal(transitionState.fullscreen.transition, undefined);
assert.equal(transitionState.floating.transition, true);
assert.equal(transitionState.manualFloating.transition, true);
assert.equal(transitionState.windowIndex.transition, undefined);
assert.equal(transitionState.parked.transition.reason, "floating");

api.removeWindow(transitionState, "transition");
assert.equal(transitionState.parked.transition, undefined);
assert.equal(transitionState.floating.transition, undefined);
assert.equal(transitionState.manualFloating.transition, undefined);
assert.equal(transitionState.fullscreen.transition, undefined);

assert.equal(api.toggleWindowFloating(transitionState, ""), null);
assert.equal(api.toggleWindowFullscreen(transitionState, ""), null);

const scrollState = api.createState({ gaps: 10, centerFocusedColumn: "never" });
const scrollWorkspace = api.ensureWorkspace(scrollState, "screen-1", 0);
scrollWorkspace.columns.push(
  api.createColumn(scrollState, "s1", { width: 100, widthFixed: true }),
  api.createColumn(scrollState, "s2", { width: 100, widthFixed: true }),
  api.createColumn(scrollState, "s3", { width: 100, widthFixed: true })
);

assert.deepEqual(plain(api.computeColumnMetrics(scrollState, "screen-1", 0, 250).columns.map((column) => ({
  start: column.start,
  end: column.end,
  width: column.width
}))), [
  { start: 0, end: 100, width: 100 },
  { start: 110, end: 210, width: 100 },
  { start: 220, end: 320, width: 100 }
]);
assert.equal(api.computeColumnMetrics(scrollState, "screen-1", 0, 250).contentWidth, 320);

scrollWorkspace.focusColumn = 2;
scrollWorkspace.scrollOffset = 0;
assert.equal(api.fitFocusedColumnIntoViewport(scrollState, "screen-1", 0, 250), 70);
assert.equal(scrollWorkspace.scrollOffset, 70);

scrollWorkspace.focusColumn = 0;
assert.equal(api.fitFocusedColumnIntoViewport(scrollState, "screen-1", 0, 250), 0);

scrollWorkspace.focusColumn = 1;
assert.equal(api.centerFocusedColumnInViewport(scrollState, "screen-1", 0, 250), 35);

scrollWorkspace.scrollOffset = 0;
scrollWorkspace.prevFocusColumn = 0;
scrollWorkspace.focusColumn = 1;
assert.equal(api.updateScrollOffsetForFocus(scrollState, "screen-1", 0, 250, { centerFocusedColumn: "on-overflow" }), 0);

scrollWorkspace.prevFocusColumn = 0;
scrollWorkspace.focusColumn = 2;
assert.equal(api.updateScrollOffsetForFocus(scrollState, "screen-1", 0, 250, { centerFocusedColumn: "on-overflow" }), 145);

scrollWorkspace.scrollOffset = 0;
scrollWorkspace.focusColumn = 0;
assert.equal(api.centerVisibleColumns(scrollState, "screen-1", 0, 250), -20);

scrollWorkspace.scrollOffset = 0;
scrollWorkspace.focusColumn = 2;
assert.equal(api.centerVisibleColumns(scrollState, "screen-1", 0, 250), 0);

const singleScroll = api.createState({ alwaysCenterSingleColumn: true });
const singleScrollWorkspace = api.ensureWorkspace(singleScroll, "screen-1", 0);
singleScrollWorkspace.columns.push(api.createColumn(singleScroll, "only", { width: 100, widthFixed: true }));
assert.equal(api.updateScrollOffsetForFocus(singleScroll, "screen-1", 0, 300, { centerFocusedColumn: "never", gap: 0 }), -100);

assert.equal(api.setScrollOffset(singleScroll, "screen-1", 0, "25"), 25);
assert.equal(singleScrollWorkspace.scrollOffset, 25);

assert.deepEqual(plain(api.swapWindowLeft(swapColumnState, "screen-1", 0)), {
  outputId: "screen-1",
  workspaceIndex: 0,
  columnIndex: 0,
  windowIndex: 0
});
assert.deepEqual(plain(swapColumnWorkspace.columns.map((column) => column.windows)), [
  ["two"],
  ["one"]
]);
