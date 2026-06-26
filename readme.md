# kwin-ribbon

Scrollable column tiling and ribbon-style window management for KWin.

This repository is starting from a small KWin Script package and a pure runtime model. KWin API integration, overview, native input bridge, and transitions will be added after the core layout semantics are stable and tested.

## Current Status

- KWin Script package metadata and config skeleton.
- Generated `contents/code/main.js` entrypoint from `src/runtime` sources.
- Fast Node-based package and runtime checks.
- Initial pure state container and option normalization for the future layout model.

## Development

Run the fast check suite:

```sh
npm run check
```

Regenerate the KWin entrypoint after editing runtime sources:

```sh
npm run build
```

Install the script locally for KWin 6:

```sh
npm run kwin:install
```

Remove the local script package:

```sh
npm run kwin:remove
```

## Architecture

- `src/runtime` contains KWin-compatible JavaScript runtime code.
- `contents/code/main.js` is generated and is the script entrypoint loaded by KWin.
- `contents/config/main.xml` contains conservative script configuration defaults.
- `tests` runs under Node and should cover pure behavior before it is connected to KWin.

The layout engine should stay independent from KWin objects. The adapter layer will translate between KWin windows and plain layout state later.
