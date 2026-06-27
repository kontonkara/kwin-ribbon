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

    function windowCloseable(windowRef) {
        var value = readWindowValue(windowRef, ["closeable", "closable"]);
        return value !== false;
    }

    function tryCloseCall(object, name, args) {
        var result;
        if (!object || typeof object[name] !== "function") {
            return null;
        }
        try {
            result = object[name].apply(object, args || []);
            return result !== false;
        } catch (ignore) {
            return false;
        }
    }

    function boolConfigValue(value) {
        return value === true || value === "true" || value === "1" || value === 1;
    }

    function debugLoggingEnabled(root) {
        var value;
        if (root && typeof root.readConfig === "function") {
            try {
                value = root.readConfig("debugLogging", false);
            } catch (ignore) {
                value = false;
            }
            return boolConfigValue(value);
        }
        return false;
    }

    function debugPrint(root, message) {
        if (debugLoggingEnabled(root) && root && typeof root.print === "function") {
            root.print(message);
        }
    }

    function clientAreaKind(root, name, fallback) {
        var kwin = root && root.KWin;
        return firstDefined([
            kwin && kwin[name],
            root && root[name],
            fallback
        ]);
    }

    function outputName(output) {
        if (!output || typeof output !== "object") {
            return output;
        }
        return firstDefined([
            output.name,
            output.id,
            output.serialNumber
        ]);
    }

    function workspaceOutputs(workspace) {
        return toArray(firstDefined([
            callIfFunction(workspace, "outputs"),
            workspace && typeof workspace.outputs !== "function" ? workspace.outputs : undefined,
            callIfFunction(workspace, "screens"),
            workspace && typeof workspace.screens !== "function" ? workspace.screens : undefined
        ]));
    }

    function outputCandidates(workspace, outputId) {
        var id = String(outputId || "default");
        var outputs = workspaceOutputs(workspace);
        var result = [];
        var i;
        var name;
        for (i = 0; i < outputs.length; i += 1) {
            name = outputName(outputs[i]);
            if ((id !== "default" && String(name) === id) || (id === "default" && outputs.length === 1)) {
                result.push(outputs[i]);
            }
        }
        if (id !== "default") {
            result.push(id);
        }
        return result;
    }

    function desktopNumberFromDesktop(desktop) {
        var number;
        if (!desktop || typeof desktop !== "object") {
            return null;
        }
        number = firstDefined([desktop.x11DesktopNumber, desktop.index]);
        number = parseInt(number, 10);
        return isFinite(number) ? number : null;
    }

    function workspaceDesktops(workspace) {
        return toArray(firstDefined([
            callIfFunction(workspace, "desktops"),
            workspace && typeof workspace.desktops !== "function" ? workspace.desktops : undefined,
            callIfFunction(workspace, "virtualDesktops"),
            workspace && typeof workspace.virtualDesktops !== "function" ? workspace.virtualDesktops : undefined
        ]));
    }

    function desktopCandidates(workspace, output, workspaceIndex) {
        var desktopNumber = normalizeWorkspaceIndex(workspaceIndex) + 1;
        var desktops = workspaceDesktops(workspace);
        var result = [];
        var current;
        var i;
        current = callIfFunction(workspace, "currentDesktopForScreen", [output]);
        if (current) {
            result.push(current);
        }
        current = firstDefined([
            workspace && workspace.currentDesktop,
            workspace && workspace.currentVirtualDesktop,
            workspace && workspace.activeDesktop
        ]);
        if (current && result.indexOf(current) < 0) {
            result.push(current);
        }
        for (i = 0; i < desktops.length; i += 1) {
            if (desktopNumberFromDesktop(desktops[i]) === desktopNumber && result.indexOf(desktops[i]) < 0) {
                result.push(desktops[i]);
            }
        }
        return result;
    }

    function clientAreaOptions(root) {
        return [
            { name: "WorkArea", value: clientAreaKind(root, "WorkArea", 5) },
            { name: "MaximizeArea", value: clientAreaKind(root, "MaximizeArea", 2) },
            { name: "PlacementArea", value: clientAreaKind(root, "PlacementArea", 0) },
            { name: "MovementArea", value: clientAreaKind(root, "MovementArea", 1) }
        ];
    }

    function clientAreaResult(area, path) {
        return {
            area: area,
            path: path
        };
    }

    function clientArea(root, workspace, outputId, workspaceIndex) {
        var area;
        var desktopNumber = normalizeWorkspaceIndex(workspaceIndex) + 1;
        var kinds = clientAreaOptions(root);
        var outputs = outputCandidates(workspace, outputId);
        var i;
        var j;
        var k;
        var desktops;
        for (i = 0; i < kinds.length; i += 1) {
            for (j = 0; j < outputs.length; j += 1) {
                desktops = desktopCandidates(workspace, outputs[j], workspaceIndex);
                for (k = 0; k < desktops.length; k += 1) {
                    area = normalizeGeometry(callIfFunction(workspace, "clientArea", [kinds[i].value, outputs[j], desktops[k]]));
                    if (validGeometry(area)) {
                        return clientAreaResult(area, kinds[i].name + ":output-desktop");
                    }
                }
                area = normalizeGeometry(callIfFunction(workspace, "clientArea", [kinds[i].value, outputs[j], desktopNumber]));
                if (validGeometry(area)) {
                    return clientAreaResult(area, kinds[i].name + ":legacy-output-number");
                }
            }
            area = normalizeGeometry(callIfFunction(workspace, "clientArea", [kinds[i].value, desktopNumber]));
            if (validGeometry(area)) {
                return clientAreaResult(area, kinds[i].name + ":legacy-number");
            }
        }
        return clientAreaResult({ x: 0, y: 0, width: 1, height: 1 }, "fallback-1x1");
    }

    function formatGeometry(value) {
        return value.x + "," + value.y + " " + value.width + "x" + value.height;
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
                var result = clientArea(globalRoot, workspace, outputId, workspaceIndex);
                this.lastClientArea = {
                    outputId: String(outputId || "default"),
                    workspaceIndex: normalizeWorkspaceIndex(workspaceIndex),
                    path: result.path,
                    area: result.area
                };
                debugPrint(globalRoot, "kwin-ribbon client area path=" + result.path + " output=" + this.lastClientArea.outputId + " workspace=" + this.lastClientArea.workspaceIndex + " area=" + formatGeometry(result.area));
                return result.area;
            },
            setFrameGeometry: function (windowRef, frameGeometry) {
                if (!windowRef || !validGeometry(frameGeometry)) {
                    return false;
                }
                try {
                    windowRef.frameGeometry = frameGeometry;
                    return true;
                } catch (ignore) {
                    return false;
                }
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
            raiseWindow: function (windowRef) {
                try {
                    if (typeof workspace.raiseWindow === "function") {
                        workspace.raiseWindow(windowRef);
                        return true;
                    }
                } catch (ignore) {
                    return false;
                }
                return false;
            },
            activateWindow: function (windowRef) {
                try {
                    if (typeof workspace.activateWindow === "function") {
                        workspace.activateWindow(windowRef);
                        return true;
                    }
                    if (typeof workspace.activeWindow !== "undefined") {
                        workspace.activeWindow = windowRef;
                        return true;
                    }
                } catch (ignore) {
                    return false;
                }
                return false;
            },
            closeWindow: function (windowRef) {
                var result;
                if (!windowRef || !windowCloseable(windowRef)) {
                    return false;
                }
                result = tryCloseCall(windowRef, "closeWindow");
                if (result !== null) {
                    return result;
                }
                result = tryCloseCall(windowRef, "close");
                if (result !== null) {
                    return result;
                }
                result = tryCloseCall(workspace, "closeWindow", [windowRef]);
                if (result !== null) {
                    return result;
                }
                result = tryCloseCall(workspace, "closeClient", [windowRef]);
                if (result !== null) {
                    return result;
                }
                result = tryCloseCall(workspace, "closeActiveWindow");
                if (result !== null) {
                    return result;
                }
                result = tryCloseCall(workspace, "slotWindowClose");
                if (result !== null) {
                    return result;
                }
                return false;
            },
            registerShortcut: function (name, title, shortcut, callback) {
                if (typeof globalRoot.registerShortcut === "function") {
                    try {
                        globalRoot.registerShortcut(name, title, shortcut, callback);
                        return true;
                    } catch (ignore) {
                        return false;
                    }
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
            enableDefaultDevelopmentShortcuts: read("enableDefaultDevelopmentShortcuts", DEFAULTS.enableDefaultDevelopmentShortcuts),
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
        globalRoot.kwinRibbonRunAction = function (actionName, arg) {
            return adapter.dispatchAction(actionName, arg || {});
        };
        globalRoot.kwinRibbonDebugSnapshot = function () {
            return adapter.debugSnapshot();
        };
        if (api) {
            api.adapter = adapter;
            api.runAction = globalRoot.kwinRibbonRunAction;
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
