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

const added = { connect() {} };
const workspace = {
  windowAdded: added,
  windowList: () => [{ internalId: "one" }],
  activeWindow: { internalId: "one" },
  currentDesktop: { x11DesktopNumber: 2 },
  clientArea: (kind, outputId, desktop) => ({ x: desktop, y: 0, width: outputId === "screen-1" ? 100 : 1, height: 50 }),
  activateWindow(windowRef) {
    this.activated = windowRef;
  }
};
const registered = [];
const messages = [];
const env = api.createKWinEnvironment({
  workspace,
  registerShortcut: (name, title, shortcut, callback) => registered.push({ name, title, shortcut, callback }),
  readConfig: (key, defaultValue) => key === "gaps" ? 6 : defaultValue,
  print: (message) => messages.push(message)
});

assert.deepEqual(plain(env.getWindows()), [{ internalId: "one" }]);
assert.equal(env.getActiveWindow().internalId, "one");
assert.equal(env.getCurrentDesktopIndex(), 1);
assert.deepEqual(plain(env.getArrangeArea("screen-1", 1)), { x: 2, y: 0, width: 100, height: 50 });
assert.equal(env.activateWindow(win), true);
assert.equal(workspace.activated, win);
assert.equal(env.registerShortcut("name", "title", "", () => {}), true);
assert.equal(registered.length, 1);
assert.equal(api.readKWinOptions(env).gaps, 6);
env.print("loaded");
assert.deepEqual(messages, ["loaded"]);

const smokeAdapter = api.createKWinAdapter(env, api.readKWinOptions(env));
assert.doesNotThrow(() => smokeAdapter.start());
