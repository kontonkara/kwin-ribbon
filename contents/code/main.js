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

    function nextId(state, key, prefix) {
        var next = state && typeof state[key] === "number" ? state[key] : 1;
        if (state) {
            state[key] = next + 1;
        }
        return prefix + next;
    }

    function normalizeWorkspaceIndex(value) {
        var index = parseInt(value, 10);
        if (!isFinite(index) || index < 0) {
            return 0;
        }
        return index;
    }

    function normalizeWindowIds(value) {
        var raw = value;
        var result = [];
        var seen = {};
        var i;
        var id;

        if (raw === undefined || raw === null) {
            return result;
        }
        if (!isArray(raw)) {
            raw = [raw];
        }
        for (i = 0; i < raw.length; i += 1) {
            id = String(raw[i] || "");
            if (id !== "" && !seen[id]) {
                seen[id] = true;
                result.push(id);
            }
        }
        return result;
    }

    function createWorkspace(state, name) {
        return {
            id: nextId(state, "nextWorkspaceId", "workspace-"),
            name: name ? String(name) : null,
            columns: [],
            focusColumn: 0,
            prevFocusColumn: -1,
            prevColumnOnRemoval: -1,
            scrollOffset: 0
        };
    }

    function createOutput(state, outputId) {
        var id = String(outputId || "default");
        return {
            id: id,
            currentWorkspaceIndex: 0,
            previousWorkspaceId: null,
            workspaceRenderIndex: 0,
            workspaces: [createWorkspace(state)]
        };
    }

    function ensureOutput(state, outputId) {
        var id = String(outputId || "default");
        if (!state.outputs[id]) {
            state.outputs[id] = createOutput(state, id);
        }
        return state.outputs[id];
    }

    function ensureWorkspace(state, outputId, workspaceIndex) {
        var output = ensureOutput(state, outputId);
        var index = normalizeWorkspaceIndex(workspaceIndex);
        while (output.workspaces.length <= index) {
            output.workspaces.push(createWorkspace(state));
        }
        return output.workspaces[index];
    }

    function getWorkspace(state, outputId, workspaceIndex) {
        var output = ensureOutput(state, outputId);
        var index = workspaceIndex;
        if (index === undefined || index === null) {
            index = output.currentWorkspaceIndex;
        }
        return ensureWorkspace(state, outputId, index);
    }

    function createColumn(state, windowIds, options) {
        var opts = options || {};
        var windows = normalizeWindowIds(windowIds);
        return {
            id: nextId(state, "nextColumnId", "column-"),
            width: clampRatio(opts.width === undefined ? state.options.defaultColumnWidth : opts.width),
            widthFixed: opts.widthFixed === true,
            fullWidth: opts.fullWidth === true,
            restoreWidth: null,
            restoreWidthFixed: null,
            windows: windows,
            focusWindow: windows.length > 0 ? 0 : -1,
            presetWidthIndex: -1,
            tabbed: normalizeColumnDisplay(opts.display || state.options.defaultColumnDisplay) === "tabbed",
            heightWeights: {}
        };
    }

    function createLocation(outputId, workspaceIndex, columnIndex, windowIndex) {
        return {
            outputId: String(outputId || "default"),
            workspaceIndex: normalizeWorkspaceIndex(workspaceIndex),
            columnIndex: Math.max(0, parseInt(columnIndex, 10) || 0),
            windowIndex: Math.max(0, parseInt(windowIndex, 10) || 0)
        };
    }

    function cloneColumn(column) {
        var weights = {};
        var key;
        for (key in column.heightWeights) {
            if (hasOwn(column.heightWeights, key)) {
                weights[key] = column.heightWeights[key];
            }
        }
        return {
            id: column.id,
            width: column.width,
            widthFixed: column.widthFixed,
            fullWidth: column.fullWidth,
            restoreWidth: column.restoreWidth,
            restoreWidthFixed: column.restoreWidthFixed,
            windows: column.windows.slice(0),
            focusWindow: column.focusWindow,
            presetWidthIndex: column.presetWidthIndex,
            tabbed: column.tabbed,
            heightWeights: weights
        };
    }

    function getExistingWorkspace(state, location) {
        var output = state.outputs[location.outputId];
        if (!output || !output.workspaces[location.workspaceIndex]) {
            return null;
        }
        return output.workspaces[location.workspaceIndex];
    }

    function focusedWindowId(workspace) {
        var column;
        if (!workspace || workspace.columns.length === 0) {
            return null;
        }
        column = workspace.columns[Math.max(0, Math.min(workspace.focusColumn, workspace.columns.length - 1))];
        if (!column || column.windows.length === 0) {
            return null;
        }
        return column.windows[Math.max(0, Math.min(column.focusWindow, column.windows.length - 1))] || null;
    }

    function updateLastTiledWindow(state, workspace) {
        var next = focusedWindowId(workspace);
        if (next && state.lastTiledWindowId !== next) {
            state.previousTiledWindowId = state.lastTiledWindowId;
            state.lastTiledWindowId = next;
        } else if (!next) {
            state.lastTiledWindowId = null;
        }
        return next;
    }

    function rebuildWorkspaceIndex(state, outputId, workspaceIndex, workspace) {
        var i;
        var j;
        var column;
        for (i = 0; i < workspace.columns.length; i += 1) {
            column = workspace.columns[i];
            for (j = 0; j < column.windows.length; j += 1) {
                state.windowIndex[column.windows[j]] = createLocation(outputId, workspaceIndex, i, j);
            }
        }
    }

    function removeFromStateBags(state, windowId) {
        delete state.floating[windowId];
        delete state.manualFloating[windowId];
        delete state.manualTiled[windowId];
        delete state.ruleFloating[windowId];
        delete state.fullscreen[windowId];
    }

    function removeWindowFromModel(state, windowId, keepParked) {
        var id = String(windowId || "");
        var location = state.windowIndex[id];
        var workspace;
        var column;
        var removedFocusedColumn;
        var preferredFocus;
        var nextFocus;

        if (id === "" || !location) {
            return null;
        }

        workspace = getExistingWorkspace(state, location);
        if (!workspace || !workspace.columns[location.columnIndex]) {
            delete state.windowIndex[id];
            if (!keepParked) {
                delete state.parked[id];
                removeFromStateBags(state, id);
            }
            return null;
        }

        column = workspace.columns[location.columnIndex];
        if (column.windows[location.windowIndex] !== id) {
            location.windowIndex = column.windows.indexOf(id);
        }
        if (location.windowIndex < 0) {
            delete state.windowIndex[id];
            if (!keepParked) {
                delete state.parked[id];
                removeFromStateBags(state, id);
            }
            return null;
        }

        removedFocusedColumn = workspace.focusColumn === location.columnIndex;
        column.windows.splice(location.windowIndex, 1);
        delete state.windowIndex[id];

        if (column.windows.length === 0) {
            workspace.columns.splice(location.columnIndex, 1);
            if (workspace.columns.length === 0) {
                workspace.focusColumn = 0;
            } else if (removedFocusedColumn && workspace.prevColumnOnRemoval >= 0) {
                preferredFocus = workspace.prevColumnOnRemoval;
                if (preferredFocus > location.columnIndex) {
                    preferredFocus -= 1;
                }
                workspace.focusColumn = Math.max(0, Math.min(preferredFocus, workspace.columns.length - 1));
            } else {
                nextFocus = removedFocusedColumn ? location.columnIndex : workspace.focusColumn;
                if (workspace.focusColumn > location.columnIndex) {
                    nextFocus = workspace.focusColumn - 1;
                }
                workspace.focusColumn = Math.max(0, Math.min(nextFocus, workspace.columns.length - 1));
            }
            workspace.prevColumnOnRemoval = -1;
        } else {
            if (column.focusWindow > location.windowIndex) {
                column.focusWindow -= 1;
            } else if (column.focusWindow >= column.windows.length) {
                column.focusWindow = column.windows.length - 1;
            }
            workspace.focusColumn = Math.max(0, Math.min(workspace.focusColumn, workspace.columns.length - 1));
        }

        rebuildWorkspaceIndex(state, location.outputId, location.workspaceIndex, workspace);
        updateLastTiledWindow(state, workspace);

        if (!keepParked) {
            delete state.parked[id];
            removeFromStateBags(state, id);
        }

        return location;
    }

    function addWindow(state, outputId, workspaceIndex, windowId, options) {
        var id = String(windowId || "");
        var workspace;
        var insertIndex;
        var previousFocus;
        var column;

        if (id === "") {
            return null;
        }
        if (state.windowIndex[id]) {
            return state.windowIndex[id];
        }

        workspace = ensureWorkspace(state, outputId, workspaceIndex);
        previousFocus = workspace.columns.length === 0 ? -1 : Math.max(0, Math.min(workspace.focusColumn, workspace.columns.length - 1));
        insertIndex = workspace.columns.length === 0 ? 0 : previousFocus + 1;
        column = createColumn(state, id, options);

        workspace.columns.splice(insertIndex, 0, column);
        workspace.prevFocusColumn = previousFocus;
        workspace.prevColumnOnRemoval = previousFocus;
        workspace.focusColumn = insertIndex;
        delete state.parked[id];

        rebuildWorkspaceIndex(state, String(outputId || "default"), normalizeWorkspaceIndex(workspaceIndex), workspace);
        updateLastTiledWindow(state, workspace);

        return state.windowIndex[id];
    }

    function removeWindow(state, windowId) {
        return removeWindowFromModel(state, windowId, false);
    }

    function parkWindow(state, windowId, reason) {
        var id = String(windowId || "");
        var location = state.windowIndex[id];
        var workspace;
        var column;

        if (id === "") {
            return null;
        }
        if (!location) {
            return state.parked[id] || null;
        }

        workspace = getExistingWorkspace(state, location);
        if (!workspace || !workspace.columns[location.columnIndex]) {
            return null;
        }
        column = workspace.columns[location.columnIndex];
        state.parked[id] = {
            reason: reason ? String(reason) : "parked",
            outputId: location.outputId,
            workspaceIndex: location.workspaceIndex,
            columnIndex: location.columnIndex,
            windowIndex: location.windowIndex,
            column: cloneColumn(column)
        };

        removeWindowFromModel(state, id, true);
        return state.parked[id];
    }

    function findColumnIndexById(workspace, columnId) {
        var i;
        for (i = 0; i < workspace.columns.length; i += 1) {
            if (workspace.columns[i].id === columnId) {
                return i;
            }
        }
        return -1;
    }

    function restoreWindow(state, windowId) {
        var id = String(windowId || "");
        var placement = state.parked[id];
        var workspace;
        var columnIndex;
        var column;
        var insertIndex;
        var weight;

        if (id === "") {
            return null;
        }
        if (state.windowIndex[id]) {
            delete state.parked[id];
            return state.windowIndex[id];
        }
        if (!placement) {
            return null;
        }

        workspace = ensureWorkspace(state, placement.outputId, placement.workspaceIndex);
        columnIndex = findColumnIndexById(workspace, placement.column.id);
        if (columnIndex >= 0) {
            column = workspace.columns[columnIndex];
            insertIndex = Math.max(0, Math.min(placement.windowIndex, column.windows.length));
            column.windows.splice(insertIndex, 0, id);
            column.focusWindow = insertIndex;
        } else {
            column = cloneColumn(placement.column);
            weight = column.heightWeights[id];
            column.windows = [id];
            column.focusWindow = 0;
            column.heightWeights = {};
            if (weight !== undefined) {
                column.heightWeights[id] = weight;
            }
            columnIndex = Math.max(0, Math.min(placement.columnIndex, workspace.columns.length));
            workspace.columns.splice(columnIndex, 0, column);
        }

        workspace.focusColumn = columnIndex;
        workspace.prevFocusColumn = -1;
        workspace.prevColumnOnRemoval = -1;
        delete state.parked[id];

        rebuildWorkspaceIndex(state, placement.outputId, placement.workspaceIndex, workspace);
        updateLastTiledWindow(state, workspace);

        return state.windowIndex[id];
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
            createState: createState,
            createWorkspace: createWorkspace,
            createOutput: createOutput,
            ensureOutput: ensureOutput,
            ensureWorkspace: ensureWorkspace,
            getWorkspace: getWorkspace,
            createColumn: createColumn,
            createLocation: createLocation,
            addWindow: addWindow,
            removeWindow: removeWindow,
            parkWindow: parkWindow,
            restoreWindow: restoreWindow
        };
    }

    root.KWinRibbon = createApi();

}(this));
