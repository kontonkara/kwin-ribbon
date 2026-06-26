/*
 * SPDX-License-Identifier: MIT
 *
 * Generated into contents/code/main.js by scripts/build.js.
 * Scrollable column tiling for KWin.
 */
(function (root) {
    "use strict";

    var VERSION = "0.1.0";

    var DEFAULTS = {
        gaps: 16,
        presetColumnWidths: [1 / 3, 1 / 2, 2 / 3],
        presetWindowHeights: [1 / 3, 1 / 2, 2 / 3],
        defaultColumnWidth: 1,
        defaultColumnDisplay: "normal",
        centerFocusedColumn: "never",
        alwaysCenterSingleColumn: false,
        tileNewWindows: true,
        enableWindowManagementShortcuts: true,
        debugLogging: false
    };

    var CENTER_FOCUSED_COLUMN_MODES = {
        "never": true,
        "always": true,
        "on-overflow": true
    };

    function hasOwn(object, key) {
        return Object.prototype.hasOwnProperty.call(object, key);
    }

    function isArray(value) {
        return Object.prototype.toString.call(value) === "[object Array]";
    }

    function clampRatio(value) {
        var number = parseFloat(value);
        if (!isFinite(number) || number <= 0) {
            return 1;
        }
        return Math.max(0.1, Math.min(1.5, number));
    }

    function normalizePresetRatios(value) {
        var raw = value;
        var result = [];
        var i;

        if (typeof raw === "string") {
            raw = raw.split(",");
        }
        if (!isArray(raw)) {
            raw = DEFAULTS.presetColumnWidths;
        }
        for (i = 0; i < raw.length; i += 1) {
            result.push(clampRatio(raw[i]));
        }
        if (result.length === 0) {
            result = DEFAULTS.presetColumnWidths.slice(0);
        }
        return result;
    }

    function normalizeColumnDisplay(value) {
        return String(value || "normal") === "tabbed" ? "tabbed" : "normal";
    }

    function normalizeCenterFocusedColumn(value) {
        var mode = String(value || "never").toLowerCase();
        return CENTER_FOCUSED_COLUMN_MODES[mode] ? mode : "never";
    }

    function copyOptions(options) {
        var out = {};
        var key;

        for (key in DEFAULTS) {
            if (hasOwn(DEFAULTS, key)) {
                out[key] = DEFAULTS[key];
            }
        }

        options = options || {};
        for (key in options) {
            if (hasOwn(options, key)) {
                out[key] = options[key];
            }
        }

        out.gaps = Math.max(0, parseInt(out.gaps, 10) || 0);
        out.presetColumnWidths = normalizePresetRatios(out.presetColumnWidths);
        out.presetWindowHeights = normalizePresetRatios(out.presetWindowHeights);
        out.defaultColumnWidth = clampRatio(out.defaultColumnWidth);
        out.defaultColumnDisplay = normalizeColumnDisplay(out.defaultColumnDisplay);
        out.centerFocusedColumn = normalizeCenterFocusedColumn(out.centerFocusedColumn);
        out.alwaysCenterSingleColumn = out.alwaysCenterSingleColumn === true;
        out.tileNewWindows = out.tileNewWindows !== false;
        out.enableWindowManagementShortcuts = out.enableWindowManagementShortcuts !== false;
        out.debugLogging = out.debugLogging === true;

        return out;
    }

    function createState(options) {
        return {
            options: copyOptions(options),
            outputs: {},
            windowIndex: {},
            parked: {},
            floating: {},
            manualFloating: {},
            manualTiled: {},
            ruleFloating: {},
            fullscreen: {},
            lastTiledWindowId: null,
            lastFloatingWindowId: null,
            previousTiledWindowId: null,
            nextColumnId: 1,
            nextWorkspaceId: 1
        };
    }

    function createApi() {
        return {
            version: VERSION,
            defaults: copyOptions(),
            copyOptions: copyOptions,
            createState: createState
        };
    }

    root.KWinRibbon = createApi();

}(this));
