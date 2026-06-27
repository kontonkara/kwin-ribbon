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

const outerState = api.createState({ gaps: 16 });
api.addWindow(outerState, "screen-1", 0, "single");
const outerProjection = api.projectArrangeScope(outerState, {
  outputId: "screen-1",
  workspaceIndex: 0,
  area: { x: 0, y: 0, width: 1000, height: 800 }
});
assert.deepEqual(plain(outerProjection.contentArea), { x: 16, y: 16, width: 968, height: 768 });
assert.deepEqual(plain(outerProjection.frames), [
  { windowId: "single", frameGeometry: { x: 16, y: 16, width: 968, height: 768 } }
]);

const originState = api.createState({ gaps: 16 });
api.addWindow(originState, "screen-1", 0, "origin");
assert.deepEqual(plain(api.projectArrangeScope(originState, {
  outputId: "screen-1",
  workspaceIndex: 0,
  area: { x: 10, y: 20, width: 1000, height: 800 }
}).frames), [
  { windowId: "origin", frameGeometry: { x: 26, y: 36, width: 968, height: 768 } }
]);

const state = api.createState({ gaps: 10 });
const workspace = api.ensureWorkspace(state, "screen-1", 0);
const left = api.createColumn(state, ["a", "b"], { width: 100, widthFixed: true });
const right = api.createColumn(state, ["c"], { width: 100, widthFixed: true });
left.heightWeights = { a: 1, b: 3 };
workspace.columns.push(left, right);
workspace.scrollOffset = 20;

const stackedProjection = api.projectArrangeScope(state, {
  outputId: "screen-1",
  workspaceIndex: 0,
  area: { x: 5, y: 7, width: 250, height: 210 }
});
assert.deepEqual(plain(stackedProjection.contentArea), { x: 15, y: 17, width: 230, height: 190 });
assert.deepEqual(plain(stackedProjection.frames), [
  { windowId: "a", frameGeometry: { x: 15, y: 17, width: 100, height: 45 } },
  { windowId: "b", frameGeometry: { x: 15, y: 72, width: 100, height: 135 } },
  { windowId: "c", frameGeometry: { x: 125, y: 17, width: 100, height: 190 } }
]);
assert.equal(workspace.scrollOffset, 0);

right.tabbed = true;
right.windows.push("d");
assert.deepEqual(plain(api.projectArrangeScope(state, {
  outputId: "screen-1",
  workspaceIndex: 0,
  area: { x: 0, y: 0, width: 250, height: 100 },
  gap: 5
}).frames.slice(2)), [
  { windowId: "c", frameGeometry: { x: 110, y: 5, width: 100, height: 90 } },
  { windowId: "d", frameGeometry: { x: 110, y: 5, width: 100, height: 90 } }
]);

const scrollState = api.createState({ gaps: 0 });
api.addWindow(scrollState, "screen-1", 0, "one");
api.addWindow(scrollState, "screen-1", 0, "two");
api.addWindow(scrollState, "screen-1", 0, "three");
const scrollWorkspace = api.getWorkspace(scrollState, "screen-1", 0);
scrollWorkspace.columns.forEach((column) => {
  column.fullWidth = true;
});
api.focusWindowById(scrollState, "one");
const initialFrames = plain(api.projectArrangeScope(scrollState, {
  outputId: "screen-1",
  workspaceIndex: 0,
  area: { x: 0, y: 0, width: 100, height: 50 }
}).frames);
assert.equal(scrollWorkspace.scrollOffset, 0);
api.focusColumnRight(scrollState, "screen-1", 0);
const focusedFrames = plain(api.projectArrangeScope(scrollState, {
  outputId: "screen-1",
  workspaceIndex: 0,
  area: { x: 0, y: 0, width: 100, height: 50 }
}).frames);
assert.equal(scrollWorkspace.scrollOffset, 100);
assert.notDeepEqual(focusedFrames, initialFrames);
assert.deepEqual(focusedFrames.map((frame) => frame.frameGeometry.x), [-100, 0, 100]);
api.focusColumnLeft(scrollState, "screen-1", 0);
api.projectArrangeScope(scrollState, {
  outputId: "screen-1",
  workspaceIndex: 0,
  area: { x: 0, y: 0, width: 100, height: 50 }
});
assert.equal(scrollWorkspace.scrollOffset, 0);

const focusedGapState = api.createState({ gaps: 16 });
api.addWindow(focusedGapState, "screen-1", 0, "first");
api.addWindow(focusedGapState, "screen-1", 0, "second");
api.focusColumnRight(focusedGapState, "screen-1", 0);
const focusedGapFrames = plain(api.projectArrangeScope(focusedGapState, {
  outputId: "screen-1",
  workspaceIndex: 0,
  area: { x: 0, y: 0, width: 100, height: 50 }
}).frames);
assert.equal(api.getWorkspace(focusedGapState, "screen-1", 0).scrollOffset, 84);
assert.deepEqual(focusedGapFrames.map((frame) => frame.frameGeometry.x), [-68, 16]);
assert.deepEqual(focusedGapFrames[1].frameGeometry, { x: 16, y: 16, width: 68, height: 18 });
