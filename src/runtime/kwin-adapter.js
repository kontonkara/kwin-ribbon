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
            lastProjection: function () {
                return lastProjection;
            }
        };
    }
