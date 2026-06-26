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

const adapter = api.createKWinAdapter({}, { tileNewWindows: true });

assert.equal(adapter.handleWindowAdded({ internalId: "skip", skipTaskbar: true }).action, "ignore");
assert.equal(adapter.registry.skip, undefined);

adapter.handleWindowAdded({ internalId: "one", output: { name: "HDMI-A-1" } });
adapter.handleWindowAdded({ internalId: "two", output: { name: "HDMI-A-1" } });
assert.deepEqual(plain(api.getWorkspace(adapter.state, "HDMI-A-1", 0).columns.map((column) => column.windows)), [
  ["one"],
  ["two"]
]);
assert.equal(adapter.registry.one.classification.reason, "normal");

adapter.handleActiveWindowChanged({ internalId: "one" });
assert.equal(adapter.state.lastTiledWindowId, "one");
assert.equal(api.getWorkspace(adapter.state, "HDMI-A-1", 0).focusColumn, 0);

adapter.handleWindowRemoved({ internalId: "one" });
assert.equal(adapter.registry.one, undefined);
assert.equal(adapter.state.windowIndex.one, undefined);
assert.deepEqual(plain(api.getWorkspace(adapter.state, "HDMI-A-1", 0).columns.map((column) => column.windows)), [["two"]]);

const windowAdded = signal();
const windowRemoved = signal();
const activeWindowChanged = signal();
let windows = [
  { internalId: "a", output: "screen-1" },
  { internalId: "b", output: "screen-1" }
];
let activeWindow = windows[1];
const env = {
  workspace: { windowAdded, windowRemoved, activeWindowChanged },
  getWindows: () => windows,
  getActiveWindow: () => activeWindow
};
const syncAdapter = api.createKWinAdapter(env, { tileNewWindows: true });

syncAdapter.start();
assert.equal(windowAdded.handlers.length, 1);
assert.equal(windowRemoved.handlers.length, 1);
assert.equal(activeWindowChanged.handlers.length, 1);
assert.deepEqual(plain(api.getWorkspace(syncAdapter.state, "screen-1", 0).columns.map((column) => column.windows)), [
  ["a"],
  ["b"]
]);
assert.equal(syncAdapter.state.lastTiledWindowId, "b");

windows = [windows[1]];
syncAdapter.syncWindows();
assert.equal(syncAdapter.registry.a, undefined);
assert.equal(syncAdapter.state.windowIndex.a, undefined);

windowAdded.emit({ internalId: "c", output: "screen-1" });
assert.equal(syncAdapter.state.windowIndex.c.columnIndex, 1);

windowRemoved.emit({ internalId: "c" });
assert.equal(syncAdapter.state.windowIndex.c, undefined);

const firstWindow = { internalId: "p1", output: "screen-1" };
const secondWindow = { internalId: "p2", output: "screen-1" };
const projectionAdapter = api.createKWinAdapter({
  getArrangeArea: () => ({ x: 10, y: 20, width: 300, height: 200 })
}, { gaps: 10 });

projectionAdapter.handleWindowAdded(firstWindow);
projectionAdapter.handleWindowAdded(secondWindow);
projectionAdapter.arrange({ outputId: "screen-1", workspaceIndex: 0 });
assert.deepEqual(plain(firstWindow.frameGeometry), { x: 10, y: 20, width: 300, height: 200 });
assert.deepEqual(plain(secondWindow.frameGeometry), { x: 320, y: 20, width: 300, height: 200 });
assert.equal(projectionAdapter.lastProjection().frames.length, 2);

const registered = [];
const activated = [];
const actionFirst = { internalId: "action-1", output: "screen-1" };
const actionSecond = { internalId: "action-2", output: "screen-1" };
const actionAdapter = api.createKWinAdapter({
  registerShortcut: (name, title, shortcut, callback) => registered.push({ name, title, shortcut, callback }),
  activateWindow: (windowRef) => activated.push(windowRef.internalId),
  getArrangeArea: () => ({ x: 0, y: 0, width: 100, height: 100 }),
  getActiveWindow: () => actionSecond
});

actionAdapter.handleWindowAdded(actionFirst);
actionAdapter.handleWindowAdded(actionSecond);
assert.equal(actionAdapter.registerShortcuts(), true);
assert.equal(registered.every((entry) => entry.shortcut === ""), true);
registered.find((entry) => entry.name === "kwin-ribbon-focus-column-left").callback();
assert.equal(actionAdapter.state.lastTiledWindowId, "action-1");
assert.deepEqual(activated, ["action-1"]);
assert.equal(actionFirst.frameGeometry.width, 100);

const disabledAdapter = api.createKWinAdapter({ registerShortcut: () => registered.push("disabled") }, { enableWindowManagementShortcuts: false });
assert.equal(disabledAdapter.registerShortcuts(), false);
