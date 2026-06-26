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
