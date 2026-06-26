# KWin Script Smoke Test

This smoke test is for the JavaScript KWin script package only. It does not cover overview, native input, transition effects, dynamic workspaces, or advanced fullscreen race handling.

## Install

```sh
npm run check
npm run kwin:install
```

Enable or restart the script from KWin scripts settings if Plasma does not load it automatically.

## Basic Checks

- Open two or three normal windows on one desktop.
- Confirm the script logs a short `kwin-ribbon loaded` message in KWin script output.
- Confirm normal windows are arranged as scrollable columns.
- Confirm focus changes update the active tiled window.
- Confirm new windows are inserted near the focused column.

## Shortcuts

The script registers project-local actions with empty default shortcuts. Assign temporary shortcuts in system settings before testing:

- `Ribbon: Focus column left`
- `Ribbon: Focus column right`
- `Ribbon: Focus window up`
- `Ribbon: Focus window down`
- `Ribbon: Move column left`
- `Ribbon: Move column right`
- `Ribbon: Move window up`
- `Ribbon: Move window down`
- `Ribbon: Maximize column`
- `Ribbon: Fullscreen window`
- `Ribbon: Toggle floating`
- `Ribbon: Center column`

## Debug Snapshot

If the KWin script console can evaluate globals, inspect:

```js
kwinRibbonDebugSnapshot()
```

The snapshot is plain data: options, model state, known window classifications, and the last projection.

## Remove

```sh
npm run kwin:remove
```

## Current Limitations

- This is an MVP adapter smoke test, not daily-use hardening.
- Some KWin API names differ by Plasma version; missing APIs fall back safely where possible.
- Fullscreen and floating are model-level state transitions with only basic KWin coordination so far.
- Overview, native bridge, transition effects, and dynamic workspace behavior are intentionally not included.
