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
const desktop = { x11DesktopNumber: 1 };
const screen = { name: "screen-1", geometry: { x: 0, y: 0, width: 200, height: 120 } };
const windows = [
  { internalId: "boot-1", output: "screen-1" },
  { internalId: "boot-2", output: "screen-1" }
];
const messages = [];
const registered = [];
const sandbox = {
  KWin: { PlacementArea: 7, WorkArea: 8, MovementArea: 9, MaximizeArea: 10 },
  workspace: {
    windowAdded,
    currentDesktopChanged,
    screens: [screen],
    currentDesktop: desktop,
    windowList: () => windows,
    activeWindow: windows[0],
    clientArea: (kind, output, requestedDesktop) => {
      if (kind === 8 && output === screen && requestedDesktop === desktop) {
        return { x: 0, y: 0, width: 200, height: 100 };
      }
      return screen.geometry;
    }
  },
  registerShortcut: (name, title, shortcut, callback) => registered.push({ name, title, shortcut, callback }),
  print: (message) => messages.push(message),
  readConfig: (key, defaultValue) => defaultValue
};

vm.runInNewContext(script, sandbox, { filename: "contents/code/main.js" });

assert.equal(sandbox.KWinRibbon.version, "0.1.0");
assert.equal(sandbox.__kwinRibbonAdapter.state.lastTiledWindowId, "boot-1");
assert.equal(typeof sandbox.kwinRibbonDebugSnapshot, "function");
assert.equal(typeof sandbox.kwinRibbonRunAction, "function");
assert.equal(typeof sandbox.KWinRibbon.runAction, "function");
assert.equal(messages[0], "kwin-ribbon loaded 0.1.0");
assert.equal(registered.length > 0, true);
assert.deepEqual(plain(windows[0].frameGeometry), { x: 0, y: 0, width: 200, height: 100 });
assert.deepEqual(plain(windows[1].frameGeometry), { x: 216, y: 0, width: 200, height: 100 });
assert.equal(sandbox.kwinRibbonDebugSnapshot().knownWindows.length, 2);
assert.equal(sandbox.kwinRibbonDebugSnapshot().runActionAvailable, true);

windows.push({ internalId: "boot-3", output: "screen-1" });
windowAdded.emit(windows[2]);
assert.equal(sandbox.__kwinRibbonAdapter.state.windowIndex["boot-3"].columnIndex, 1);
assert.equal(windows[2].frameGeometry.width, 200);

sandbox.kwinRibbonRunAction("kwin-ribbon-focus-column-right");
assert.equal(sandbox.__kwinRibbonAdapter.state.lastTiledWindowId, "boot-3");

assert.doesNotThrow(() => currentDesktopChanged.emit());
