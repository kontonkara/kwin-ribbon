    function callIfFunction(object, name, args) {
        if (object && typeof object[name] === "function") {
            try {
                return object[name].apply(object, args || []);
            } catch (ignore) {
                return undefined;
            }
        }
        return undefined;
    }

    function firstDefined(values) {
        var i;
        for (i = 0; i < values.length; i += 1) {
            if (values[i] !== undefined && values[i] !== null) {
                return values[i];
            }
        }
        return undefined;
    }

    function toArray(value) {
        if (!value) {
            return [];
        }
        if (isArray(value)) {
            return value;
        }
        if (typeof value.length === "number") {
            return Array.prototype.slice.call(value);
        }
        return [];
    }

    function isKWinRuntime(root) {
        return !!(root && (root.workspace || typeof root.registerShortcut === "function" || typeof root.readConfig === "function"));
    }

    function currentDesktopIndex(workspace) {
        var desktop = firstDefined([
            workspace && workspace.currentDesktop,
            workspace && workspace.currentVirtualDesktop,
            workspace && workspace.activeDesktop
        ]);
        var number;
        if (desktop && typeof desktop === "object") {
            number = firstDefined([desktop.x11DesktopNumber, desktop.index]);
        } else {
            number = desktop;
        }
        number = parseInt(number, 10);
        if (isFinite(number) && number > 0) {
            return number - 1;
        }
        return 0;
    }

    function workspaceWindows(workspace) {
        return toArray(firstDefined([
            callIfFunction(workspace, "windowList"),
            callIfFunction(workspace, "clientList"),
            callIfFunction(workspace, "stackingOrder"),
            workspace && workspace.windowList,
            workspace && workspace.clients,
            workspace && workspace.windows,
            workspace && workspace.stackingOrder
        ]));
    }

    function activeKWinWindow(workspace) {
        return firstDefined([
            workspace && workspace.activeWindow,
            workspace && workspace.activeClient,
            callIfFunction(workspace, "activeWindow"),
            callIfFunction(workspace, "activeClient")
        ]) || null;
    }

    function normalizeGeometry(value) {
        if (!value) {
            return null;
        }
        return {
            x: parseFloat(value.x) || 0,
            y: parseFloat(value.y) || 0,
            width: parseFloat(value.width),
            height: parseFloat(value.height)
        };
    }

    function validGeometry(value) {
        return !!(value && isFinite(value.x) && isFinite(value.y) && isFinite(value.width) && isFinite(value.height) && value.width > 0 && value.height > 0);
    }

    function fallbackArea(workspace) {
        return normalizeGeometry(firstDefined([
            workspace && workspace.virtualScreenGeometry,
            workspace && workspace.workspaceGeometry,
            workspace && workspace.clientArea,
            { x: 0, y: 0, width: 1, height: 1 }
        ]));
    }

    function clientArea(workspace, outputId, workspaceIndex) {
        var area;
        var desktopNumber = normalizeWorkspaceIndex(workspaceIndex) + 1;
        var attempts = [
            ["MaximizeArea", outputId, desktopNumber],
            ["WorkArea", outputId, desktopNumber],
            [1, outputId, desktopNumber],
            [0, outputId, desktopNumber],
            ["MaximizeArea", desktopNumber],
            ["WorkArea", desktopNumber]
        ];
        var i;
        for (i = 0; i < attempts.length; i += 1) {
            area = normalizeGeometry(callIfFunction(workspace, "clientArea", attempts[i]));
            if (validGeometry(area)) {
                return area;
            }
        }
        area = fallbackArea(workspace);
        return validGeometry(area) ? area : { x: 0, y: 0, width: 1, height: 1 };
    }

    function createKWinEnvironment(root) {
        var globalRoot = root || {};
        var workspace = globalRoot.workspace || {};
        return {
            root: globalRoot,
            workspace: workspace,
            getWindows: function () {
                return workspaceWindows(workspace);
            },
            getActiveWindow: function () {
                return activeKWinWindow(workspace);
            },
            getCurrentDesktopIndex: function () {
                return currentDesktopIndex(workspace);
            },
            getArrangeArea: function (outputId, workspaceIndex) {
                return clientArea(workspace, outputId, workspaceIndex);
            },
            setFrameGeometry: function (windowRef, frameGeometry) {
                if (!windowRef || !validGeometry(frameGeometry)) {
                    return false;
                }
                windowRef.frameGeometry = frameGeometry;
                return true;
            },
            setWindowFullscreen: function (windowRef, enabled) {
                if (!windowRef) {
                    return false;
                }
                try {
                    windowRef.fullScreen = enabled === true;
                    return true;
                } catch (ignore) {
                    return false;
                }
            },
            activateWindow: function (windowRef) {
                if (typeof workspace.activateWindow === "function") {
                    workspace.activateWindow(windowRef);
                    return true;
                }
                if (typeof workspace.activeWindow !== "undefined") {
                    workspace.activeWindow = windowRef;
                    return true;
                }
                return false;
            },
            registerShortcut: function (name, title, shortcut, callback) {
                if (typeof globalRoot.registerShortcut === "function") {
                    globalRoot.registerShortcut(name, title, shortcut, callback);
                    return true;
                }
                return false;
            },
            readConfig: function (key, defaultValue) {
                var value;
                if (typeof globalRoot.readConfig === "function") {
                    value = globalRoot.readConfig(key, defaultValue);
                    return value === undefined || value === null ? defaultValue : value;
                }
                return defaultValue;
            },
            print: function (message) {
                if (typeof globalRoot.print === "function") {
                    globalRoot.print(message);
                }
            }
        };
    }

    function readKWinOptions(env) {
        var source = env || {};
        var read = typeof source.readConfig === "function" ? source.readConfig : function (key, defaultValue) { return defaultValue; };
        return copyOptions({
            gaps: read("gaps", DEFAULTS.gaps),
            presetColumnWidths: read("presetColumnWidths", DEFAULTS.presetColumnWidths),
            presetWindowHeights: read("presetWindowHeights", DEFAULTS.presetWindowHeights),
            defaultColumnWidth: read("defaultColumnWidth", DEFAULTS.defaultColumnWidth),
            defaultColumnDisplay: read("defaultColumnDisplay", DEFAULTS.defaultColumnDisplay),
            centerFocusedColumn: read("centerFocusedColumn", DEFAULTS.centerFocusedColumn),
            alwaysCenterSingleColumn: read("alwaysCenterSingleColumn", DEFAULTS.alwaysCenterSingleColumn),
            tileNewWindows: read("tileNewWindows", DEFAULTS.tileNewWindows),
            enableWindowManagementShortcuts: read("enableWindowManagementShortcuts", DEFAULTS.enableWindowManagementShortcuts),
            debugLogging: read("debugLogging", DEFAULTS.debugLogging)
        });
    }

    function bootstrapKWin(root) {
        var globalRoot = root || {};
        var api = globalRoot.KWinRibbon;
        var env;
        var adapter;
        if (!isKWinRuntime(globalRoot)) {
            return null;
        }
        if (globalRoot.__kwinRibbonAdapter) {
            return globalRoot.__kwinRibbonAdapter;
        }
        env = createKWinEnvironment(globalRoot);
        adapter = createKWinAdapter(env, readKWinOptions(env));
        globalRoot.__kwinRibbonAdapter = adapter;
        globalRoot.kwinRibbonDebugSnapshot = function () {
            return adapter.debugSnapshot();
        };
        if (api) {
            api.adapter = adapter;
            api.debugSnapshot = globalRoot.kwinRibbonDebugSnapshot;
        }
        env.print("kwin-ribbon loaded " + VERSION);
        try {
            adapter.start();
            adapter.arrange();
        } catch (error) {
            env.print("kwin-ribbon startup failed: " + error);
        }
        return adapter;
    }
