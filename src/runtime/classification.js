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
        ready = readWindowValue(windowRef, ["ready", "readyForPainting", "readyForPaint"]);
        if (boolValue(readWindowValue(windowRef, ["minimized", "isMinimized", "hidden", "isHidden", "shaded", "shade", "isShade"])) || ready === false) {
            return classification(windowRef, options, "park", "temporarily-unavailable", true);
        }
        if (windowFullscreenValue(windowRef)) {
            return classification(windowRef, options, "fullscreen", "fullscreen", true);
        }
        return classification(windowRef, options, "tile", "normal", true);
    }
