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

    function emptyMap() {
        return Object.create(null);
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
        var seen = emptyMap();
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
        var widthFixed = opts.widthFixed === true;
        return {
            id: nextId(state, "nextColumnId", "column-"),
            width: widthFixed ? clampFixedWidth(opts.width) : clampRatio(opts.width === undefined ? state.options.defaultColumnWidth : opts.width),
            widthFixed: widthFixed,
            fullWidth: opts.fullWidth === true,
            restoreWidth: null,
            restoreWidthFixed: null,
            windows: windows,
            focusWindow: windows.length > 0 ? 0 : -1,
            presetWidthIndex: -1,
            tabbed: normalizeColumnDisplay(opts.display || state.options.defaultColumnDisplay) === "tabbed",
            heightWeights: emptyMap()
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
        var weights = emptyMap();
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
        var keep = emptyMap();
        var next = emptyMap();
        var i;
        var id;

        if (!column || !column.heightWeights) {
            return;
        }
        if (column.windows.length <= 1) {
            column.heightWeights = emptyMap();
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
        var id = String(windowId || "");
        var location = removeWindowFromModel(state, id, false);
        if (!location && id !== "") {
            delete state.parked[id];
            removeFromStateBags(state, id);
        }
        return location;
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
            column.heightWeights = emptyMap();
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

    function focusWindowById(state, windowId) {
        var id = String(windowId || "");
        var location = id === "" ? null : state.windowIndex[id];
        var output;
        var workspace;
        var column;
        if (!location) {
            return null;
        }
        output = ensureOutput(state, location.outputId);
        output.currentWorkspaceIndex = location.workspaceIndex;
        workspace = ensureWorkspace(state, location.outputId, location.workspaceIndex);
        if (!workspace.columns[location.columnIndex]) {
            return null;
        }
        if (workspace.focusColumn !== location.columnIndex) {
            workspace.prevFocusColumn = workspace.focusColumn;
            workspace.prevColumnOnRemoval = -1;
        }
        workspace.focusColumn = location.columnIndex;
        column = workspace.columns[location.columnIndex];
        column.focusWindow = clampIndex(location.windowIndex, column.windows.length);
        updateLastTiledWindow(state, workspace);
        return state.windowIndex[id];
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
            ref.column.heightWeights = emptyMap();
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
            ref.column.heightWeights = emptyMap();
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
            ref.column.heightWeights = emptyMap();
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
        ref.column.heightWeights = emptyMap();
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

    function normalizeDirection(direction) {
        var text = String(direction || "right").toLowerCase();
        if (direction === -1 || text === "-1" || text === "left" || text === "up") {
            return -1;
        }
        return 1;
    }

    function takeWindowEntry(column, windowIndex) {
        var index = clampIndex(windowIndex, column.windows.length);
        var id;
        var weight;
        if (index < 0) {
            return null;
        }
        id = column.windows.splice(index, 1)[0];
        weight = column.heightWeights[id];
        delete column.heightWeights[id];
        if (column.focusWindow > index) {
            column.focusWindow -= 1;
        } else if (column.focusWindow >= column.windows.length) {
            column.focusWindow = column.windows.length - 1;
        }
        pruneHeightWeights(column);
        return { id: id, weight: weight };
    }

    function insertWindowEntry(column, entry, windowIndex) {
        var index;
        if (!entry) {
            return -1;
        }
        index = Math.max(0, Math.min(parseInt(windowIndex, 10) || 0, column.windows.length));
        column.windows.splice(index, 0, entry.id);
        if (entry.weight !== undefined) {
            column.heightWeights[entry.id] = entry.weight;
        }
        pruneHeightWeights(column);
        return index;
    }

    function removeEmptyColumn(workspace, columnIndex) {
        if (workspace.columns[columnIndex] && workspace.columns[columnIndex].windows.length === 0) {
            workspace.columns.splice(columnIndex, 1);
            return true;
        }
        return false;
    }

    function finishWorkspaceMutation(state, outputId, workspaceIndex, workspace) {
        rebuildWorkspaceIndex(state, outputId, workspaceIndex, workspace);
        updateLastTiledWindow(state, workspace);
        return focusedLocation(state, workspace);
    }

    function consumeIntoColumn(state, outputId, workspaceIndex, direction) {
        var offset = normalizeDirection(direction);
        var ref = focusedColumnRef(state, outputId, workspaceIndex);
        var neighborIndex;
        var neighbor;
        var activeWindow;
        var entry;
        var nextFocus;

        if (!ref) {
            return null;
        }
        neighborIndex = ref.columnIndex + offset;
        if (neighborIndex < 0 || neighborIndex >= ref.workspace.columns.length) {
            return focusedLocation(state, ref.workspace);
        }
        neighbor = ref.workspace.columns[neighborIndex];
        activeWindow = focusedWindowId(ref.workspace);
        entry = takeWindowEntry(neighbor, 0);
        if (!entry) {
            return focusedLocation(state, ref.workspace);
        }
        insertWindowEntry(ref.column, entry, ref.column.windows.length);
        removeEmptyColumn(ref.workspace, neighborIndex);
        nextFocus = findColumnIndexById(ref.workspace, ref.column.id);
        ref.workspace.focusColumn = nextFocus < 0 ? 0 : nextFocus;
        ref.column.focusWindow = Math.max(0, ref.column.windows.indexOf(activeWindow));
        return finishWorkspaceMutation(state, ref.outputId, ref.workspaceIndex, ref.workspace);
    }

    function consumeIntoColumnLeft(state, outputId, workspaceIndex) {
        return consumeIntoColumn(state, outputId, workspaceIndex, -1);
    }

    function consumeIntoColumnRight(state, outputId, workspaceIndex) {
        return consumeIntoColumn(state, outputId, workspaceIndex, 1);
    }

    function expelFromColumn(state, outputId, workspaceIndex, direction) {
        var offset = normalizeDirection(direction);
        var ref = focusedColumnRef(state, outputId, workspaceIndex);
        var entry;
        var display;
        var column;
        var insertIndex;

        if (!ref) {
            return null;
        }
        if (ref.column.windows.length <= 1) {
            return focusedLocation(state, ref.workspace);
        }
        entry = takeWindowEntry(ref.column, ref.column.focusWindow);
        display = ref.column.tabbed ? "tabbed" : "normal";
        column = createColumn(state, entry.id, {
            width: ref.column.width,
            widthFixed: ref.column.widthFixed,
            display: display
        });
        insertIndex = offset < 0 ? ref.columnIndex : ref.columnIndex + 1;
        ref.workspace.columns.splice(insertIndex, 0, column);
        ref.workspace.focusColumn = insertIndex;
        ref.workspace.prevColumnOnRemoval = -1;
        return finishWorkspaceMutation(state, ref.outputId, ref.workspaceIndex, ref.workspace);
    }

    function expelFromColumnLeft(state, outputId, workspaceIndex) {
        return expelFromColumn(state, outputId, workspaceIndex, -1);
    }

    function expelFromColumnRight(state, outputId, workspaceIndex) {
        return expelFromColumn(state, outputId, workspaceIndex, 1);
    }

    function consumeOrExpel(state, outputId, workspaceIndex, direction) {
        var offset = normalizeDirection(direction);
        var ref = focusedColumnRef(state, outputId, workspaceIndex);
        var neighborIndex;
        var neighbor;
        var entry;
        var insertIndex;
        var focusIndex;

        if (!ref) {
            return null;
        }
        if (ref.column.windows.length > 1) {
            return expelFromColumn(state, outputId, workspaceIndex, offset);
        }
        neighborIndex = ref.columnIndex + offset;
        if (neighborIndex < 0 || neighborIndex >= ref.workspace.columns.length) {
            return focusedLocation(state, ref.workspace);
        }
        neighbor = ref.workspace.columns[neighborIndex];
        entry = takeWindowEntry(ref.column, ref.column.focusWindow);
        insertIndex = offset < 0 ? neighbor.windows.length : 0;
        focusIndex = insertWindowEntry(neighbor, entry, insertIndex);
        removeEmptyColumn(ref.workspace, ref.columnIndex);
        neighborIndex = findColumnIndexById(ref.workspace, neighbor.id);
        ref.workspace.focusColumn = neighborIndex;
        neighbor.focusWindow = focusIndex;
        ref.workspace.prevColumnOnRemoval = -1;
        return finishWorkspaceMutation(state, ref.outputId, ref.workspaceIndex, ref.workspace);
    }

    function consumeOrExpelLeft(state, outputId, workspaceIndex) {
        return consumeOrExpel(state, outputId, workspaceIndex, -1);
    }

    function consumeOrExpelRight(state, outputId, workspaceIndex) {
        return consumeOrExpel(state, outputId, workspaceIndex, 1);
    }

    function swapWindow(state, outputId, workspaceIndex, direction) {
        var offset = normalizeDirection(direction);
        var ref = focusedColumnRef(state, outputId, workspaceIndex);
        var neighborIndex;
        var neighbor;
        var sourceWindowIndex;
        var neighborWindowIndex;
        var sourceId;
        var neighborId;
        var sourceWeight;
        var neighborWeight;

        if (!ref) {
            return null;
        }
        neighborIndex = ref.columnIndex + offset;
        if (neighborIndex < 0 || neighborIndex >= ref.workspace.columns.length) {
            return focusedLocation(state, ref.workspace);
        }
        neighbor = ref.workspace.columns[neighborIndex];
        if (ref.column.windows.length === 1 && neighbor.windows.length === 1) {
            return moveColumnToIndex(state, outputId, workspaceIndex, neighborIndex);
        }
        sourceWindowIndex = clampIndex(ref.column.focusWindow, ref.column.windows.length);
        neighborWindowIndex = clampIndex(neighbor.focusWindow, neighbor.windows.length);
        sourceId = ref.column.windows[sourceWindowIndex];
        neighborId = neighbor.windows[neighborWindowIndex];
        sourceWeight = ref.column.heightWeights[sourceId];
        neighborWeight = neighbor.heightWeights[neighborId];
        ref.column.windows[sourceWindowIndex] = neighborId;
        neighbor.windows[neighborWindowIndex] = sourceId;
        delete ref.column.heightWeights[sourceId];
        delete neighbor.heightWeights[neighborId];
        if (neighborWeight !== undefined) {
            ref.column.heightWeights[neighborId] = neighborWeight;
        }
        if (sourceWeight !== undefined) {
            neighbor.heightWeights[sourceId] = sourceWeight;
        }
        pruneHeightWeights(ref.column);
        pruneHeightWeights(neighbor);
        ref.column.focusWindow = sourceWindowIndex;
        neighbor.focusWindow = neighborWindowIndex;
        ref.workspace.focusColumn = neighborIndex;
        return finishWorkspaceMutation(state, ref.outputId, ref.workspaceIndex, ref.workspace);
    }

    function swapWindowLeft(state, outputId, workspaceIndex) {
        return swapWindow(state, outputId, workspaceIndex, -1);
    }

    function swapWindowRight(state, outputId, workspaceIndex) {
        return swapWindow(state, outputId, workspaceIndex, 1);
    }

    function clampViewportWidth(value) {
        var number = parseFloat(value);
        if (!isFinite(number) || number <= 0) {
            return 1;
        }
        return number;
    }

    function scrollGap(state, gap) {
        if (gap !== undefined && gap !== null) {
            return Math.max(0, parseFloat(gap) || 0);
        }
        return Math.max(0, parseFloat(state.options.gaps) || 0);
    }

    function columnExtent(column, viewportWidth) {
        if (column.fullWidth) {
            return viewportWidth;
        }
        if (column.widthFixed) {
            return clampFixedWidth(column.width);
        }
        return clampRatio(column.width) * viewportWidth;
    }

    function computeColumnMetrics(state, outputId, workspaceIndex, viewportWidth, gap) {
        var ref = workspaceRef(state, outputId, workspaceIndex);
        var viewport = clampViewportWidth(viewportWidth);
        var spacing = scrollGap(state, gap);
        var metrics = [];
        var x = 0;
        var i;
        var width;

        for (i = 0; i < ref.workspace.columns.length; i += 1) {
            width = columnExtent(ref.workspace.columns[i], viewport);
            metrics.push({
                index: i,
                id: ref.workspace.columns[i].id,
                start: x,
                end: x + width,
                width: width
            });
            x += width;
            if (i < ref.workspace.columns.length - 1) {
                x += spacing;
            }
        }

        return {
            outputId: ref.outputId,
            workspaceIndex: ref.workspaceIndex,
            viewportWidth: viewport,
            gap: spacing,
            contentWidth: metrics.length > 0 ? metrics[metrics.length - 1].end : 0,
            columns: metrics
        };
    }

    function fitOffsetForMetric(currentOffset, metric, viewportWidth, contentWidth) {
        var maxOffset = Math.max(0, contentWidth - viewportWidth);
        var target = parseFloat(currentOffset) || 0;

        if (!metric) {
            return Math.max(0, Math.min(target, maxOffset));
        }
        if (metric.start < target) {
            target = metric.start;
        } else if (metric.end > target + viewportWidth) {
            target = metric.end - viewportWidth;
        }
        return Math.max(0, Math.min(target, maxOffset));
    }

    function centerOffsetForMetric(metric, viewportWidth) {
        if (!metric) {
            return 0;
        }
        return (metric.start + metric.end) / 2 - viewportWidth / 2;
    }

    function setScrollOffset(state, outputId, workspaceIndex, offset) {
        var ref = workspaceRef(state, outputId, workspaceIndex);
        ref.workspace.scrollOffset = parseFloat(offset) || 0;
        return ref.workspace.scrollOffset;
    }

    function fitFocusedColumnIntoViewport(state, outputId, workspaceIndex, viewportWidth, gap) {
        var ref = focusedColumnRef(state, outputId, workspaceIndex);
        var metrics;
        var target;
        if (!ref) {
            return null;
        }
        metrics = computeColumnMetrics(state, ref.outputId, ref.workspaceIndex, viewportWidth, gap);
        target = fitOffsetForMetric(
            ref.workspace.scrollOffset,
            metrics.columns[ref.columnIndex],
            metrics.viewportWidth,
            metrics.contentWidth
        );
        ref.workspace.scrollOffset = target;
        return target;
    }

    function centerFocusedColumnInViewport(state, outputId, workspaceIndex, viewportWidth, gap) {
        var ref = focusedColumnRef(state, outputId, workspaceIndex);
        var metrics;
        var target;
        if (!ref) {
            return null;
        }
        metrics = computeColumnMetrics(state, ref.outputId, ref.workspaceIndex, viewportWidth, gap);
        target = centerOffsetForMetric(metrics.columns[ref.columnIndex], metrics.viewportWidth);
        ref.workspace.scrollOffset = target;
        return target;
    }

    function updateScrollOffsetForFocus(state, outputId, workspaceIndex, viewportWidth, options) {
        var opts = options || {};
        var ref = focusedColumnRef(state, outputId, workspaceIndex);
        var mode;
        var metrics;
        var previous;
        var current;
        var spanStart;
        var spanEnd;
        var target;

        if (!ref) {
            return null;
        }
        mode = normalizeCenterFocusedColumn(opts.centerFocusedColumn || ref.workspace.centerFocusedColumn || state.options.centerFocusedColumn);
        metrics = computeColumnMetrics(state, ref.outputId, ref.workspaceIndex, viewportWidth, opts.gap);
        current = metrics.columns[ref.columnIndex];

        if ((opts.alwaysCenterSingleColumn === true || state.options.alwaysCenterSingleColumn) && metrics.columns.length === 1) {
            target = centerOffsetForMetric(current, metrics.viewportWidth);
        } else if (mode === "always") {
            target = centerOffsetForMetric(current, metrics.viewportWidth);
        } else if (mode === "on-overflow" && ref.workspace.prevFocusColumn >= 0 && ref.workspace.prevFocusColumn < metrics.columns.length) {
            previous = metrics.columns[ref.workspace.prevFocusColumn];
            spanStart = Math.min(previous.start, current.start);
            spanEnd = Math.max(previous.end, current.end);
            if (spanEnd - spanStart > metrics.viewportWidth) {
                target = centerOffsetForMetric(current, metrics.viewportWidth);
            } else {
                target = fitOffsetForMetric(ref.workspace.scrollOffset, current, metrics.viewportWidth, metrics.contentWidth);
            }
        } else {
            target = fitOffsetForMetric(ref.workspace.scrollOffset, current, metrics.viewportWidth, metrics.contentWidth);
        }

        ref.workspace.scrollOffset = target;
        return target;
    }

    function centerVisibleColumns(state, outputId, workspaceIndex, viewportWidth, gap) {
        var ref = focusedColumnRef(state, outputId, workspaceIndex);
        var metrics;
        var viewportStart;
        var viewportEnd;
        var first = -1;
        var last = -1;
        var i;
        var metric;
        var target;

        if (!ref) {
            return null;
        }
        metrics = computeColumnMetrics(state, ref.outputId, ref.workspaceIndex, viewportWidth, gap);
        viewportStart = ref.workspace.scrollOffset;
        viewportEnd = viewportStart + metrics.viewportWidth;
        for (i = 0; i < metrics.columns.length; i += 1) {
            metric = metrics.columns[i];
            if (metric.start >= viewportStart && metric.end <= viewportEnd) {
                if (first < 0) {
                    first = i;
                }
                last = i;
            }
        }
        if (ref.columnIndex < first || ref.columnIndex > last || first < 0) {
            return ref.workspace.scrollOffset;
        }
        target = (metrics.columns[first].start + metrics.columns[last].end) / 2 - metrics.viewportWidth / 2;
        ref.workspace.scrollOffset = target;
        return target;
    }

    function validWindowId(windowId) {
        return String(windowId || "");
    }

    function setFloatingState(state, windowId, enabled) {
        if (enabled) {
            state.floating[windowId] = true;
            state.lastFloatingWindowId = windowId;
        } else {
            delete state.floating[windowId];
        }
    }

    function setWindowFloating(state, windowId, enabled) {
        var id = validWindowId(windowId);
        if (id === "") {
            return null;
        }
        enabled = enabled !== false;
        if (enabled) {
            if (state.fullscreen[id]) {
                setWindowFullscreen(state, id, false);
            }
            if (state.windowIndex[id]) {
                parkWindow(state, id, "floating");
            }
            setFloatingState(state, id, true);
            state.manualFloating[id] = true;
            delete state.manualTiled[id];
            return state.parked[id] || true;
        }
        delete state.manualFloating[id];
        state.manualTiled[id] = true;
        if (!state.ruleFloating[id]) {
            setFloatingState(state, id, false);
            if (!state.fullscreen[id] && state.parked[id]) {
                return restoreWindow(state, id);
            }
        }
        return state.windowIndex[id] || state.parked[id] || true;
    }

    function toggleWindowFloating(state, windowId) {
        var id = validWindowId(windowId);
        if (id === "") {
            return null;
        }
        return setWindowFloating(state, id, !state.floating[id]);
    }

    function setRuleFloating(state, windowId, enabled) {
        var id = validWindowId(windowId);
        if (id === "") {
            return null;
        }
        enabled = enabled !== false;
        if (enabled) {
            if (state.fullscreen[id]) {
                setWindowFullscreen(state, id, false);
            }
            if (state.windowIndex[id]) {
                parkWindow(state, id, "rule-floating");
            }
            state.ruleFloating[id] = true;
            setFloatingState(state, id, true);
            return state.parked[id] || true;
        }
        delete state.ruleFloating[id];
        if (!state.manualFloating[id]) {
            setFloatingState(state, id, false);
            if (!state.fullscreen[id] && state.parked[id]) {
                return restoreWindow(state, id);
            }
        }
        return state.windowIndex[id] || state.parked[id] || true;
    }

    function setWindowFullscreen(state, windowId, enabled) {
        var id = validWindowId(windowId);
        if (id === "") {
            return null;
        }
        enabled = enabled !== false;
        if (enabled) {
            if (state.windowIndex[id]) {
                parkWindow(state, id, "fullscreen");
            }
            state.fullscreen[id] = true;
            setFloatingState(state, id, false);
            return state.parked[id] || true;
        }
        delete state.fullscreen[id];
        if (state.manualFloating[id] || state.ruleFloating[id]) {
            setFloatingState(state, id, true);
            return state.parked[id] || true;
        }
        if (state.parked[id]) {
            return restoreWindow(state, id);
        }
        return state.windowIndex[id] || true;
    }

    function toggleWindowFullscreen(state, windowId) {
        var id = validWindowId(windowId);
        if (id === "") {
            return null;
        }
        return setWindowFullscreen(state, id, !state.fullscreen[id]);
    }

    function createState(options) {
        return {
            options: copyOptions(options),
            outputs: emptyMap(),
            windowIndex: emptyMap(),
            parked: emptyMap(),
            floating: emptyMap(),
            manualFloating: emptyMap(),
            manualTiled: emptyMap(),
            ruleFloating: emptyMap(),
            fullscreen: emptyMap(),
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
            focusWindowById: focusWindowById,
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
            moveWindowBottom: moveWindowBottom,
            consumeIntoColumn: consumeIntoColumn,
            consumeIntoColumnLeft: consumeIntoColumnLeft,
            consumeIntoColumnRight: consumeIntoColumnRight,
            expelFromColumn: expelFromColumn,
            expelFromColumnLeft: expelFromColumnLeft,
            expelFromColumnRight: expelFromColumnRight,
            consumeOrExpel: consumeOrExpel,
            consumeOrExpelLeft: consumeOrExpelLeft,
            consumeOrExpelRight: consumeOrExpelRight,
            swapWindowLeft: swapWindowLeft,
            swapWindowRight: swapWindowRight,
            computeColumnMetrics: computeColumnMetrics,
            setScrollOffset: setScrollOffset,
            fitFocusedColumnIntoViewport: fitFocusedColumnIntoViewport,
            centerFocusedColumnInViewport: centerFocusedColumnInViewport,
            updateScrollOffsetForFocus: updateScrollOffsetForFocus,
            centerVisibleColumns: centerVisibleColumns,
            projectArrangeScope: projectArrangeScope,
            getRibbonActionSpecs: getRibbonActionSpecs,
            dispatchRibbonAction: dispatchRibbonAction,
            setWindowFloating: setWindowFloating,
            toggleWindowFloating: toggleWindowFloating,
            setRuleFloating: setRuleFloating,
            setWindowFullscreen: setWindowFullscreen,
            toggleWindowFullscreen: toggleWindowFullscreen,
            windowIdFromWindow: windowIdFromWindow,
            outputIdFromWindow: outputIdFromWindow,
            workspaceIndexFromWindow: workspaceIndexFromWindow,
            classifyWindow: classifyWindow,
            createKWinAdapter: createKWinAdapter
        };
    }

    function readWindowValue(windowRef, names) {
        var i;
        var value;
        if (!windowRef) {
            return undefined;
        }
        for (i = 0; i < names.length; i += 1) {
            if (windowRef[names[i]] !== undefined && windowRef[names[i]] !== null) {
                value = windowRef[names[i]];
                if (typeof value === "function") {
                    try {
                        value = value.call(windowRef);
                    } catch (ignore) {
                        value = undefined;
                    }
                }
                if (value !== undefined && value !== null && value !== "") {
                    return value;
                }
            }
        }
        return undefined;
    }

    function stringValue(value) {
        if (value === undefined || value === null || value === "") {
            return null;
        }
        return String(value);
    }

    function boolValue(value) {
        return value === true;
    }

    function windowIdFromWindow(windowRef, fallbackId) {
        var value = readWindowValue(windowRef, ["internalId", "windowId", "uuid", "id"]);
        return stringValue(value) || stringValue(fallbackId);
    }

    function outputIdFromWindow(windowRef) {
        var output = readWindowValue(windowRef, ["output", "screen"]);
        var value;
        if (output && typeof output === "object") {
            value = readWindowValue(output, ["name", "id", "serialNumber"]);
            return stringValue(value) || "default";
        }
        return stringValue(output) || "default";
    }

    function workspaceIndexFromWindow(windowRef) {
        var value = readWindowValue(windowRef, ["workspaceIndex", "desktopIndex"]);
        var desktop;
        var parsed;
        if (value !== undefined && value !== null) {
            parsed = parseInt(value, 10);
            return isFinite(parsed) && parsed >= 0 ? parsed : 0;
        }
        desktop = readWindowValue(windowRef, ["desktop", "virtualDesktop"]);
        if (desktop && typeof desktop === "object") {
            value = readWindowValue(desktop, ["x11DesktopNumber", "index"]);
            parsed = parseInt(value, 10);
            if (isFinite(parsed) && parsed > 0) {
                return parsed - 1;
            }
        }
        return 0;
    }

    function windowFullscreenValue(windowRef) {
        return boolValue(readWindowValue(windowRef, ["fullScreen", "fullscreen"]));
    }

    function hasAnyFlag(windowRef, names) {
        var i;
        for (i = 0; i < names.length; i += 1) {
            if (boolValue(readWindowValue(windowRef, [names[i]]))) {
                return true;
            }
        }
        return false;
    }

    function classification(windowRef, options, action, reason, manageable) {
        var opts = options || {};
        return {
            windowId: windowIdFromWindow(windowRef, opts.fallbackId),
            outputId: outputIdFromWindow(windowRef),
            workspaceIndex: workspaceIndexFromWindow(windowRef),
            action: action,
            reason: reason,
            manageable: manageable === true,
            fullscreen: windowFullscreenValue(windowRef)
        };
    }

    function classifyWindow(windowRef, options) {
        var id;
        var ready;
        if (!windowRef) {
            return classification(windowRef, options, "ignore", "missing-window", false);
        }
        id = windowIdFromWindow(windowRef, options && options.fallbackId);
        if (!id) {
            return classification(windowRef, options, "ignore", "missing-id", false);
        }
        if (boolValue(readWindowValue(windowRef, ["deleted"])) || readWindowValue(windowRef, ["managed"]) === false) {
            return classification(windowRef, options, "ignore", "unmanaged", false);
        }
        if (readWindowValue(windowRef, ["normalWindow"]) === false) {
            return classification(windowRef, options, "ignore", "non-normal", false);
        }
        if (hasAnyFlag(windowRef, [
            "desktopWindow",
            "dock",
            "toolbar",
            "menu",
            "splash",
            "utility",
            "dropdownMenu",
            "popupMenu",
            "tooltip",
            "notification",
            "criticalNotification",
            "onScreenDisplay",
            "comboBox",
            "dndIcon"
        ])) {
            return classification(windowRef, options, "ignore", "special-window", false);
        }
        if (hasAnyFlag(windowRef, ["skipTaskbar", "skipPager", "skipSwitcher"])) {
            return classification(windowRef, options, "ignore", "skipped-window", false);
        }
        if (readWindowValue(windowRef, ["resizable", "resizeable"]) === false || readWindowValue(windowRef, ["movable", "moveable"]) === false) {
            return classification(windowRef, options, "ignore", "fixed-window", false);
        }
        ready = readWindowValue(windowRef, ["ready"]);
        if (boolValue(readWindowValue(windowRef, ["minimized", "hidden", "shaded"])) || ready === false) {
            return classification(windowRef, options, "park", "temporarily-unavailable", true);
        }
        if (windowFullscreenValue(windowRef)) {
            return classification(windowRef, options, "fullscreen", "fullscreen", true);
        }
        return classification(windowRef, options, "tile", "normal", true);
    }

    function normalizeArea(area) {
        var value = area || {};
        return {
            x: parseFloat(value.x) || 0,
            y: parseFloat(value.y) || 0,
            width: clampViewportWidth(value.width),
            height: Math.max(1, parseFloat(value.height) || 1)
        };
    }

    function roundedFrame(x, y, width, height) {
        return {
            x: Math.round(x),
            y: Math.round(y),
            width: Math.max(1, Math.round(width)),
            height: Math.max(1, Math.round(height))
        };
    }

    function projectColumnFrames(column, metric, area, scrollOffset, gap) {
        var frames = [];
        var x = area.x + metric.start - scrollOffset;
        var width = metric.width;
        var totalWeight = 0;
        var availableHeight;
        var y;
        var i;
        var id;
        var weight;
        var height;

        if (column.tabbed || column.windows.length <= 1) {
            for (i = 0; i < column.windows.length; i += 1) {
                frames.push({
                    windowId: column.windows[i],
                    frameGeometry: roundedFrame(x, area.y, width, area.height)
                });
            }
            return frames;
        }

        for (i = 0; i < column.windows.length; i += 1) {
            id = column.windows[i];
            totalWeight += clampHeightWeight(column.heightWeights[id] || 1);
        }
        availableHeight = Math.max(1, area.height - gap * (column.windows.length - 1));
        y = area.y;
        for (i = 0; i < column.windows.length; i += 1) {
            id = column.windows[i];
            if (i === column.windows.length - 1) {
                height = area.y + area.height - y;
            } else {
                weight = clampHeightWeight(column.heightWeights[id] || 1);
                height = availableHeight * weight / totalWeight;
            }
            frames.push({
                windowId: id,
                frameGeometry: roundedFrame(x, y, width, height)
            });
            y += Math.round(height) + gap;
        }
        return frames;
    }

    function projectArrangeScope(state, scope) {
        var value = scope || {};
        var outputId = String(value.outputId || "default");
        var workspaceIndex = normalizeWorkspaceIndex(value.workspaceIndex);
        var workspace = getWorkspace(state, outputId, workspaceIndex);
        var area = normalizeArea(value.area);
        var gap = scrollGap(state, value.gap);
        var metrics = computeColumnMetrics(state, outputId, workspaceIndex, area.width, gap);
        var frames = [];
        var i;
        var columnFrames;

        for (i = 0; i < workspace.columns.length; i += 1) {
            columnFrames = projectColumnFrames(workspace.columns[i], metrics.columns[i], area, workspace.scrollOffset, gap);
            frames = frames.concat(columnFrames);
        }
        return {
            outputId: outputId,
            workspaceIndex: workspaceIndex,
            area: area,
            gap: gap,
            scrollOffset: workspace.scrollOffset,
            frames: frames
        };
    }

    var RIBBON_ACTION_SPECS = [
        { name: "kwin-ribbon-focus-column-left", title: "Ribbon: Focus column left", shortcut: "", handler: focusColumnLeft },
        { name: "kwin-ribbon-focus-column-right", title: "Ribbon: Focus column right", shortcut: "", handler: focusColumnRight },
        { name: "kwin-ribbon-focus-window-up", title: "Ribbon: Focus window up", shortcut: "", handler: focusWindowUp },
        { name: "kwin-ribbon-focus-window-down", title: "Ribbon: Focus window down", shortcut: "", handler: focusWindowDown },
        { name: "kwin-ribbon-move-column-left", title: "Ribbon: Move column left", shortcut: "", handler: moveColumnLeft },
        { name: "kwin-ribbon-move-column-right", title: "Ribbon: Move column right", shortcut: "", handler: moveColumnRight },
        { name: "kwin-ribbon-move-window-up", title: "Ribbon: Move window up", shortcut: "", handler: moveWindowUp },
        { name: "kwin-ribbon-move-window-down", title: "Ribbon: Move window down", shortcut: "", handler: moveWindowDown }
    ];

    function getRibbonActionSpecs() {
        var result = [];
        var i;
        var spec;
        for (i = 0; i < RIBBON_ACTION_SPECS.length; i += 1) {
            spec = RIBBON_ACTION_SPECS[i];
            result.push({
                name: spec.name,
                title: spec.title,
                shortcut: spec.shortcut
            });
        }
        return result;
    }

    function actionSpecByName(name) {
        var i;
        for (i = 0; i < RIBBON_ACTION_SPECS.length; i += 1) {
            if (RIBBON_ACTION_SPECS[i].name === name) {
                return RIBBON_ACTION_SPECS[i];
            }
        }
        return null;
    }

    function dispatchRibbonAction(state, actionName, scope) {
        var spec = actionSpecByName(actionName);
        var value = scope || {};
        if (!spec) {
            return null;
        }
        return spec.handler(state, value.outputId || "default", normalizeWorkspaceIndex(value.workspaceIndex));
    }

    function signalConnect(signal, handler) {
        if (signal && typeof signal.connect === "function") {
            signal.connect(handler);
            return true;
        }
        return false;
    }

    function adapterWindows(env) {
        if (env && typeof env.getWindows === "function") {
            return env.getWindows() || [];
        }
        if (env && env.workspace && env.workspace.windowList) {
            return env.workspace.windowList;
        }
        return [];
    }

    function adapterActiveWindow(env) {
        if (env && typeof env.getActiveWindow === "function") {
            return env.getActiveWindow();
        }
        if (env && env.workspace) {
            return env.workspace.activeWindow || env.workspace.activeClient || null;
        }
        return null;
    }

    function createKWinAdapter(env, rawOptions) {
        var adapterEnv = env || {};
        var options = copyOptions(rawOptions);
        var state = createState(options);
        var registry = emptyMap();
        var started = false;
        var lastProjection = null;
        var shortcutsRegistered = false;

        function classify(windowRef, fallbackId) {
            return classifyWindow(windowRef, { fallbackId: fallbackId });
        }

        function remember(windowRef, info) {
            if (!info.windowId) {
                return;
            }
            registry[info.windowId] = {
                windowRef: windowRef,
                classification: info
            };
        }

        function handleWindowAdded(windowRef) {
            var info = classify(windowRef);
            if (!info.windowId || !info.manageable) {
                return info;
            }
            remember(windowRef, info);
            if (info.action === "tile" && options.tileNewWindows !== false) {
                addWindow(state, info.outputId, info.workspaceIndex, info.windowId);
            } else if (info.action === "fullscreen") {
                setWindowFullscreen(state, info.windowId, true);
            } else if (info.action === "park" && state.windowIndex[info.windowId]) {
                parkWindow(state, info.windowId, info.reason);
            }
            return info;
        }

        function handleWindowRemoved(windowRefOrId) {
            var id = typeof windowRefOrId === "string" ? windowRefOrId : windowIdFromWindow(windowRefOrId);
            if (!id) {
                return null;
            }
            delete registry[id];
            removeWindow(state, id);
            return id;
        }

        function handleActiveWindowChanged(windowRef) {
            var id = windowIdFromWindow(windowRef);
            if (!id) {
                return null;
            }
            if (state.windowIndex[id]) {
                return focusWindowById(state, id);
            }
            if (state.floating[id]) {
                state.lastFloatingWindowId = id;
            }
            return null;
        }

        function syncWindows() {
            var windows = adapterWindows(adapterEnv);
            var seen = emptyMap();
            var i;
            var info;
            var id;
            for (i = 0; i < windows.length; i += 1) {
                info = handleWindowAdded(windows[i]);
                if (info && info.windowId) {
                    seen[info.windowId] = true;
                }
            }
            for (id in registry) {
                if (hasOwn(registry, id) && !seen[id]) {
                    handleWindowRemoved(id);
                }
            }
            handleActiveWindowChanged(adapterActiveWindow(adapterEnv));
            return state;
        }

        function start() {
            if (started) {
                return state;
            }
            started = true;
            if (adapterEnv.workspace) {
                signalConnect(adapterEnv.workspace.windowAdded, handleWindowAdded);
                signalConnect(adapterEnv.workspace.windowRemoved, handleWindowRemoved);
                signalConnect(adapterEnv.workspace.windowDeleted, handleWindowRemoved);
                signalConnect(adapterEnv.workspace.activeWindowChanged, handleActiveWindowChanged);
                signalConnect(adapterEnv.workspace.clientActivated, handleActiveWindowChanged);
            }
            registerShortcuts();
            return syncWindows();
        }

        function defaultArrangeScope(scope) {
            var value = scope || {};
            var active = adapterActiveWindow(adapterEnv);
            var activeInfo = active ? classify(active) : null;
            var outputId = value.outputId || (activeInfo && activeInfo.outputId) || "default";
            var workspaceIndex = value.workspaceIndex !== undefined ? value.workspaceIndex : ((activeInfo && activeInfo.workspaceIndex) || 0);
            var area = value.area;
            if (!area && typeof adapterEnv.getArrangeArea === "function") {
                area = adapterEnv.getArrangeArea(outputId, workspaceIndex);
            }
            return {
                outputId: outputId,
                workspaceIndex: workspaceIndex,
                area: area || { x: 0, y: 0, width: 1, height: 1 },
                gap: value.gap
            };
        }

        function writeFrame(windowRef, frameGeometry) {
            if (typeof adapterEnv.setFrameGeometry === "function") {
                adapterEnv.setFrameGeometry(windowRef, frameGeometry);
                return;
            }
            windowRef.frameGeometry = frameGeometry;
        }

        function arrange(scope) {
            var projection = projectArrangeScope(state, defaultArrangeScope(scope));
            var i;
            var entry;
            for (i = 0; i < projection.frames.length; i += 1) {
                entry = registry[projection.frames[i].windowId];
                if (entry && entry.windowRef) {
                    writeFrame(entry.windowRef, projection.frames[i].frameGeometry);
                }
            }
            lastProjection = projection;
            return projection;
        }

        function activateLocation(location) {
            var columnEntry;
            var windowId;
            var entry;
            if (!location || typeof adapterEnv.activateWindow !== "function") {
                return;
            }
            columnEntry = getWorkspace(state, location.outputId, location.workspaceIndex).columns[location.columnIndex];
            if (!columnEntry) {
                return;
            }
            windowId = columnEntry.windows[location.windowIndex];
            entry = registry[windowId];
            if (entry && entry.windowRef) {
                adapterEnv.activateWindow(entry.windowRef);
            }
        }

        function dispatchAction(actionName, scope) {
            var targetScope = defaultArrangeScope(scope);
            var location = dispatchRibbonAction(state, actionName, targetScope);
            if (location) {
                arrange(targetScope);
                activateLocation(location);
            }
            return location;
        }

        function registerShortcuts() {
            var specs;
            var i;
            var spec;
            if (shortcutsRegistered || options.enableWindowManagementShortcuts === false || typeof adapterEnv.registerShortcut !== "function") {
                return false;
            }
            shortcutsRegistered = true;
            specs = getRibbonActionSpecs();
            for (i = 0; i < specs.length; i += 1) {
                spec = specs[i];
                adapterEnv.registerShortcut(spec.name, spec.title, spec.shortcut, (function (actionName) {
                    return function () {
                        dispatchAction(actionName);
                    };
                }(spec.name)));
            }
            return true;
        }

        return {
            state: state,
            registry: registry,
            options: options,
            start: start,
            syncWindows: syncWindows,
            handleWindowAdded: handleWindowAdded,
            handleWindowRemoved: handleWindowRemoved,
            handleActiveWindowChanged: handleActiveWindowChanged,
            arrange: arrange,
            dispatchAction: dispatchAction,
            registerShortcuts: registerShortcuts,
            lastProjection: function () {
                return lastProjection;
            }
        };
    }

    root.KWinRibbon = createApi();

}(this));
