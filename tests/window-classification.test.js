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

assert.equal(api.windowIdFromWindow({ internalId: "win-1" }), "win-1");
assert.equal(api.windowIdFromWindow({}, "fallback-1"), "fallback-1");
assert.equal(api.outputIdFromWindow({ output: { name: "HDMI-A-1" } }), "HDMI-A-1");
assert.equal(api.outputIdFromWindow({ screen: "screen-1" }), "screen-1");
assert.equal(api.workspaceIndexFromWindow({ desktop: { x11DesktopNumber: 3 } }), 2);

assert.deepEqual(plain(api.classifyWindow({
  internalId: "normal",
  normalWindow: true,
  output: { name: "HDMI-A-1" },
  desktop: { x11DesktopNumber: 2 }
})), {
  windowId: "normal",
  outputId: "HDMI-A-1",
  workspaceIndex: 1,
  action: "tile",
  reason: "normal",
  manageable: true,
  fullscreen: false
});

assert.equal(api.classifyWindow(null).reason, "missing-window");
assert.equal(api.classifyWindow({ normalWindow: true }).reason, "missing-id");
assert.equal(api.classifyWindow({ internalId: "dock", dock: true }).reason, "special-window");
assert.equal(api.classifyWindow({ internalId: "skip", skipTaskbar: true }).reason, "skipped-window");
assert.equal(api.classifyWindow({ internalId: "fixed", resizable: false }).reason, "fixed-window");
assert.equal(api.classifyWindow({ internalId: "gone", deleted: true }).reason, "unmanaged");

assert.deepEqual(plain(api.classifyWindow({ internalId: "min", minimized: true })), {
  windowId: "min",
  outputId: "default",
  workspaceIndex: 0,
  action: "park",
  reason: "temporarily-unavailable",
  manageable: true,
  fullscreen: false
});

assert.deepEqual(plain(api.classifyWindow({ internalId: "full", fullScreen: true })), {
  windowId: "full",
  outputId: "default",
  workspaceIndex: 0,
  action: "fullscreen",
  reason: "fullscreen",
  manageable: true,
  fullscreen: true
});
