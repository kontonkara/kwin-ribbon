    function normalizeArea(area) {
        var value = area || {};
        return {
            x: parseFloat(value.x) || 0,
            y: parseFloat(value.y) || 0,
            width: clampViewportWidth(value.width),
            height: Math.max(1, parseFloat(value.height) || 1)
        };
    }

    function contentAreaForGap(area, gap) {
        var value = normalizeArea(area);
        var spacing = Math.max(0, parseFloat(gap) || 0);
        return {
            x: value.x + spacing,
            y: value.y + spacing,
            width: Math.max(1, value.width - spacing * 2),
            height: Math.max(1, value.height - spacing * 2)
        };
    }

    function roundedFrame(x, y, width, height) {
        return {
            x: Math.round(x),
            y: Math.round(y),
            width: Math.max(1, Math.round(width)),
            height: Math.max(1, Math.round(height))
        };
    }

    function projectColumnFrames(column, metric, area, scrollOffset, gap) {
        var frames = [];
        var x = area.x + metric.start - scrollOffset;
        var width = metric.width;
        var totalWeight = 0;
        var availableHeight;
        var y;
        var i;
        var id;
        var weight;
        var height;

        if (column.tabbed || column.windows.length <= 1) {
            for (i = 0; i < column.windows.length; i += 1) {
                frames.push({
                    windowId: column.windows[i],
                    frameGeometry: roundedFrame(x, area.y, width, area.height)
                });
            }
            return frames;
        }

        for (i = 0; i < column.windows.length; i += 1) {
            id = column.windows[i];
            totalWeight += clampHeightWeight(column.heightWeights[id] || 1);
        }
        availableHeight = Math.max(1, area.height - gap * (column.windows.length - 1));
        y = area.y;
        for (i = 0; i < column.windows.length; i += 1) {
            id = column.windows[i];
            if (i === column.windows.length - 1) {
                height = area.y + area.height - y;
            } else {
                weight = clampHeightWeight(column.heightWeights[id] || 1);
                height = availableHeight * weight / totalWeight;
            }
            frames.push({
                windowId: id,
                frameGeometry: roundedFrame(x, y, width, height)
            });
            y += Math.round(height) + gap;
        }
        return frames;
    }

    function projectArrangeScope(state, scope) {
        var value = scope || {};
        var outputId = String(value.outputId || "default");
        var workspaceIndex = normalizeWorkspaceIndex(value.workspaceIndex);
        var workspace = getWorkspace(state, outputId, workspaceIndex);
        var area = normalizeArea(value.area);
        var gap = scrollGap(state, value.gap);
        var contentArea = contentAreaForGap(area, gap);
        if (value.preserveScrollOffset !== true) {
            updateScrollOffsetForFocus(state, outputId, workspaceIndex, contentArea.width, { gap: gap });
        }
        var metrics = computeColumnMetrics(state, outputId, workspaceIndex, contentArea.width, gap);
        var frames = [];
        var i;
        var columnFrames;

        for (i = 0; i < workspace.columns.length; i += 1) {
            columnFrames = projectColumnFrames(workspace.columns[i], metrics.columns[i], contentArea, workspace.scrollOffset, gap);
            frames = frames.concat(columnFrames);
        }
        return {
            outputId: outputId,
            workspaceIndex: workspaceIndex,
            area: area,
            contentArea: contentArea,
            gap: gap,
            scrollOffset: workspace.scrollOffset,
            frames: frames
        };
    }
