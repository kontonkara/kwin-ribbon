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

    function adapterDebugLog(env, options, message) {
        if (options && options.debugLogging === true && env && typeof env.print === "function") {
            env.print(message);
        }
    }

    function createKWinAdapter(env, rawOptions) {
        var adapterEnv = env || {};
        var options = copyOptions(rawOptions);
        var state = createState(options);
        var registry = emptyMap();
        var skippedRegistry = emptyMap();
        var started = false;
        var lastProjection = null;
        var shortcutsRegistered = false;
        var shortcutRegistrations = [];
        var lastActionDiagnostics = null;

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

        function fallbackContextForWindow(id, info) {
            var active = adapterActiveWindow(adapterEnv);
            var activeId = windowIdFromWindow(active);
            var location = state.windowIndex[id];
            var parked = state.parked[id];
            var outputId = (location && location.outputId) || (parked && parked.outputId) || (info && info.outputId) || "default";
            var workspaceIndex = location ? location.workspaceIndex : (parked ? parked.workspaceIndex : ((info && info.workspaceIndex !== undefined) ? info.workspaceIndex : 0));
            var workspace = getWorkspace(state, outputId, workspaceIndex);
            var wasFocusedTiled = location && focusedWindowId(workspace) === id;
            return {
                outputId: outputId,
                workspaceIndex: workspaceIndex,
                needed: activeId === id || (!activeId && (wasFocusedTiled || state.lastFloatingWindowId === id))
            };
        }

        function activateFocusedFallback(context) {
            var workspace;
            var id;
            var entry;
            if (!context || context.needed !== true || typeof adapterEnv.activateWindow !== "function") {
                return null;
            }
            workspace = getWorkspace(state, context.outputId, context.workspaceIndex);
            id = focusedWindowId(workspace);
            entry = id ? registry[id] || null : null;
            if (entry && entry.windowRef) {
                adapterEnv.activateWindow(entry.windowRef);
                return state.windowIndex[id] || null;
            }
            return null;
        }

        function connectWorkspaceSignals(names, handler) {
            var connected = false;
            var seen = [];
            var i;
            var signal;
            for (i = 0; i < names.length; i += 1) {
                signal = adapterEnv.workspace && adapterEnv.workspace[names[i]];
                if (signal && seen.indexOf(signal) < 0) {
                    seen.push(signal);
                    connected = signalConnect(signal, handler) || connected;
                }
            }
            return connected;
        }

        function handleWindowAdded(windowRef) {
            var info = classify(windowRef);
            var fallback;
            if (!info.windowId) {
                return info;
            }
            fallback = fallbackContextForWindow(info.windowId, info);
            if (!info.manageable) {
                skippedRegistry[info.windowId] = info;
                if (registry[info.windowId] || state.windowIndex[info.windowId] || state.parked[info.windowId]) {
                    delete registry[info.windowId];
                    removeWindow(state, info.windowId);
                    activateFocusedFallback(fallback);
                }
                return info;
            }
            delete skippedRegistry[info.windowId];
            remember(windowRef, info);
            if (info.action === "tile") {
                if (options.tileNewWindows !== false && !state.floating[info.windowId] && !state.fullscreen[info.windowId]) {
                    if (state.parked[info.windowId]) {
                        restoreWindow(state, info.windowId);
                    } else {
                        addWindow(state, info.outputId, info.workspaceIndex, info.windowId);
                    }
                }
            } else if (info.action === "fullscreen") {
                setWindowFullscreen(state, info.windowId, true);
            } else if (info.action === "park" && state.windowIndex[info.windowId]) {
                parkWindow(state, info.windowId, info.reason);
                activateFocusedFallback(fallback);
            }
            return info;
        }

        function handleWindowRemoved(windowRefOrId) {
            var id = typeof windowRefOrId === "string" ? windowRefOrId : windowIdFromWindow(windowRefOrId);
            var info;
            var fallback;
            if (!id) {
                return null;
            }
            info = (registry[id] && registry[id].classification) || skippedRegistry[id] || (typeof windowRefOrId === "string" ? null : classify(windowRefOrId, id));
            fallback = fallbackContextForWindow(id, info);
            delete registry[id];
            delete skippedRegistry[id];
            removeWindow(state, id);
            activateFocusedFallback(fallback);
            return id;
        }

        function handleActiveWindowChanged(windowRef) {
            var info = classify(windowRef);
            if (!info.windowId) {
                return null;
            }
            if ((registry[info.windowId] || skippedRegistry[info.windowId] || state.windowIndex[info.windowId] || state.parked[info.windowId]) && info.action !== "tile") {
                handleWindowAdded(windowRef);
                return null;
            }
            if (state.windowIndex[info.windowId]) {
                return focusWindowById(state, info.windowId);
            }
            if (state.floating[info.windowId]) {
                state.lastFloatingWindowId = info.windowId;
            }
            return null;
        }

        function syncActiveWindow() {
            return handleActiveWindowChanged(adapterActiveWindow(adapterEnv));
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
            for (id in skippedRegistry) {
                if (hasOwn(skippedRegistry, id) && !seen[id]) {
                    delete skippedRegistry[id];
                }
            }
            syncActiveWindow();
            return state;
        }

        function start() {
            if (started) {
                return state;
            }
            started = true;
            if (adapterEnv.workspace) {
                connectWorkspaceSignals(["windowAdded", "clientAdded"], function (windowRef) {
                    handleWindowAdded(windowRef);
                    syncActiveWindow();
                    arrange();
                });
                connectWorkspaceSignals(["windowRemoved", "windowDeleted", "windowClosed", "clientRemoved", "clientDeleted", "clientClosed"], function (windowRef) {
                    handleWindowRemoved(windowRef);
                    arrange();
                });
                connectWorkspaceSignals(["activeWindowChanged", "clientActivated"], function (windowRef) {
                    handleActiveWindowChanged(windowRef || adapterActiveWindow(adapterEnv));
                    arrange();
                });
                connectWorkspaceSignals(["currentDesktopChanged", "currentVirtualDesktopChanged"], function () {
                    syncWindows();
                    arrange();
                });
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
                windowId: value.windowId || (activeInfo && activeInfo.windowId),
                area: area || { x: 0, y: 0, width: 1, height: 1 },
                gap: value.gap,
                preserveScrollOffset: value.preserveScrollOffset === true
            };
        }

        function workspaceArrangeSnapshot(scope) {
            var workspace = getWorkspace(state, actionOutputId(scope), actionWorkspaceIndex(scope));
            return {
                outputId: actionOutputId(scope),
                workspaceIndex: actionWorkspaceIndex(scope),
                focusColumn: workspace.focusColumn,
                scrollOffset: workspace.scrollOffset,
                focusedModelWindowId: focusedWindowId(workspace)
            };
        }

        function currentRuntimeSnapshot() {
            var active = adapterActiveWindow(adapterEnv);
            var activeInfo = active ? classify(active) : null;
            var outputId = (activeInfo && activeInfo.outputId) || "default";
            var workspaceIndex = activeInfo ? activeInfo.workspaceIndex : 0;
            var workspace = getWorkspace(state, outputId, workspaceIndex);
            var activeId = activeInfo && activeInfo.windowId;
            return {
                activeKWinWindowId: activeId || null,
                activeKWinWindowReason: activeInfo ? activeInfo.reason : null,
                activeKWinWindowKnown: activeId ? !!registry[activeId] : false,
                outputId: outputId,
                workspaceIndex: workspaceIndex,
                focusColumn: workspace.focusColumn,
                scrollOffset: workspace.scrollOffset,
                focusedModelWindowId: focusedWindowId(workspace)
            };
        }

        function readableFrameGeometry(windowRef) {
            var value;
            if (!windowRef) {
                return null;
            }
            try {
                value = normalizeGeometry(windowRef.frameGeometry);
            } catch (ignore) {
                value = null;
            }
            return validGeometry(value) ? value : null;
        }

        function sameFrameGeometry(left, right) {
            var a = normalizeGeometry(left);
            var b = normalizeGeometry(right);
            if (!validGeometry(a) || !validGeometry(b)) {
                return false;
            }
            return Math.round(a.x) === Math.round(b.x) && Math.round(a.y) === Math.round(b.y) && Math.round(a.width) === Math.round(b.width) && Math.round(a.height) === Math.round(b.height);
        }

        function writeFrame(windowRef, frameGeometry) {
            var beforeFrame = readableFrameGeometry(windowRef);
            var afterFrame;
            var writeResult = true;
            var success;
            if (typeof adapterEnv.setFrameGeometry === "function") {
                writeResult = adapterEnv.setFrameGeometry(windowRef, frameGeometry);
            } else {
                try {
                    windowRef.frameGeometry = frameGeometry;
                } catch (ignore) {
                    writeResult = false;
                }
            }
            afterFrame = readableFrameGeometry(windowRef);
            success = writeResult !== false;
            if (afterFrame && !sameFrameGeometry(afterFrame, frameGeometry)) {
                success = false;
            }
            return {
                beforeFrame: beforeFrame,
                requestedFrame: normalizeGeometry(frameGeometry),
                afterFrame: afterFrame,
                success: success
            };
        }

        function arrange(scope, diagnostics) {
            var targetScope = defaultArrangeScope(scope);
            var beforeSnapshot = diagnostics && diagnostics.beforeSnapshot ? diagnostics.beforeSnapshot : workspaceArrangeSnapshot(targetScope);
            var projection = projectArrangeScope(state, targetScope);
            var afterSnapshot = workspaceArrangeSnapshot(targetScope);
            var attemptedWrites = 0;
            var successfulWrites = 0;
            var failedWrites = 0;
            var frameSamples = [];
            var i;
            var entry;
            var result;
            for (i = 0; i < projection.frames.length; i += 1) {
                entry = registry[projection.frames[i].windowId];
                if (entry && entry.windowRef) {
                    attemptedWrites += 1;
                    result = writeFrame(entry.windowRef, projection.frames[i].frameGeometry);
                    if (result && result.success) {
                        successfulWrites += 1;
                    } else {
                        failedWrites += 1;
                    }
                    if (frameSamples.length < 5) {
                        frameSamples.push({
                            windowId: projection.frames[i].windowId,
                            beforeFrame: result ? result.beforeFrame : null,
                            requestedFrame: result ? result.requestedFrame : projection.frames[i].frameGeometry,
                            afterFrame: result ? result.afterFrame : null,
                            success: result ? result.success : false
                        });
                    }
                }
            }
            lastProjection = projection;
            lastActionDiagnostics = {
                actionId: diagnostics && diagnostics.actionId ? diagnostics.actionId : null,
                activeKWinWindowId: diagnostics && diagnostics.activeKWinWindowId ? diagnostics.activeKWinWindowId : null,
                activeKWinWindowReason: diagnostics && diagnostics.activeKWinWindowReason ? diagnostics.activeKWinWindowReason : null,
                activeKWinWindowKnown: diagnostics && diagnostics.activeKWinWindowKnown === true,
                outputId: afterSnapshot.outputId,
                workspaceIndex: afterSnapshot.workspaceIndex,
                beforeFocusColumn: beforeSnapshot.focusColumn,
                afterFocusColumn: afterSnapshot.focusColumn,
                beforeFocusedModelWindowId: beforeSnapshot.focusedModelWindowId,
                afterFocusedModelWindowId: afterSnapshot.focusedModelWindowId,
                beforeScrollOffset: beforeSnapshot.scrollOffset,
                afterScrollOffset: afterSnapshot.scrollOffset,
                projectedFrameCount: projection.frames.length,
                attemptedGeometryWriteCount: attemptedWrites,
                successfulGeometryWriteCount: successfulWrites,
                failedGeometryWriteCount: failedWrites,
                frameSamples: frameSamples
            };
            return projection;
        }

        function activateLocation(location) {
            var columnEntry;
            var windowId;
            var entry;
            if (!location || typeof adapterEnv.activateWindow !== "function" || location.columnIndex === undefined || location.windowIndex === undefined) {
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

        function focusedRegistryEntry(scope) {
            var scopeId = String((scope && scope.windowId) || "");
            var workspace = getWorkspace(state, actionOutputId(scope), actionWorkspaceIndex(scope));
            var id = focusedWindowId(workspace);
            if (scopeId !== "" && registry[scopeId]) {
                return registry[scopeId];
            }
            return id ? registry[id] || null : null;
        }

        function presentFullscreenEntry(entry) {
            if (!entry || !entry.windowRef) {
                return false;
            }
            if (typeof adapterEnv.raiseWindow === "function" && adapterEnv.raiseWindow(entry.windowRef)) {
                if (typeof adapterEnv.activateWindow === "function") {
                    adapterEnv.activateWindow(entry.windowRef);
                }
                return true;
            }
            if (typeof adapterEnv.activateWindow === "function") {
                return adapterEnv.activateWindow(entry.windowRef);
            }
            return false;
        }

        function applyFullscreenAction(actionName, entry) {
            var id;
            if (actionName !== "kwin-ribbon-fullscreen-window" || !entry || !entry.windowRef || typeof adapterEnv.setWindowFullscreen !== "function") {
                return false;
            }
            id = entry.classification && entry.classification.windowId;
            if (!id) {
                return false;
            }
            return adapterEnv.setWindowFullscreen(entry.windowRef, state.fullscreen[id] === true);
        }

        function fullscreenTargetEnabled(entry) {
            var id = entry && entry.classification && entry.classification.windowId;
            return !!(id && state.fullscreen[id]);
        }

        function closeActiveWindow(active, activeInfo, targetScope, beforeSnapshot) {
            var closed = false;
            if (active && typeof adapterEnv.closeWindow === "function") {
                closed = adapterEnv.closeWindow(active) === true;
            }
            if (closed) {
                syncWindows();
                arrange(targetScope, {
                    actionId: "kwin-ribbon-close-window",
                    activeKWinWindowId: activeInfo && activeInfo.windowId,
                    activeKWinWindowReason: activeInfo && activeInfo.reason,
                    activeKWinWindowKnown: !!(activeInfo && activeInfo.windowId && registry[activeInfo.windowId]),
                    beforeSnapshot: beforeSnapshot
                });
            }
            return closed;
        }

        function dispatchAction(actionName, scope) {
            var active = adapterActiveWindow(adapterEnv);
            var activeInfo = active ? classify(active) : null;
            var activeLocation = handleActiveWindowChanged(active);
            var targetScope = defaultArrangeScope(scope);
            var beforeSnapshot = workspaceArrangeSnapshot(targetScope);
            var fullscreenTarget = focusedRegistryEntry(targetScope);
            var fullscreenEnabled;
            var location = dispatchRibbonAction(state, actionName, targetScope);
            if (location !== null && location !== undefined) {
                if (actionName === "kwin-ribbon-close-window") {
                    return closeActiveWindow(active, activeInfo, targetScope, beforeSnapshot);
                }
                applyFullscreenAction(actionName, fullscreenTarget);
                fullscreenEnabled = fullscreenTargetEnabled(fullscreenTarget);
                targetScope.preserveScrollOffset = actionName === "kwin-ribbon-center-column";
                arrange(targetScope, {
                    actionId: actionName,
                    activeKWinWindowId: activeInfo && activeInfo.windowId,
                    activeKWinWindowReason: activeInfo && activeInfo.reason,
                    activeKWinWindowKnown: !!(activeInfo && activeInfo.windowId && registry[activeInfo.windowId]),
                    beforeSnapshot: beforeSnapshot
                });
                if (fullscreenEnabled) {
                    presentFullscreenEntry(fullscreenTarget);
                } else {
                    activateLocation(location || activeLocation);
                }
            }
            return location;
        }

        function registerShortcuts() {
            var specs;
            var i;
            var spec;
            var registered;
            if (shortcutsRegistered || options.enableWindowManagementShortcuts === false || typeof adapterEnv.registerShortcut !== "function") {
                return false;
            }
            shortcutsRegistered = true;
            shortcutRegistrations = [];
            specs = getRibbonActionSpecs(options);
            for (i = 0; i < specs.length; i += 1) {
                spec = specs[i];
                registered = adapterEnv.registerShortcut(spec.name, spec.title, spec.shortcut, (function (actionName) {
                    return function () {
                        dispatchAction(actionName);
                    };
                }(spec.name)));
                shortcutRegistrations.push({
                    name: spec.name,
                    title: spec.title,
                    shortcut: spec.shortcut,
                    registered: registered !== false
                });
                adapterDebugLog(adapterEnv, options, "kwin-ribbon shortcut action=" + spec.name + " default=" + spec.shortcut + " registered=" + (registered === false ? "false" : "true"));
            }
            return true;
        }

        function plainData(value) {
            return JSON.parse(JSON.stringify(value));
        }

        function knownWindowSnapshots() {
            var result = [];
            var id;
            var info;
            for (id in registry) {
                if (hasOwn(registry, id)) {
                    info = registry[id].classification;
                    result.push({
                        windowId: info.windowId,
                        outputId: info.outputId,
                        workspaceIndex: info.workspaceIndex,
                        action: info.action,
                        reason: info.reason,
                        manageable: info.manageable,
                        fullscreen: info.fullscreen
                    });
                }
            }
            return result;
        }

        function skippedWindowSnapshots() {
            var result = [];
            var id;
            var info;
            for (id in skippedRegistry) {
                if (hasOwn(skippedRegistry, id)) {
                    info = skippedRegistry[id];
                    result.push({
                        windowId: info.windowId,
                        outputId: info.outputId,
                        workspaceIndex: info.workspaceIndex,
                        action: info.action,
                        reason: info.reason,
                        manageable: info.manageable,
                        fullscreen: info.fullscreen
                    });
                }
            }
            return result;
        }

        function debugSnapshot() {
            return {
                version: VERSION,
                options: plainData(options),
                actions: plainData(shortcutRegistrations.length > 0 ? shortcutRegistrations : getRibbonActionSpecs(options)),
                runActionAvailable: true,
                runtime: plainData(currentRuntimeSnapshot()),
                state: plainData(state),
                knownWindows: knownWindowSnapshots(),
                skippedWindows: skippedWindowSnapshots(),
                lastAction: lastActionDiagnostics ? plainData(lastActionDiagnostics) : null,
                lastProjection: lastProjection ? plainData(lastProjection) : null
            };
        }

        return {
            state: state,
            registry: registry,
            skippedRegistry: skippedRegistry,
            options: options,
            start: start,
            syncWindows: syncWindows,
            handleWindowAdded: handleWindowAdded,
            handleWindowRemoved: handleWindowRemoved,
            handleActiveWindowChanged: handleActiveWindowChanged,
            arrange: arrange,
            dispatchAction: dispatchAction,
            registerShortcuts: registerShortcuts,
            debugSnapshot: debugSnapshot,
            lastProjection: function () {
                return lastProjection;
            }
        };
    }
