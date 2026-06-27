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

const newlyWiredActionNames = [
  "kwin-ribbon-focus-column-first",
  "kwin-ribbon-focus-column-last",
  "kwin-ribbon-move-column-first",
  "kwin-ribbon-move-column-last",
  "kwin-ribbon-focus-window-top",
  "kwin-ribbon-focus-window-bottom",
  "kwin-ribbon-move-window-top",
  "kwin-ribbon-move-window-bottom",
  "kwin-ribbon-consume-or-expel-left",
  "kwin-ribbon-consume-or-expel-right",
  "kwin-ribbon-consume-into-column-left",
  "kwin-ribbon-consume-into-column-right",
  "kwin-ribbon-expel-from-column-left",
  "kwin-ribbon-expel-from-column-right",
  "kwin-ribbon-swap-window-left",
  "kwin-ribbon-swap-window-right",
  "kwin-ribbon-next-window-height",
  "kwin-ribbon-previous-window-height",
  "kwin-ribbon-reset-window-height",
  "kwin-ribbon-reset-column-heights",
  "kwin-ribbon-close-window",
  "kwin-ribbon-focus-window-or-column-up",
  "kwin-ribbon-focus-window-or-column-down",
  "kwin-ribbon-focus-workspace-up",
  "kwin-ribbon-focus-workspace-down"
];

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

const temporaryFirst = { internalId: "temporary-1", output: "screen-1" };
const temporarySecond = { internalId: "temporary-2", output: "screen-1" };
const temporaryThird = { internalId: "temporary-3", output: "screen-1" };
const temporaryAdapter = api.createKWinAdapter({
  getWindows: () => [temporaryFirst, temporarySecond, temporaryThird]
}, { tileNewWindows: true });
temporaryAdapter.syncWindows();
const temporaryWorkspace = api.getWorkspace(temporaryAdapter.state, "screen-1", 0);
assert.deepEqual(plain(temporaryWorkspace.columns.map((column) => column.windows)), [
  ["temporary-1"],
  ["temporary-2"],
  ["temporary-3"]
]);
temporarySecond.readyForPainting = false;
temporaryAdapter.syncWindows();
assert.equal(temporaryAdapter.state.windowIndex["temporary-2"], undefined);
assert.equal(temporaryAdapter.state.parked["temporary-2"].reason, "temporarily-unavailable");
assert.deepEqual(plain(temporaryWorkspace.columns.map((column) => column.windows)), [
  ["temporary-1"],
  ["temporary-3"]
]);
temporaryAdapter.syncWindows();
assert.deepEqual(plain(temporaryWorkspace.columns.map((column) => column.windows)), [
  ["temporary-1"],
  ["temporary-3"]
]);
temporarySecond.readyForPainting = true;
temporaryAdapter.syncWindows();
assert.equal(temporaryAdapter.state.parked["temporary-2"], undefined);
assert.deepEqual(plain(temporaryWorkspace.columns.map((column) => column.windows)), [
  ["temporary-1"],
  ["temporary-2"],
  ["temporary-3"]
]);
temporaryAdapter.syncWindows();
assert.deepEqual(plain(temporaryWorkspace.columns.map((column) => column.windows)), [
  ["temporary-1"],
  ["temporary-2"],
  ["temporary-3"]
]);

const windowAdded = signal();
const clientAdded = signal();
const windowRemoved = signal();
const windowDeleted = signal();
const windowClosed = signal();
const clientRemoved = signal();
const activeWindowChanged = signal();
const clientActivated = signal();
let windows = [
  { internalId: "a", output: "screen-1" },
  { internalId: "b", output: "screen-1" }
];
let activeWindow = windows[1];
const env = {
  workspace: { windowAdded, clientAdded, windowRemoved, windowDeleted, windowClosed, clientRemoved, activeWindowChanged, clientActivated },
  getWindows: () => windows,
  getActiveWindow: () => activeWindow
};
const syncAdapter = api.createKWinAdapter(env, { tileNewWindows: true });

syncAdapter.start();
assert.equal(windowAdded.handlers.length, 1);
assert.equal(clientAdded.handlers.length, 1);
assert.equal(windowRemoved.handlers.length, 1);
assert.equal(windowDeleted.handlers.length, 1);
assert.equal(windowClosed.handlers.length, 1);
assert.equal(clientRemoved.handlers.length, 1);
assert.equal(activeWindowChanged.handlers.length, 1);
assert.equal(clientActivated.handlers.length, 1);
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

clientAdded.emit({ internalId: "d", output: "screen-1" });
assert.equal(syncAdapter.state.windowIndex.d.columnIndex, 1);
windowClosed.emit({ internalId: "d" });
assert.equal(syncAdapter.state.windowIndex.d, undefined);

const fallbackFirst = { internalId: "fallback-1", output: "screen-1" };
const fallbackSecond = { internalId: "fallback-2", output: "screen-1" };
const fallbackThird = { internalId: "fallback-3", output: "screen-1" };
let fallbackActive = fallbackSecond;
const fallbackActivated = [];
const fallbackAdapter = api.createKWinAdapter({
  getWindows: () => [fallbackFirst, fallbackSecond, fallbackThird],
  getActiveWindow: () => fallbackActive,
  activateWindow: (windowRef) => {
    fallbackActive = windowRef;
    fallbackActivated.push(windowRef.internalId);
  }
}, { tileNewWindows: true });
fallbackAdapter.syncWindows();
fallbackSecond.minimized = true;
fallbackAdapter.syncWindows();
assert.equal(fallbackAdapter.state.windowIndex["fallback-2"], undefined);
assert.equal(fallbackAdapter.state.parked["fallback-2"].reason, "temporarily-unavailable");
assert.deepEqual(fallbackActivated, ["fallback-3"]);

const removalFirst = { internalId: "removal-1", output: "screen-1" };
const removalSecond = { internalId: "removal-2", output: "screen-1" };
const removalThird = { internalId: "removal-3", output: "screen-1" };
let removalWindows = [removalFirst, removalSecond, removalThird];
let removalActive = removalSecond;
const removalActivated = [];
const removalAdapter = api.createKWinAdapter({
  getWindows: () => removalWindows,
  getActiveWindow: () => removalActive,
  activateWindow: (windowRef) => {
    removalActive = windowRef;
    removalActivated.push(windowRef.internalId);
  }
}, { tileNewWindows: true });
removalAdapter.syncWindows();
removalWindows = [removalFirst, removalThird];
removalAdapter.syncWindows();
assert.equal(removalAdapter.registry["removal-2"], undefined);
assert.equal(removalAdapter.state.windowIndex["removal-2"], undefined);
assert.deepEqual(removalActivated, ["removal-3"]);

const skippedWindow = { internalId: "skipped-stale", output: "screen-1", dock: true };
let skippedWindows = [skippedWindow];
const skippedAdapter = api.createKWinAdapter({
  getWindows: () => skippedWindows
}, { tileNewWindows: true });
skippedAdapter.syncWindows();
assert.equal(skippedAdapter.skippedRegistry["skipped-stale"].reason, "special-window");
skippedWindows = [];
skippedAdapter.syncWindows();
assert.equal(skippedAdapter.skippedRegistry["skipped-stale"], undefined);

const boundaryFirst = { internalId: "boundary-1", output: "screen-1" };
const boundarySecond = { internalId: "boundary-2", output: "screen-1" };
let boundaryWindows = [boundaryFirst, boundarySecond];
const boundaryAdapter = api.createKWinAdapter({
  getWindows: () => boundaryWindows
}, { tileNewWindows: true });
boundaryAdapter.syncWindows();
boundarySecond.dock = true;
boundaryAdapter.syncWindows();
assert.equal(boundaryAdapter.registry["boundary-2"], undefined);
assert.equal(boundaryAdapter.state.windowIndex["boundary-2"], undefined);
assert.equal(boundaryAdapter.skippedRegistry["boundary-2"].reason, "special-window");
boundarySecond.dock = false;
boundaryAdapter.syncWindows();
boundaryAdapter.syncWindows();
assert.equal(boundaryAdapter.skippedRegistry["boundary-2"], undefined);
assert.deepEqual(plain(api.getWorkspace(boundaryAdapter.state, "screen-1", 0).columns.map((column) => column.windows)), [
  ["boundary-1"],
  ["boundary-2"]
]);

const closeFirst = { internalId: "close-1", output: "screen-1" };
const closeSecond = { internalId: "close-2", output: "screen-1" };
let closeWindows = [closeFirst, closeSecond];
const closeAdapter = api.createKWinAdapter({
  getWindows: () => closeWindows
}, { tileNewWindows: true });
closeAdapter.syncWindows();
closeWindows = [closeFirst];
closeAdapter.syncWindows();
assert.equal(closeAdapter.registry["close-2"], undefined);
assert.equal(closeAdapter.state.windowIndex["close-2"], undefined);
closeWindows = [closeFirst, closeSecond];
closeAdapter.syncWindows();
closeAdapter.syncWindows();
assert.deepEqual(plain(api.getWorkspace(closeAdapter.state, "screen-1", 0).columns.map((column) => column.windows)), [
  ["close-1"],
  ["close-2"]
]);

const firstWindow = { internalId: "p1", output: "screen-1" };
const secondWindow = { internalId: "p2", output: "screen-1" };
const projectionAdapter = api.createKWinAdapter({
  getArrangeArea: () => ({ x: 10, y: 20, width: 300, height: 200 })
}, { gaps: 10 });

projectionAdapter.handleWindowAdded(firstWindow);
projectionAdapter.handleWindowAdded(secondWindow);
projectionAdapter.arrange({ outputId: "screen-1", workspaceIndex: 0 });
assert.deepEqual(plain(firstWindow.frameGeometry), { x: -270, y: 30, width: 280, height: 180 });
assert.deepEqual(plain(secondWindow.frameGeometry), { x: 20, y: 30, width: 280, height: 180 });
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
assert.equal(newlyWiredActionNames.every((name) => registered.some((entry) => entry.name === name)), true);
assert.equal(registered.some((entry) => entry.name === "kwin-ribbon-focus-column-first" && entry.title === "KWin Ribbon: Focus First Column"), true);
assert.equal(registered.some((entry) => entry.name === "kwin-ribbon-move-window-bottom" && entry.title === "KWin Ribbon: Move Window Bottom"), true);
assert.equal(registered.some((entry) => entry.name === "kwin-ribbon-consume-or-expel-left" && entry.title === "KWin Ribbon: Consume or Expel Left"), true);
assert.equal(registered.some((entry) => entry.name === "kwin-ribbon-swap-window-right" && entry.title === "KWin Ribbon: Swap Window Right"), true);
assert.equal(registered.some((entry) => entry.name === "kwin-ribbon-next-window-height" && entry.title === "KWin Ribbon: Next Window Height"), true);
assert.equal(registered.some((entry) => entry.name === "kwin-ribbon-reset-column-heights" && entry.title === "KWin Ribbon: Reset Column Heights"), true);
assert.equal(registered.some((entry) => entry.name === "kwin-ribbon-close-window" && entry.title === "KWin Ribbon: Close Window"), true);
registered.find((entry) => entry.name === "kwin-ribbon-focus-column-left").callback();
assert.equal(actionAdapter.state.lastTiledWindowId, "action-1");
assert.deepEqual(activated, ["action-1"]);
assert.equal(actionFirst.frameGeometry.width, 68);
assert.equal(registered.some((entry) => entry.name === "kwin-ribbon-maximize-column" && entry.title === "KWin Ribbon: Maximize Column"), true);

actionAdapter.dispatchAction("kwin-ribbon-maximize-column", { outputId: "screen-1", workspaceIndex: 0, area: { x: 0, y: 0, width: 100, height: 100 } });
const actionWorkspace = api.getWorkspace(actionAdapter.state, "screen-1", 0);
assert.equal(actionWorkspace.columns[actionWorkspace.focusColumn].fullWidth, true);
actionAdapter.dispatchAction("kwin-ribbon-center-column", { outputId: "screen-1", workspaceIndex: 0, area: { x: 0, y: 0, width: 100, height: 100 } });
assert.equal(actionAdapter.lastProjection().frames.length, 2);
actionAdapter.dispatchAction("kwin-ribbon-next-column-width", { outputId: "screen-1", workspaceIndex: 0, area: { x: 0, y: 0, width: 100, height: 100 } });
assert.equal(actionAdapter.debugSnapshot().lastAction.actionId, "kwin-ribbon-next-column-width");
assert.equal(actionAdapter.debugSnapshot().lastAction.projectedFrameCount, 2);

const closeActionFirst = { internalId: "close-action-1", output: "screen-1" };
const closeActionSecond = { internalId: "close-action-2", output: "screen-1" };
let closeActionWindows = [closeActionFirst, closeActionSecond];
let closeActionActive = closeActionSecond;
const closeActionClosed = [];
const closeActionAdapter = api.createKWinAdapter({
  getWindows: () => closeActionWindows,
  getActiveWindow: () => closeActionActive,
  closeWindow: (windowRef) => {
    closeActionClosed.push(windowRef.internalId);
    closeActionWindows = closeActionWindows.filter((entry) => entry !== windowRef);
    return true;
  },
  getArrangeArea: () => ({ x: 0, y: 0, width: 100, height: 100 })
});
closeActionAdapter.syncWindows();
api.focusWindowById(closeActionAdapter.state, "close-action-1");
assert.equal(closeActionAdapter.dispatchAction("kwin-ribbon-close-window", { outputId: "screen-1", workspaceIndex: 0 }), true);
assert.deepEqual(closeActionClosed, ["close-action-2"]);
assert.equal(closeActionAdapter.registry["close-action-2"], undefined);
assert.equal(closeActionAdapter.state.windowIndex["close-action-2"], undefined);
assert.deepEqual(plain(api.getWorkspace(closeActionAdapter.state, "screen-1", 0).columns.map((column) => column.windows)), [["close-action-1"]]);

const workspaceActionWindow = { internalId: "workspace-action", output: "screen-1" };
const workspaceActionDirections = [];
const workspaceActionAdapter = api.createKWinAdapter({
  getWindows: () => [workspaceActionWindow],
  getActiveWindow: () => workspaceActionWindow,
  focusWorkspace: (direction) => {
    workspaceActionDirections.push(direction);
    return true;
  },
  getArrangeArea: () => ({ x: 0, y: 0, width: 100, height: 100 })
});
workspaceActionAdapter.syncWindows();
assert.equal(workspaceActionAdapter.dispatchAction("kwin-ribbon-focus-workspace-up", { outputId: "screen-1", workspaceIndex: 0 }), true);
assert.equal(workspaceActionAdapter.dispatchAction("kwin-ribbon-focus-workspace-down", { outputId: "screen-1", workspaceIndex: 0 }), true);
assert.deepEqual(workspaceActionDirections, [-1, 1]);
assert.equal(workspaceActionAdapter.debugSnapshot().lastAction.actionId, "kwin-ribbon-focus-workspace-down");

const fullscreenSibling = { internalId: "fullscreen-sibling", output: "screen-1", frameGeometry: { x: 0, y: 0, width: 1, height: 1 } };
const fullscreenTarget = { internalId: "fullscreen-target", output: "screen-1", fullScreen: false };
const fullscreenRaised = [];
const fullscreenActivated = [];
const fullscreenAdapter = api.createKWinAdapter({
  getWindows: () => [fullscreenSibling, fullscreenTarget],
  getActiveWindow: () => fullscreenTarget,
  setWindowFullscreen: (windowRef, enabled) => {
    windowRef.fullScreen = enabled;
    return true;
  },
  raiseWindow: (windowRef) => {
    fullscreenRaised.push(windowRef.internalId);
    return true;
  },
  activateWindow: (windowRef) => {
    fullscreenActivated.push(windowRef.internalId);
    return true;
  },
  getArrangeArea: () => ({ x: 0, y: 0, width: 100, height: 100 })
});
fullscreenAdapter.handleWindowAdded(fullscreenSibling);
fullscreenAdapter.handleWindowAdded(fullscreenTarget);
fullscreenAdapter.dispatchAction("kwin-ribbon-fullscreen-window", { outputId: "screen-1", workspaceIndex: 0 });
assert.equal(fullscreenTarget.fullScreen, true);
assert.equal(fullscreenAdapter.state.fullscreen["fullscreen-target"], true);
assert.equal(fullscreenAdapter.state.windowIndex["fullscreen-target"], undefined);
assert.equal(fullscreenSibling.frameGeometry.width, 68);
assert.deepEqual(fullscreenRaised, ["fullscreen-target"]);
assert.deepEqual(fullscreenActivated, ["fullscreen-target"]);
fullscreenTarget.fullScreen = false;
fullscreenAdapter.syncWindows();
assert.equal(fullscreenAdapter.state.fullscreen["fullscreen-target"], true);
assert.equal(fullscreenAdapter.state.windowIndex["fullscreen-target"], undefined);
fullscreenAdapter.dispatchAction("kwin-ribbon-fullscreen-window", { outputId: "screen-1", workspaceIndex: 0 });
assert.equal(fullscreenTarget.fullScreen, false);
assert.equal(fullscreenAdapter.state.fullscreen["fullscreen-target"], undefined);
assert.equal(fullscreenAdapter.state.windowIndex["fullscreen-target"].columnIndex, 1);

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
assert.equal(api.getWorkspace(centerAdapter.state, "screen-1", 0).scrollOffset, -17);
assert.equal(centerAdapter.lastProjection().frames[0].frameGeometry.x, 33);

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
assert.equal(snapshot.actions.some((entry) => entry.name === "kwin-ribbon-focus-column-first"), true);
assert.equal(snapshot.actions.some((entry) => entry.name === "kwin-ribbon-move-window-bottom"), true);
assert.equal(snapshot.actions.some((entry) => entry.name === "kwin-ribbon-consume-or-expel-left"), true);
assert.equal(snapshot.actions.some((entry) => entry.name === "kwin-ribbon-swap-window-right"), true);
assert.equal(newlyWiredActionNames.every((name) => snapshot.actions.some((entry) => entry.name === name)), true);
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
