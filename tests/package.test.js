"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

const pkg = readJson("package.json");
const metadata = readJson("metadata.json");
const config = fs.readFileSync(path.join(root, "contents", "config", "main.xml"), "utf8");
const mainScript = fs.readFileSync(path.join(root, "contents", "code", "main.js"), "utf8");
const cmake = fs.readFileSync(path.join(root, "CMakeLists.txt"), "utf8");
const packageNix = fs.readFileSync(path.join(root, "package.nix"), "utf8");

assert.equal(pkg.name, "kwin-ribbon");
assert.equal(pkg.license, "MIT");
assert.equal(metadata.KPackageStructure, "KWin/Script");
assert.equal(metadata.KPlugin.Id, "kwin-ribbon");
assert.equal(metadata["X-Plasma-API"], "javascript");
assert.equal(metadata["X-Plasma-MainScript"], "code/main.js");
assert.match(config, /<entry name="debugLogging" type="Bool">/);
assert.match(config, /<entry name="enableWindowManagementShortcuts" type="Bool">/);
assert.match(config, /<entry name="enableDefaultDevelopmentShortcuts" type="Bool">/);
assert.match(mainScript, /root\.KWinRibbon = createApi\(\);/);
assert.match(cmake, /install\(FILES metadata\.json DESTINATION \$\{KDE_INSTALL_DATADIR\}\/kwin\/scripts\/kwin-ribbon\)/);
assert.match(cmake, /install\(DIRECTORY contents DESTINATION \$\{KDE_INSTALL_DATADIR\}\/kwin\/scripts\/kwin-ribbon\)/);
assert.match(packageNix, /node scripts\/build\.js/);
assert.match(packageNix, /test -f "\$out\/share\/kwin\/scripts\/kwin-ribbon\/metadata\.json"/);
assert.match(packageNix, /test -f "\$out\/share\/kwin\/scripts\/kwin-ribbon\/contents\/code\/main\.js"/);
assert.match(packageNix, /kwin_ribbon_wheel_bridge\*\.so/);
