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
        { name: "kwin-ribbon-interactive-focus-column-left", title: "Ribbon: Focus column left", shortcut: "Meta+Alt+H", handler: scopedAction(focusColumnLeft) },
        { name: "kwin-ribbon-interactive-focus-column-right", title: "Ribbon: Focus column right", shortcut: "Meta+Alt+L", handler: scopedAction(focusColumnRight) },
        { name: "kwin-ribbon-interactive-focus-window-up", title: "Ribbon: Focus window up", shortcut: "Meta+Alt+K", handler: scopedAction(focusWindowUp) },
        { name: "kwin-ribbon-interactive-focus-window-down", title: "Ribbon: Focus window down", shortcut: "Meta+Alt+J", handler: scopedAction(focusWindowDown) },
        { name: "kwin-ribbon-interactive-move-column-left", title: "Ribbon: Move column left", shortcut: "Meta+Alt+Shift+H", handler: scopedAction(moveColumnLeft) },
        { name: "kwin-ribbon-interactive-move-column-right", title: "Ribbon: Move column right", shortcut: "Meta+Alt+Shift+L", handler: scopedAction(moveColumnRight) },
        { name: "kwin-ribbon-interactive-move-window-up", title: "Ribbon: Move window up", shortcut: "Meta+Alt+Shift+K", handler: scopedAction(moveWindowUp) },
        { name: "kwin-ribbon-interactive-move-window-down", title: "Ribbon: Move window down", shortcut: "Meta+Alt+Shift+J", handler: scopedAction(moveWindowDown) },
        { name: "kwin-ribbon-interactive-next-column-width", title: "Ribbon: Next column width", shortcut: "Meta+Alt+W", handler: switchColumnWidthAction },
        { name: "kwin-ribbon-interactive-previous-column-width", title: "Ribbon: Previous column width", shortcut: "Meta+Alt+Shift+W", handler: switchColumnWidthBackAction },
        { name: "kwin-ribbon-interactive-maximize-column", title: "Ribbon: Maximize column", shortcut: "Meta+Alt+M", handler: scopedAction(toggleColumnFullWidth) },
        { name: "kwin-ribbon-interactive-fullscreen-window", title: "Ribbon: Fullscreen window", shortcut: "Meta+Alt+F", handler: fullscreenWindowAction },
        { name: "kwin-ribbon-interactive-toggle-floating", title: "Ribbon: Toggle floating", shortcut: "Meta+Alt+Space", handler: floatingWindowAction },
        { name: "kwin-ribbon-interactive-center-column", title: "Ribbon: Center column", shortcut: "Meta+Alt+C", handler: centerColumnAction }
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
        return spec.handler(state, value);
    }
