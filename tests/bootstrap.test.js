"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const script = fs.readFileSync(path.join(root, "contents", "code", "main.js"), "utf8");

function signal() {
  const handlers = [];
  return {
    handlers,
    connect(handler) {
      handlers.push(handler);
    },
    emit(value) {
      handlers.forEach((handler) => handler(value));
    }
  };
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

const windowAdded = signal();
const currentDesktopChanged = signal();
const windows = [
  { internalId: "boot-1", output: "screen-1" },
  { internalId: "boot-2", output: "screen-1" }
];
const messages = [];
const registered = [];
const sandbox = {
  workspace: {
    windowAdded,
    currentDesktopChanged,
    windowList: () => windows,
    activeWindow: windows[0],
    clientArea: () => ({ x: 0, y: 0, width: 200, height: 100 })
  },
  registerShortcut: (name, title, shortcut, callback) => registered.push({ name, title, shortcut, callback }),
  print: (message) => messages.push(message),
  readConfig: (key, defaultValue) => defaultValue
};

vm.runInNewContext(script, sandbox, { filename: "contents/code/main.js" });

assert.equal(sandbox.KWinRibbon.version, "0.1.0");
assert.equal(sandbox.__kwinRibbonAdapter.state.lastTiledWindowId, "boot-1");
assert.equal(typeof sandbox.kwinRibbonDebugSnapshot, "function");
assert.equal(messages[0], "kwin-ribbon loaded 0.1.0");
assert.equal(registered.length > 0, true);
assert.deepEqual(plain(windows[0].frameGeometry), { x: 0, y: 0, width: 200, height: 100 });
assert.deepEqual(plain(windows[1].frameGeometry), { x: 216, y: 0, width: 200, height: 100 });
assert.equal(sandbox.kwinRibbonDebugSnapshot().knownWindows.length, 2);

windows.push({ internalId: "boot-3", output: "screen-1" });
windowAdded.emit(windows[2]);
assert.equal(sandbox.__kwinRibbonAdapter.state.windowIndex["boot-3"].columnIndex, 1);
assert.equal(windows[2].frameGeometry.width, 200);

assert.doesNotThrow(() => currentDesktopChanged.emit());
