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
