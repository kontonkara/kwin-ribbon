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

assert.equal(api.isKWinRuntime({}), false);
assert.equal(api.isKWinRuntime({ workspace: {} }), true);

const fallbackEnv = api.createKWinEnvironment({});
assert.deepEqual(plain(fallbackEnv.getWindows()), []);
assert.equal(fallbackEnv.getActiveWindow(), null);
assert.deepEqual(plain(fallbackEnv.getArrangeArea("missing", 0)), { x: 0, y: 0, width: 1, height: 1 });

const win = {};
assert.equal(fallbackEnv.setFrameGeometry(win, { x: 0, y: 0, width: 0, height: 10 }), false);
assert.equal(win.frameGeometry, undefined);
assert.equal(fallbackEnv.setFrameGeometry(win, { x: 1, y: 2, width: 3, height: 4 }), true);
assert.deepEqual(plain(win.frameGeometry), { x: 1, y: 2, width: 3, height: 4 });
assert.equal(fallbackEnv.setWindowFullscreen(win, true), true);
assert.equal(win.fullScreen, true);
const blockedFrameWindow = {};
Object.defineProperty(blockedFrameWindow, "frameGeometry", {
  set() {
    throw new Error("blocked");
  }
});
assert.equal(fallbackEnv.setFrameGeometry(blockedFrameWindow, { x: 1, y: 2, width: 3, height: 4 }), false);

const added = { connect() {} };
const desktop = { x11DesktopNumber: 2 };
const screen = { name: "screen-1", geometry: { x: 0, y: 0, width: 1920, height: 1080 } };
const workspace = {
  windowAdded: added,
  windowList: () => [{ internalId: "one" }],
  activeWindow: { internalId: "one" },
  currentDesktop: desktop,
  screens: [screen],
  clientArea: (kind, output, requestedDesktop) => {
    if (kind === 98 && output === screen && requestedDesktop === desktop) {
      return { x: 0, y: 0, width: 1920, height: 1040 };
    }
    return screen.geometry;
  },
  activateWindow(windowRef) {
    this.activated = windowRef;
  }
};
const registered = [];
const messages = [];
const env = api.createKWinEnvironment({
  KWin: { PlacementArea: 97, WorkArea: 98, MovementArea: 99, MaximizeArea: 100 },
  workspace,
  registerShortcut: (name, title, shortcut, callback) => registered.push({ name, title, shortcut, callback }),
  readConfig: (key, defaultValue) => key === "gaps" ? 6 : (key === "debugLogging" ? true : defaultValue),
  print: (message) => messages.push(message)
});

assert.deepEqual(plain(env.getWindows()), [{ internalId: "one" }]);
assert.equal(env.getActiveWindow().internalId, "one");
assert.equal(env.getCurrentDesktopIndex(), 1);
assert.deepEqual(plain(env.getArrangeArea("screen-1", 1)), { x: 0, y: 0, width: 1920, height: 1040 });
assert.equal(env.lastClientArea.path, "WorkArea:output-desktop");
assert.notEqual(env.lastClientArea.area.height, screen.geometry.height);
assert.equal(messages.some((message) => message.indexOf("kwin-ribbon client area path=WorkArea:output-desktop") >= 0), true);
assert.equal(env.activateWindow(win), true);
assert.equal(workspace.activated, win);
const closeMethodWindow = {
  internalId: "close-method",
  closeWindow() {
    this.closed = true;
  }
};
assert.equal(env.closeWindow(closeMethodWindow), true);
assert.equal(closeMethodWindow.closed, true);
const blockedCloseWindow = {
  internalId: "blocked-close",
  closeable: false,
  closeWindow() {
    this.closed = true;
  }
};
assert.equal(env.closeWindow(blockedCloseWindow), false);
assert.equal(blockedCloseWindow.closed, undefined);
const workspaceCloseWindow = { internalId: "workspace-close" };
workspace.closeWindow = (windowRef) => {
  workspace.closed = windowRef;
};
assert.equal(env.closeWindow(workspaceCloseWindow), true);
assert.equal(workspace.closed, workspaceCloseWindow);
assert.equal(env.registerShortcut("name", "title", "", () => {}), true);
assert.equal(registered.length, 1);
assert.equal(registered[0].name, "name");
assert.equal(registered[0].title, "title");
assert.equal(registered[0].shortcut, "");

const navDesktops = [{ x11DesktopNumber: 1 }, { x11DesktopNumber: 2 }, { x11DesktopNumber: 3 }];
const navWorkspace = {
  desktops: navDesktops,
  currentDesktop: navDesktops[1]
};
const navEnv = api.createKWinEnvironment({ workspace: navWorkspace });
assert.equal(navEnv.focusWorkspace(-1), true);
assert.equal(navWorkspace.currentDesktop, navDesktops[0]);
assert.equal(navEnv.focusWorkspace(-1), false);
assert.equal(navEnv.focusWorkspace(1), true);
assert.equal(navWorkspace.currentDesktop, navDesktops[1]);
assert.equal(api.readKWinOptions(env).gaps, 6);
assert.equal(api.readKWinOptions(env).enableDefaultDevelopmentShortcuts, false);
env.print("loaded");
assert.equal(messages[messages.length - 1], "loaded");

const smokeAdapter = api.createKWinAdapter(env, api.readKWinOptions(env));
assert.doesNotThrow(() => smokeAdapter.start());
