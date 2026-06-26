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
        var workspace = getWorkspace(state, actionOutputId(scope), actionWorkspaceIndex(scope));
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

    var RIBBON_ACTION_SPECS = [
        { name: "kwin-ribbon-focus-column-left", title: "Ribbon: Focus column left", shortcut: "", handler: scopedAction(focusColumnLeft) },
        { name: "kwin-ribbon-focus-column-right", title: "Ribbon: Focus column right", shortcut: "", handler: scopedAction(focusColumnRight) },
        { name: "kwin-ribbon-focus-window-up", title: "Ribbon: Focus window up", shortcut: "", handler: scopedAction(focusWindowUp) },
        { name: "kwin-ribbon-focus-window-down", title: "Ribbon: Focus window down", shortcut: "", handler: scopedAction(focusWindowDown) },
        { name: "kwin-ribbon-move-column-left", title: "Ribbon: Move column left", shortcut: "", handler: scopedAction(moveColumnLeft) },
        { name: "kwin-ribbon-move-column-right", title: "Ribbon: Move column right", shortcut: "", handler: scopedAction(moveColumnRight) },
        { name: "kwin-ribbon-move-window-up", title: "Ribbon: Move window up", shortcut: "", handler: scopedAction(moveWindowUp) },
        { name: "kwin-ribbon-move-window-down", title: "Ribbon: Move window down", shortcut: "", handler: scopedAction(moveWindowDown) },
        { name: "kwin-ribbon-maximize-column", title: "Ribbon: Maximize column", shortcut: "", handler: scopedAction(toggleColumnFullWidth) },
        { name: "kwin-ribbon-fullscreen-window", title: "Ribbon: Fullscreen window", shortcut: "", handler: fullscreenWindowAction },
        { name: "kwin-ribbon-toggle-floating", title: "Ribbon: Toggle floating", shortcut: "", handler: floatingWindowAction },
        { name: "kwin-ribbon-center-column", title: "Ribbon: Center column", shortcut: "", handler: centerColumnAction }
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
