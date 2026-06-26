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
  width: 1.5,
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
