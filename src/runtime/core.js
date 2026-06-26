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
            createLocation: createLocation
        };
    }
