{
  cmake,
  kdePackages,
  lib,
  libglvnd,
  ninja,
  nodejs,
  pkg-config,
  qt6,
  stdenv,
}:

stdenv.mkDerivation {
  pname = "kwin-ribbon";
  version = "0.1.0";

  src = lib.cleanSourceWith {
    src = ./.;
    filter = path: type:
      let
        name = baseNameOf path;
      in
      !(type == "directory" && (name == "build" || name == "node_modules"))
      && !(type == "symlink" && name == "result");
  };

  nativeBuildInputs = [
    cmake
    kdePackages.extra-cmake-modules
    ninja
    nodejs
    pkg-config
  ];

  buildInputs = [
    kdePackages.kconfig
    kdePackages.kcoreaddons
    kdePackages.kwin
    kdePackages.kwindowsystem
    libglvnd.dev
    qt6.qtbase
    qt6.qtdeclarative
  ];

  preConfigure = ''
    node scripts/build.js
  '';

  dontWrapQtApps = true;

  doCheck = true;

  checkPhase = ''
    runHook preCheck

    pushd ..
    node --check contents/code/main.js
    node tests/package.test.js
    node tests/native-wheel-bridge.test.js
    node tests/runtime.test.js
    node tests/window-classification.test.js
    node tests/arrange.test.js
    node tests/actions.test.js
    node tests/kwin-environment.test.js
    node tests/bootstrap.test.js
    node tests/kwin-adapter.test.js
    popd

    runHook postCheck
  '';

  doInstallCheck = true;

  installCheckPhase = ''
    runHook preInstallCheck

    test -f "$out/share/kwin/scripts/kwin-ribbon/metadata.json"
    test -f "$out/share/kwin/scripts/kwin-ribbon/contents/code/main.js"
    test -n "$(find "$out" -type f -name 'kwin_ribbon_wheel_bridge*.so' -print -quit)"

    runHook postInstallCheck
  '';

  meta = {
    description = "Ribbon-style KWin script with a native wheel input bridge";
    license = lib.licenses.mit;
    platforms = lib.platforms.linux;
  };
}
