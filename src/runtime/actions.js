    function actionOutputId(scope) {
        return (scope && scope.outputId) || "default";
    }

    function actionWorkspaceIndex(scope) {
        return normalizeWorkspaceIndex(scope && scope.workspaceIndex);
    }

    function scopedAction(handler) {
        return function (state, scope) {
            return handler(state, actionOutputId(scope), actionWorkspaceIndex(scope));
        };
    }

    function focusedActionWindowId(state, scope) {
        var explicitId = String((scope && scope.windowId) || "");
        var workspace = getWorkspace(state, actionOutputId(scope), actionWorkspaceIndex(scope));
        if (explicitId !== "" && (state.windowIndex[explicitId] || state.parked[explicitId] || state.floating[explicitId] || state.fullscreen[explicitId])) {
            return explicitId;
        }
        return focusedWindowId(workspace);
    }

    function fullscreenWindowAction(state, scope) {
        var id = focusedActionWindowId(state, scope);
        return id ? toggleWindowFullscreen(state, id) : null;
    }

    function floatingWindowAction(state, scope) {
        var id = focusedActionWindowId(state, scope);
        return id ? toggleWindowFloating(state, id) : null;
    }

    function centerColumnAction(state, scope) {
        var value = scope || {};
        var area = normalizeArea(value.area);
        return centerFocusedColumnInViewport(state, actionOutputId(value), actionWorkspaceIndex(value), area.width, value.gap);
    }

    function switchColumnWidthAction(state, scope) {
        return switchPresetColumnWidth(state, actionOutputId(scope), actionWorkspaceIndex(scope), 1);
    }

    function switchColumnWidthBackAction(state, scope) {
        return switchPresetColumnWidthBack(state, actionOutputId(scope), actionWorkspaceIndex(scope));
    }

    var RIBBON_ACTION_SPECS = [
        { name: "kwin-ribbon-focus-column-left", title: "KWin Ribbon: Focus Column Left", handler: scopedAction(focusColumnLeft) },
        { name: "kwin-ribbon-focus-column-right", title: "KWin Ribbon: Focus Column Right", handler: scopedAction(focusColumnRight) },
        { name: "kwin-ribbon-focus-column-first", title: "KWin Ribbon: Focus First Column", handler: scopedAction(focusFirstColumn) },
        { name: "kwin-ribbon-focus-column-last", title: "KWin Ribbon: Focus Last Column", handler: scopedAction(focusLastColumn) },
        { name: "kwin-ribbon-focus-window-up", title: "KWin Ribbon: Focus Window Up", handler: scopedAction(focusWindowUp) },
        { name: "kwin-ribbon-focus-window-down", title: "KWin Ribbon: Focus Window Down", handler: scopedAction(focusWindowDown) },
        { name: "kwin-ribbon-focus-window-top", title: "KWin Ribbon: Focus Top Window", handler: scopedAction(focusTopWindow) },
        { name: "kwin-ribbon-focus-window-bottom", title: "KWin Ribbon: Focus Bottom Window", handler: scopedAction(focusBottomWindow) },
        { name: "kwin-ribbon-move-column-left", title: "KWin Ribbon: Move Column Left", handler: scopedAction(moveColumnLeft) },
        { name: "kwin-ribbon-move-column-right", title: "KWin Ribbon: Move Column Right", handler: scopedAction(moveColumnRight) },
        { name: "kwin-ribbon-move-column-first", title: "KWin Ribbon: Move Column First", handler: scopedAction(moveColumnFirst) },
        { name: "kwin-ribbon-move-column-last", title: "KWin Ribbon: Move Column Last", handler: scopedAction(moveColumnLast) },
        { name: "kwin-ribbon-move-window-up", title: "KWin Ribbon: Move Window Up", handler: scopedAction(moveWindowUp) },
        { name: "kwin-ribbon-move-window-down", title: "KWin Ribbon: Move Window Down", handler: scopedAction(moveWindowDown) },
        { name: "kwin-ribbon-move-window-top", title: "KWin Ribbon: Move Window Top", handler: scopedAction(moveWindowTop) },
        { name: "kwin-ribbon-move-window-bottom", title: "KWin Ribbon: Move Window Bottom", handler: scopedAction(moveWindowBottom) },
        { name: "kwin-ribbon-consume-or-expel-left", title: "KWin Ribbon: Consume or Expel Left", handler: scopedAction(consumeOrExpelLeft) },
        { name: "kwin-ribbon-consume-or-expel-right", title: "KWin Ribbon: Consume or Expel Right", handler: scopedAction(consumeOrExpelRight) },
        { name: "kwin-ribbon-consume-into-column-left", title: "KWin Ribbon: Consume Into Column Left", handler: scopedAction(consumeIntoColumnLeft) },
        { name: "kwin-ribbon-consume-into-column-right", title: "KWin Ribbon: Consume Into Column Right", handler: scopedAction(consumeIntoColumnRight) },
        { name: "kwin-ribbon-expel-from-column-left", title: "KWin Ribbon: Expel From Column Left", handler: scopedAction(expelFromColumnLeft) },
        { name: "kwin-ribbon-expel-from-column-right", title: "KWin Ribbon: Expel From Column Right", handler: scopedAction(expelFromColumnRight) },
        { name: "kwin-ribbon-swap-window-left", title: "KWin Ribbon: Swap Window Left", handler: scopedAction(swapWindowLeft) },
        { name: "kwin-ribbon-swap-window-right", title: "KWin Ribbon: Swap Window Right", handler: scopedAction(swapWindowRight) },
        { name: "kwin-ribbon-next-column-width", title: "KWin Ribbon: Next Column Width", handler: switchColumnWidthAction },
        { name: "kwin-ribbon-previous-column-width", title: "KWin Ribbon: Previous Column Width", handler: switchColumnWidthBackAction },
        { name: "kwin-ribbon-maximize-column", title: "KWin Ribbon: Maximize Column", handler: scopedAction(toggleColumnFullWidth) },
        { name: "kwin-ribbon-fullscreen-window", title: "KWin Ribbon: Fullscreen Window", handler: fullscreenWindowAction },
        { name: "kwin-ribbon-toggle-floating", title: "KWin Ribbon: Toggle Floating", handler: floatingWindowAction },
        { name: "kwin-ribbon-center-column", title: "KWin Ribbon: Center Column", handler: centerColumnAction }
    ];

    var RIBBON_DEVELOPMENT_SHORTCUTS = {
        "kwin-ribbon-focus-column-left": "Meta+Alt+H",
        "kwin-ribbon-focus-column-right": "Meta+Alt+L",
        "kwin-ribbon-focus-window-up": "Meta+Alt+K",
        "kwin-ribbon-focus-window-down": "Meta+Alt+J",
        "kwin-ribbon-move-column-left": "Meta+Alt+Shift+H",
        "kwin-ribbon-move-column-right": "Meta+Alt+Shift+L",
        "kwin-ribbon-move-window-up": "Meta+Alt+Shift+K",
        "kwin-ribbon-move-window-down": "Meta+Alt+Shift+J",
        "kwin-ribbon-next-column-width": "Meta+Alt+W",
        "kwin-ribbon-previous-column-width": "Meta+Alt+Shift+W",
        "kwin-ribbon-maximize-column": "Meta+Alt+M",
        "kwin-ribbon-fullscreen-window": "Meta+Alt+F",
        "kwin-ribbon-toggle-floating": "Meta+Alt+Space",
        "kwin-ribbon-center-column": "Meta+Alt+C"
    };

    function actionShortcut(name, options) {
        var opts = options || {};
        if (opts.enableDefaultDevelopmentShortcuts === true) {
            return RIBBON_DEVELOPMENT_SHORTCUTS[name] || "";
        }
        return "";
    }

    function getRibbonActionSpecs(options) {
        var result = [];
        var i;
        var spec;
        for (i = 0; i < RIBBON_ACTION_SPECS.length; i += 1) {
            spec = RIBBON_ACTION_SPECS[i];
            result.push({
                name: spec.name,
                title: spec.title,
                shortcut: actionShortcut(spec.name, options)
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
        return spec.handler(state, value);
    }
