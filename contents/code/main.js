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

    function clampFixedWidth(value) {
        var number = parseFloat(value);
        if (!isFinite(number) || number <= 0) {
            return 1;
        }
        return Math.max(1, number);
    }

    function clampHeightWeight(value) {
        var number = parseFloat(value);
        if (!isFinite(number) || number <= 0) {
            return 1;
        }
        return Math.max(0.01, Math.min(100, number));
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

    function pruneHeightWeights(column) {
        var keep = {};
        var next = {};
        var i;
        var id;

        if (!column || !column.heightWeights) {
            return;
        }
        if (column.windows.length <= 1) {
            column.heightWeights = {};
            return;
        }
        for (i = 0; i < column.windows.length; i += 1) {
            keep[column.windows[i]] = true;
        }
        for (id in column.heightWeights) {
            if (hasOwn(column.heightWeights, id) && keep[id]) {
                next[id] = column.heightWeights[id];
            }
        }
        column.heightWeights = next;
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
        delete column.heightWeights[id];
        pruneHeightWeights(column);
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
            weight = placement.column.heightWeights[id];
            if (weight !== undefined) {
                column.heightWeights[id] = weight;
            }
            pruneHeightWeights(column);
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

    function clampIndex(index, length) {
        if (length <= 0) {
            return -1;
        }
        return Math.max(0, Math.min(parseInt(index, 10) || 0, length - 1));
    }

    function focusedLocation(state, workspace) {
        var id = focusedWindowId(workspace);
        return id ? state.windowIndex[id] || null : null;
    }

    function workspaceRef(state, outputId, workspaceIndex) {
        var output = ensureOutput(state, outputId);
        var index = workspaceIndex;
        if (index === undefined || index === null) {
            index = output.currentWorkspaceIndex;
        }
        index = normalizeWorkspaceIndex(index);
        return {
            outputId: output.id,
            workspaceIndex: index,
            workspace: ensureWorkspace(state, output.id, index)
        };
    }

    function focusedColumnRef(state, outputId, workspaceIndex) {
        var ref = workspaceRef(state, outputId, workspaceIndex);
        var index;

        if (ref.workspace.columns.length === 0) {
            return null;
        }
        index = clampIndex(ref.workspace.focusColumn, ref.workspace.columns.length);
        ref.workspace.focusColumn = index;
        return {
            outputId: ref.outputId,
            workspaceIndex: ref.workspaceIndex,
            workspace: ref.workspace,
            columnIndex: index,
            column: ref.workspace.columns[index]
        };
    }

    function focusedWindowRef(state, outputId, workspaceIndex) {
        var ref = focusedColumnRef(state, outputId, workspaceIndex);
        var index;
        var windowId;

        if (!ref || ref.column.windows.length === 0) {
            return null;
        }
        index = clampIndex(ref.column.focusWindow, ref.column.windows.length);
        ref.column.focusWindow = index;
        windowId = ref.column.windows[index];
        return {
            outputId: ref.outputId,
            workspaceIndex: ref.workspaceIndex,
            workspace: ref.workspace,
            columnIndex: ref.columnIndex,
            column: ref.column,
            windowIndex: index,
            windowId: windowId
        };
    }

    function sameNumber(a, b) {
        return Math.abs(parseFloat(a) - parseFloat(b)) < 0.000001;
    }

    function presetIndexForWidth(state, width, fixed) {
        var presets = state.options.presetColumnWidths;
        var i;
        if (fixed) {
            return -1;
        }
        for (i = 0; i < presets.length; i += 1) {
            if (sameNumber(width, presets[i])) {
                return i;
            }
        }
        return -1;
    }

    function applyColumnWidth(state, column, width, fixed) {
        var widthFixed = fixed === true;
        column.width = widthFixed ? clampFixedWidth(width) : clampRatio(width);
        column.widthFixed = widthFixed;
        column.fullWidth = false;
        column.restoreWidth = null;
        column.restoreWidthFixed = null;
        column.presetWidthIndex = presetIndexForWidth(state, column.width, column.widthFixed);
        return column;
    }

    function choosePresetIndex(state, column, direction) {
        var presets = state.options.presetColumnWidths;
        var current = parseInt(column.presetWidthIndex, 10);
        var i;

        if (presets.length === 0) {
            return -1;
        }
        if (!isFinite(direction) || direction === 0) {
            direction = 1;
        }
        direction = direction < 0 ? -1 : 1;
        if (current >= 0 && current < presets.length) {
            return (current + direction + presets.length) % presets.length;
        }
        if (direction > 0) {
            for (i = 0; i < presets.length; i += 1) {
                if (column.widthFixed || presets[i] > column.width) {
                    return i;
                }
            }
            return 0;
        }
        for (i = presets.length - 1; i >= 0; i -= 1) {
            if (column.widthFixed || presets[i] < column.width) {
                return i;
            }
        }
        return presets.length - 1;
    }

    function setColumnWidth(state, outputId, workspaceIndex, width) {
        var ref = focusedColumnRef(state, outputId, workspaceIndex);
        return ref ? applyColumnWidth(state, ref.column, width, false) : null;
    }

    function adjustColumnWidth(state, outputId, workspaceIndex, delta) {
        var ref = focusedColumnRef(state, outputId, workspaceIndex);
        var base;
        if (!ref) {
            return null;
        }
        base = ref.column.widthFixed ? state.options.defaultColumnWidth : ref.column.width;
        return applyColumnWidth(state, ref.column, base + (parseFloat(delta) || 0), false);
    }

    function setColumnFixedWidth(state, outputId, workspaceIndex, width) {
        var ref = focusedColumnRef(state, outputId, workspaceIndex);
        return ref ? applyColumnWidth(state, ref.column, width, true) : null;
    }

    function adjustColumnFixedWidth(state, outputId, workspaceIndex, delta) {
        var ref = focusedColumnRef(state, outputId, workspaceIndex);
        var base;
        if (!ref) {
            return null;
        }
        base = ref.column.widthFixed ? ref.column.width : 1;
        return applyColumnWidth(state, ref.column, base + (parseFloat(delta) || 0), true);
    }

    function switchPresetColumnWidth(state, outputId, workspaceIndex, direction) {
        var ref = focusedColumnRef(state, outputId, workspaceIndex);
        var index;
        if (!ref) {
            return null;
        }
        index = choosePresetIndex(state, ref.column, parseInt(direction, 10));
        if (index < 0) {
            return ref.column;
        }
        applyColumnWidth(state, ref.column, state.options.presetColumnWidths[index], false);
        ref.column.presetWidthIndex = index;
        return ref.column;
    }

    function switchPresetColumnWidthBack(state, outputId, workspaceIndex) {
        return switchPresetColumnWidth(state, outputId, workspaceIndex, -1);
    }

    function toggleColumnFullWidth(state, outputId, workspaceIndex) {
        var ref = focusedColumnRef(state, outputId, workspaceIndex);
        var column;
        if (!ref) {
            return null;
        }
        column = ref.column;
        if (column.fullWidth) {
            column.fullWidth = false;
            if (column.restoreWidth !== null && column.restoreWidth !== undefined) {
                column.width = column.restoreWidthFixed ? clampFixedWidth(column.restoreWidth) : clampRatio(column.restoreWidth);
                column.widthFixed = column.restoreWidthFixed === true;
            }
            column.restoreWidth = null;
            column.restoreWidthFixed = null;
            column.presetWidthIndex = presetIndexForWidth(state, column.width, column.widthFixed);
            return column;
        }
        column.restoreWidth = column.width;
        column.restoreWidthFixed = column.widthFixed;
        column.fullWidth = true;
        return column;
    }

    function presetIndexForHeight(state, height) {
        var presets = state.options.presetWindowHeights;
        var i;
        for (i = 0; i < presets.length; i += 1) {
            if (sameNumber(height, presets[i])) {
                return i;
            }
        }
        return -1;
    }

    function chooseHeightPresetIndex(state, column, windowId, direction) {
        var presets = state.options.presetWindowHeights;
        var currentHeight = column.heightWeights[windowId] || 1;
        var current = presetIndexForHeight(state, currentHeight);
        var i;

        if (presets.length === 0) {
            return -1;
        }
        if (!isFinite(direction) || direction === 0) {
            direction = 1;
        }
        direction = direction < 0 ? -1 : 1;
        if (current >= 0) {
            return (current + direction + presets.length) % presets.length;
        }
        if (direction > 0) {
            for (i = 0; i < presets.length; i += 1) {
                if (presets[i] > currentHeight) {
                    return i;
                }
            }
            return 0;
        }
        for (i = presets.length - 1; i >= 0; i -= 1) {
            if (presets[i] < currentHeight) {
                return i;
            }
        }
        return presets.length - 1;
    }

    function setWindowHeight(state, outputId, workspaceIndex, height) {
        var ref = focusedWindowRef(state, outputId, workspaceIndex);
        if (!ref) {
            return null;
        }
        if (ref.column.windows.length <= 1) {
            ref.column.heightWeights = {};
            return focusedLocation(state, ref.workspace);
        }
        ref.column.heightWeights[ref.windowId] = clampHeightWeight(height);
        pruneHeightWeights(ref.column);
        return focusedLocation(state, ref.workspace);
    }

    function adjustWindowHeight(state, outputId, workspaceIndex, delta) {
        var ref = focusedWindowRef(state, outputId, workspaceIndex);
        var base;
        if (!ref) {
            return null;
        }
        base = ref.column.heightWeights[ref.windowId] || 1;
        return setWindowHeight(state, outputId, workspaceIndex, base + (parseFloat(delta) || 0));
    }

    function switchPresetWindowHeight(state, outputId, workspaceIndex, direction) {
        var ref = focusedWindowRef(state, outputId, workspaceIndex);
        var index;
        if (!ref) {
            return null;
        }
        if (ref.column.windows.length <= 1) {
            ref.column.heightWeights = {};
            return focusedLocation(state, ref.workspace);
        }
        index = chooseHeightPresetIndex(state, ref.column, ref.windowId, parseInt(direction, 10));
        if (index < 0) {
            return focusedLocation(state, ref.workspace);
        }
        ref.column.heightWeights[ref.windowId] = state.options.presetWindowHeights[index];
        pruneHeightWeights(ref.column);
        return focusedLocation(state, ref.workspace);
    }

    function switchPresetWindowHeightBack(state, outputId, workspaceIndex) {
        return switchPresetWindowHeight(state, outputId, workspaceIndex, -1);
    }

    function resetWindowHeight(state, outputId, workspaceIndex) {
        var ref = focusedWindowRef(state, outputId, workspaceIndex);
        if (!ref) {
            return null;
        }
        if (ref.column.tabbed) {
            ref.column.heightWeights = {};
        } else {
            delete ref.column.heightWeights[ref.windowId];
            pruneHeightWeights(ref.column);
        }
        return focusedLocation(state, ref.workspace);
    }

    function resetColumnHeights(state, outputId, workspaceIndex) {
        var ref = focusedColumnRef(state, outputId, workspaceIndex);
        if (!ref) {
            return null;
        }
        ref.column.heightWeights = {};
        return focusedLocation(state, ref.workspace);
    }

    function focusColumnAt(state, outputId, workspaceIndex, targetIndex) {
        var workspace = getWorkspace(state, outputId, workspaceIndex);
        var previousFocus;
        var nextFocus;
        var column;

        if (workspace.columns.length === 0) {
            return null;
        }

        previousFocus = clampIndex(workspace.focusColumn, workspace.columns.length);
        nextFocus = clampIndex(targetIndex, workspace.columns.length);
        if (nextFocus !== previousFocus) {
            workspace.prevFocusColumn = previousFocus;
            workspace.prevColumnOnRemoval = -1;
        }
        workspace.focusColumn = nextFocus;
        column = workspace.columns[nextFocus];
        column.focusWindow = clampIndex(column.focusWindow, column.windows.length);
        updateLastTiledWindow(state, workspace);
        return focusedLocation(state, workspace);
    }

    function focusColumnLeft(state, outputId, workspaceIndex) {
        var workspace = getWorkspace(state, outputId, workspaceIndex);
        return focusColumnAt(state, outputId, workspaceIndex, workspace.focusColumn - 1);
    }

    function focusColumnRight(state, outputId, workspaceIndex) {
        var workspace = getWorkspace(state, outputId, workspaceIndex);
        return focusColumnAt(state, outputId, workspaceIndex, workspace.focusColumn + 1);
    }

    function focusFirstColumn(state, outputId, workspaceIndex) {
        return focusColumnAt(state, outputId, workspaceIndex, 0);
    }

    function focusLastColumn(state, outputId, workspaceIndex) {
        var workspace = getWorkspace(state, outputId, workspaceIndex);
        return focusColumnAt(state, outputId, workspaceIndex, workspace.columns.length - 1);
    }

    function focusColumnByIndex(state, outputId, workspaceIndex, index) {
        return focusColumnAt(state, outputId, workspaceIndex, (parseInt(index, 10) || 1) - 1);
    }

    function focusWindowAt(state, outputId, workspaceIndex, targetIndex) {
        var workspace = getWorkspace(state, outputId, workspaceIndex);
        var column;

        if (workspace.columns.length === 0) {
            return null;
        }
        workspace.focusColumn = clampIndex(workspace.focusColumn, workspace.columns.length);
        column = workspace.columns[workspace.focusColumn];
        if (!column || column.windows.length === 0) {
            return null;
        }
        column.focusWindow = clampIndex(targetIndex, column.windows.length);
        updateLastTiledWindow(state, workspace);
        return focusedLocation(state, workspace);
    }

    function focusWindowUp(state, outputId, workspaceIndex) {
        var workspace = getWorkspace(state, outputId, workspaceIndex);
        var column = workspace.columns[clampIndex(workspace.focusColumn, workspace.columns.length)];
        return column ? focusWindowAt(state, outputId, workspaceIndex, column.focusWindow - 1) : null;
    }

    function focusWindowDown(state, outputId, workspaceIndex) {
        var workspace = getWorkspace(state, outputId, workspaceIndex);
        var column = workspace.columns[clampIndex(workspace.focusColumn, workspace.columns.length)];
        return column ? focusWindowAt(state, outputId, workspaceIndex, column.focusWindow + 1) : null;
    }

    function focusTopWindow(state, outputId, workspaceIndex) {
        return focusWindowAt(state, outputId, workspaceIndex, 0);
    }

    function focusBottomWindow(state, outputId, workspaceIndex) {
        var workspace = getWorkspace(state, outputId, workspaceIndex);
        var column = workspace.columns[clampIndex(workspace.focusColumn, workspace.columns.length)];
        return column ? focusWindowAt(state, outputId, workspaceIndex, column.windows.length - 1) : null;
    }

    function focusWindowByIndex(state, outputId, workspaceIndex, index) {
        return focusWindowAt(state, outputId, workspaceIndex, (parseInt(index, 10) || 1) - 1);
    }

    function moveArrayItem(items, fromIndex, toIndex) {
        var item;
        if (fromIndex === toIndex) {
            return items[fromIndex];
        }
        item = items.splice(fromIndex, 1)[0];
        items.splice(toIndex, 0, item);
        return item;
    }

    function moveColumnToIndex(state, outputId, workspaceIndex, targetIndex) {
        var workspace = getWorkspace(state, outputId, workspaceIndex);
        var fromIndex;
        var toIndex;

        if (workspace.columns.length <= 1) {
            return focusedLocation(state, workspace);
        }
        fromIndex = clampIndex(workspace.focusColumn, workspace.columns.length);
        toIndex = clampIndex(targetIndex, workspace.columns.length);
        if (toIndex === fromIndex) {
            return focusedLocation(state, workspace);
        }
        moveArrayItem(workspace.columns, fromIndex, toIndex);
        workspace.prevFocusColumn = fromIndex;
        workspace.prevColumnOnRemoval = -1;
        workspace.focusColumn = toIndex;
        rebuildWorkspaceIndex(state, String(outputId || "default"), normalizeWorkspaceIndex(workspaceIndex), workspace);
        updateLastTiledWindow(state, workspace);
        return focusedLocation(state, workspace);
    }

    function moveColumnLeft(state, outputId, workspaceIndex) {
        var workspace = getWorkspace(state, outputId, workspaceIndex);
        return moveColumnToIndex(state, outputId, workspaceIndex, workspace.focusColumn - 1);
    }

    function moveColumnRight(state, outputId, workspaceIndex) {
        var workspace = getWorkspace(state, outputId, workspaceIndex);
        return moveColumnToIndex(state, outputId, workspaceIndex, workspace.focusColumn + 1);
    }

    function moveColumnFirst(state, outputId, workspaceIndex) {
        return moveColumnToIndex(state, outputId, workspaceIndex, 0);
    }

    function moveColumnLast(state, outputId, workspaceIndex) {
        var workspace = getWorkspace(state, outputId, workspaceIndex);
        return moveColumnToIndex(state, outputId, workspaceIndex, workspace.columns.length - 1);
    }

    function moveColumnByIndex(state, outputId, workspaceIndex, index) {
        return moveColumnToIndex(state, outputId, workspaceIndex, (parseInt(index, 10) || 1) - 1);
    }

    function moveWindowToIndex(state, outputId, workspaceIndex, targetIndex) {
        var workspace = getWorkspace(state, outputId, workspaceIndex);
        var column;
        var fromIndex;
        var toIndex;

        if (workspace.columns.length === 0) {
            return null;
        }
        workspace.focusColumn = clampIndex(workspace.focusColumn, workspace.columns.length);
        column = workspace.columns[workspace.focusColumn];
        if (!column || column.windows.length <= 1) {
            return focusedLocation(state, workspace);
        }
        fromIndex = clampIndex(column.focusWindow, column.windows.length);
        toIndex = clampIndex(targetIndex, column.windows.length);
        if (toIndex === fromIndex) {
            return focusedLocation(state, workspace);
        }
        moveArrayItem(column.windows, fromIndex, toIndex);
        column.focusWindow = toIndex;
        rebuildWorkspaceIndex(state, String(outputId || "default"), normalizeWorkspaceIndex(workspaceIndex), workspace);
        updateLastTiledWindow(state, workspace);
        return focusedLocation(state, workspace);
    }

    function moveWindowUp(state, outputId, workspaceIndex) {
        var workspace = getWorkspace(state, outputId, workspaceIndex);
        var column = workspace.columns[clampIndex(workspace.focusColumn, workspace.columns.length)];
        return column ? moveWindowToIndex(state, outputId, workspaceIndex, column.focusWindow - 1) : null;
    }

    function moveWindowDown(state, outputId, workspaceIndex) {
        var workspace = getWorkspace(state, outputId, workspaceIndex);
        var column = workspace.columns[clampIndex(workspace.focusColumn, workspace.columns.length)];
        return column ? moveWindowToIndex(state, outputId, workspaceIndex, column.focusWindow + 1) : null;
    }

    function moveWindowTop(state, outputId, workspaceIndex) {
        return moveWindowToIndex(state, outputId, workspaceIndex, 0);
    }

    function moveWindowBottom(state, outputId, workspaceIndex) {
        var workspace = getWorkspace(state, outputId, workspaceIndex);
        var column = workspace.columns[clampIndex(workspace.focusColumn, workspace.columns.length)];
        return column ? moveWindowToIndex(state, outputId, workspaceIndex, column.windows.length - 1) : null;
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
            restoreWindow: restoreWindow,
            setColumnWidth: setColumnWidth,
            adjustColumnWidth: adjustColumnWidth,
            setColumnFixedWidth: setColumnFixedWidth,
            adjustColumnFixedWidth: adjustColumnFixedWidth,
            switchPresetColumnWidth: switchPresetColumnWidth,
            switchPresetColumnWidthBack: switchPresetColumnWidthBack,
            toggleColumnFullWidth: toggleColumnFullWidth,
            setWindowHeight: setWindowHeight,
            adjustWindowHeight: adjustWindowHeight,
            switchPresetWindowHeight: switchPresetWindowHeight,
            switchPresetWindowHeightBack: switchPresetWindowHeightBack,
            resetWindowHeight: resetWindowHeight,
            resetColumnHeights: resetColumnHeights,
            focusColumnLeft: focusColumnLeft,
            focusColumnRight: focusColumnRight,
            focusFirstColumn: focusFirstColumn,
            focusLastColumn: focusLastColumn,
            focusColumnByIndex: focusColumnByIndex,
            focusWindowUp: focusWindowUp,
            focusWindowDown: focusWindowDown,
            focusTopWindow: focusTopWindow,
            focusBottomWindow: focusBottomWindow,
            focusWindowByIndex: focusWindowByIndex,
            moveColumnLeft: moveColumnLeft,
            moveColumnRight: moveColumnRight,
            moveColumnFirst: moveColumnFirst,
            moveColumnLast: moveColumnLast,
            moveColumnByIndex: moveColumnByIndex,
            moveWindowUp: moveWindowUp,
            moveWindowDown: moveWindowDown,
            moveWindowTop: moveWindowTop,
            moveWindowBottom: moveWindowBottom
        };
    }

    root.KWinRibbon = createApi();

}(this));
