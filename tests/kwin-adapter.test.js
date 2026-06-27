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

adapter.handleWindowAdded({ internalId: "two", output: { name: "HDMI-A-1" }, dock: true });
assert.equal(adapter.registry.two, undefined);
assert.equal(adapter.state.windowIndex.two, undefined);
assert.equal(adapter.skippedRegistry.two.reason, "special-window");
assert.equal(adapter.debugSnapshot().skippedWindows.some((entry) => entry.windowId === "two" && entry.reason === "special-window"), true);

const parkedAdapter = api.createKWinAdapter({}, { tileNewWindows: true });
const parkedWindow = { internalId: "parked", output: "screen-1" };
parkedAdapter.handleWindowAdded(parkedWindow);
api.parkWindow(parkedAdapter.state, "parked", "temporarily-unavailable");
parkedAdapter.handleWindowAdded(parkedWindow);
assert.equal(parkedAdapter.state.windowIndex.parked.columnIndex, 0);
assert.deepEqual(plain(api.getWorkspace(parkedAdapter.state, "screen-1", 0).columns.map((column) => column.windows)), [["parked"]]);

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
assert.deepEqual(plain(firstWindow.frameGeometry), { x: -300, y: 20, width: 300, height: 200 });
assert.deepEqual(plain(secondWindow.frameGeometry), { x: 10, y: 20, width: 300, height: 200 });
assert.equal(projectionAdapter.lastProjection().frames.length, 2);

const scrollFirst = { internalId: "scroll-1", output: "screen-1" };
const scrollSecond = { internalId: "scroll-2", output: "screen-1" };
const scrollThird = { internalId: "scroll-3", output: "screen-1" };
const scrollAdapter = api.createKWinAdapter({
  getActiveWindow: () => scrollFirst,
  getArrangeArea: () => ({ x: 0, y: 0, width: 100, height: 100 }),
  setFrameGeometry: (windowRef, frameGeometry) => {
    if (windowRef.internalId === "scroll-3") {
      return false;
    }
    windowRef.frameGeometry = frameGeometry;
    return true;
  }
}, { gaps: 0 });
scrollAdapter.handleWindowAdded(scrollFirst);
scrollAdapter.handleWindowAdded(scrollSecond);
scrollAdapter.handleWindowAdded(scrollThird);
const scrollWorkspace = api.getWorkspace(scrollAdapter.state, "screen-1", 0);
scrollWorkspace.columns.forEach((column) => {
  column.fullWidth = true;
});
api.focusWindowById(scrollAdapter.state, "scroll-1");
scrollAdapter.arrange({ outputId: "screen-1", workspaceIndex: 0 });
const scrollInitialFrames = plain(scrollAdapter.lastProjection().frames);
scrollAdapter.dispatchAction("kwin-ribbon-focus-column-right", { outputId: "screen-1", workspaceIndex: 0 });
const scrollFocusedFrames = plain(scrollAdapter.lastProjection().frames);
const scrollSnapshot = scrollAdapter.debugSnapshot();
assert.equal(scrollWorkspace.scrollOffset, 100);
assert.notDeepEqual(scrollFocusedFrames, scrollInitialFrames);
assert.deepEqual(scrollFocusedFrames.map((frame) => frame.frameGeometry.x), [-100, 0, 100]);
assert.equal(scrollSnapshot.lastAction.actionId, "kwin-ribbon-focus-column-right");
assert.equal(scrollSnapshot.lastAction.activeKWinWindowId, "scroll-1");
assert.equal(scrollSnapshot.lastAction.activeKWinWindowKnown, true);
assert.equal(scrollSnapshot.lastAction.outputId, "screen-1");
assert.equal(scrollSnapshot.lastAction.workspaceIndex, 0);
assert.equal(scrollSnapshot.lastAction.beforeFocusColumn, 0);
assert.equal(scrollSnapshot.lastAction.afterFocusColumn, 1);
assert.equal(scrollSnapshot.lastAction.beforeFocusedModelWindowId, "scroll-1");
assert.equal(scrollSnapshot.lastAction.afterFocusedModelWindowId, "scroll-2");
assert.equal(scrollSnapshot.lastAction.beforeScrollOffset, 0);
assert.equal(scrollSnapshot.lastAction.afterScrollOffset, 100);
assert.equal(scrollSnapshot.lastAction.projectedFrameCount, 3);
assert.equal(scrollSnapshot.lastAction.attemptedGeometryWriteCount, 3);
assert.equal(scrollSnapshot.lastAction.successfulGeometryWriteCount, 2);
assert.equal(scrollSnapshot.lastAction.failedGeometryWriteCount, 1);
assert.equal(scrollSnapshot.lastAction.frameSamples.length, 3);

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
assert.equal(registered.every((entry) => entry.name.indexOf("interactive") < 0), true);
registered.find((entry) => entry.name === "kwin-ribbon-focus-column-left").callback();
assert.equal(actionAdapter.state.lastTiledWindowId, "action-1");
assert.deepEqual(activated, ["action-1"]);
assert.equal(actionFirst.frameGeometry.width, 100);
assert.equal(registered.some((entry) => entry.name === "kwin-ribbon-maximize-column" && entry.title === "KWin Ribbon: Maximize Column"), true);

actionAdapter.dispatchAction("kwin-ribbon-maximize-column", { outputId: "screen-1", workspaceIndex: 0, area: { x: 0, y: 0, width: 100, height: 100 } });
const actionWorkspace = api.getWorkspace(actionAdapter.state, "screen-1", 0);
assert.equal(actionWorkspace.columns[actionWorkspace.focusColumn].fullWidth, true);
actionAdapter.dispatchAction("kwin-ribbon-center-column", { outputId: "screen-1", workspaceIndex: 0, area: { x: 0, y: 0, width: 100, height: 100 } });
assert.equal(actionAdapter.lastProjection().frames.length, 2);
actionAdapter.dispatchAction("kwin-ribbon-next-column-width", { outputId: "screen-1", workspaceIndex: 0, area: { x: 0, y: 0, width: 100, height: 100 } });
assert.equal(actionAdapter.debugSnapshot().lastAction.actionId, "kwin-ribbon-next-column-width");
assert.equal(actionAdapter.debugSnapshot().lastAction.projectedFrameCount, 2);

const fullscreenTarget = { internalId: "fullscreen-target", output: "screen-1", fullScreen: false };
const fullscreenAdapter = api.createKWinAdapter({
  getWindows: () => [fullscreenTarget],
  getActiveWindow: () => fullscreenTarget,
  setWindowFullscreen: (windowRef, enabled) => {
    windowRef.fullScreen = enabled;
    return true;
  },
  getArrangeArea: () => ({ x: 0, y: 0, width: 100, height: 100 })
});
fullscreenAdapter.handleWindowAdded(fullscreenTarget);
fullscreenAdapter.dispatchAction("kwin-ribbon-fullscreen-window", { outputId: "screen-1", workspaceIndex: 0 });
assert.equal(fullscreenTarget.fullScreen, true);
fullscreenTarget.fullScreen = false;
fullscreenAdapter.syncWindows();
assert.equal(fullscreenAdapter.state.fullscreen["fullscreen-target"], true);
assert.equal(fullscreenAdapter.state.windowIndex["fullscreen-target"], undefined);
fullscreenAdapter.dispatchAction("kwin-ribbon-fullscreen-window", { outputId: "screen-1", workspaceIndex: 0 });
assert.equal(fullscreenTarget.fullScreen, false);

const floatingTarget = { internalId: "floating-target", output: "screen-1" };
const floatingAdapter = api.createKWinAdapter({
  getWindows: () => [floatingTarget],
  getActiveWindow: () => floatingTarget,
  getArrangeArea: () => ({ x: 0, y: 0, width: 100, height: 100 })
});
floatingAdapter.handleWindowAdded(floatingTarget);
floatingAdapter.dispatchAction("kwin-ribbon-toggle-floating", { outputId: "screen-1", workspaceIndex: 0 });
assert.equal(floatingAdapter.state.floating["floating-target"], true);
assert.equal(floatingAdapter.state.windowIndex["floating-target"], undefined);
floatingAdapter.syncWindows();
assert.equal(floatingAdapter.state.windowIndex["floating-target"], undefined);
floatingAdapter.dispatchAction("kwin-ribbon-toggle-floating", { outputId: "screen-1", workspaceIndex: 0 });
assert.equal(floatingAdapter.state.windowIndex["floating-target"].columnIndex, 0);

const centerWindow = { internalId: "center-target", output: "screen-1" };
const centerAdapter = api.createKWinAdapter({
  getActiveWindow: () => centerWindow,
  getArrangeArea: () => ({ x: 0, y: 0, width: 100, height: 100 })
});
centerAdapter.handleWindowAdded(centerWindow);
api.setColumnWidth(centerAdapter.state, "screen-1", 0, 0.5);
centerAdapter.dispatchAction("kwin-ribbon-center-column", { outputId: "screen-1", workspaceIndex: 0 });
assert.equal(api.getWorkspace(centerAdapter.state, "screen-1", 0).scrollOffset, -25);
assert.equal(centerAdapter.lastProjection().frames[0].frameGeometry.x, 25);

const disabledAdapter = api.createKWinAdapter({ registerShortcut: () => registered.push("disabled") }, { enableWindowManagementShortcuts: false });
assert.equal(disabledAdapter.registerShortcuts(), false);

const shortcutMessages = [];
const debugShortcutAdapter = api.createKWinAdapter({
  registerShortcut: (name, title, shortcut, callback) => {
    registered.push({ name, title, shortcut, callback });
    return true;
  },
  print: (message) => shortcutMessages.push(message)
}, { debugLogging: true });
assert.equal(debugShortcutAdapter.registerShortcuts(), true);
assert.equal(shortcutMessages.some((message) => message.indexOf("kwin-ribbon shortcut action=kwin-ribbon-focus-column-left default= registered=true") >= 0), true);

const developmentRegistered = [];
const developmentShortcutAdapter = api.createKWinAdapter({
  registerShortcut: (name, title, shortcut, callback) => developmentRegistered.push({ name, title, shortcut, callback })
}, { enableDefaultDevelopmentShortcuts: true });
assert.equal(developmentShortcutAdapter.registerShortcuts(), true);
assert.equal(developmentRegistered.some((entry) => entry.name === "kwin-ribbon-focus-column-left" && entry.shortcut === "Meta+Alt+H"), true);

const snapshotWindow = { internalId: "snap", output: "screen-1", caption: "not included" };
const snapshotAdapter = api.createKWinAdapter({
  getActiveWindow: () => snapshotWindow,
  getArrangeArea: () => ({ x: 0, y: 0, width: 100, height: 100 })
});

snapshotAdapter.handleWindowAdded(snapshotWindow);
snapshotAdapter.arrange({ outputId: "screen-1", workspaceIndex: 0 });
const snapshot = snapshotAdapter.debugSnapshot();
assert.equal(snapshot.version, "0.1.0");
assert.equal(snapshot.actions.every((entry) => entry.shortcut === ""), true);
assert.equal(snapshot.actions.some((entry) => entry.name === "kwin-ribbon-focus-column-left"), true);
assert.equal(snapshot.runtime.activeKWinWindowId, "snap");
assert.equal(snapshot.runtime.activeKWinWindowKnown, true);
assert.equal(snapshot.runtime.focusedModelWindowId, "snap");
assert.equal(snapshot.knownWindows.length, 1);
assert.deepEqual(plain(snapshot.knownWindows[0]), {
  windowId: "snap",
  outputId: "screen-1",
  workspaceIndex: 0,
  action: "tile",
  reason: "normal",
  manageable: true,
  fullscreen: false
});
assert.equal(snapshot.knownWindows[0].windowRef, undefined);
assert.equal(snapshot.knownWindows[0].caption, undefined);
assert.equal(snapshot.state.windowIndex.snap.columnIndex, 0);
assert.equal(snapshot.lastProjection.frames[0].windowId, "snap");
