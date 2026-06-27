"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "native", "wheelbridge.cpp"), "utf8");
const cmake = fs.readFileSync(path.join(root, "native", "CMakeLists.txt"), "utf8");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const metadata = JSON.parse(fs.readFileSync(path.join(root, "native", "metadata.json"), "utf8"));

const bindings = [
  ["kwin-ribbon-focus-window-or-column-up", "Qt::MetaModifier", "PointerAxisUp"],
  ["kwin-ribbon-focus-window-or-column-down", "Qt::MetaModifier", "PointerAxisDown"],
  ["kwin-ribbon-focus-workspace-up", "Qt::MetaModifier | Qt::ShiftModifier", "PointerAxisUp"],
  ["kwin-ribbon-focus-workspace-down", "Qt::MetaModifier | Qt::ShiftModifier", "PointerAxisDown"]
];

for (const [action, modifiers, axis] of bindings) {
  assert.match(source, new RegExp(`registerWheelAction\\(QStringLiteral\\("${action}"\\), ${modifiers.replace(/\|/g, "\\|")}, ${axis}\\);`));
}

assert.equal(source.includes("registerTouchpad"), false);
assert.equal(source.includes("Swipe"), false);
assert.match(cmake, /kcoreaddons_add_plugin\(kwin_ribbon_wheel_bridge/);
assert.match(cmake, /INSTALL_NAMESPACE "kwin\/plugins"/);
assert.equal(metadata.KPlugin.Id, "kwin_ribbon_wheel_bridge");
assert.equal(metadata.KPlugin.EnabledByDefault, true);
assert.equal(pkg.scripts["native:configure"], "cmake -S . -B build/native -DCMAKE_INSTALL_PREFIX=\"$HOME/.local\"");
assert.equal(pkg.scripts["native:build"], "cmake --build build/native");
assert.equal(pkg.scripts["native:install"], "cmake --install build/native --prefix \"$HOME/.local\"");
assert.equal(pkg.scripts["native:enable"], "kwriteconfig6 --file kwinrc --group Plugins --key kwin_ribbon_wheel_bridgeEnabled true");
