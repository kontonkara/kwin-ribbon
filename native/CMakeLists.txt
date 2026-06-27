kcoreaddons_add_plugin(kwin_ribbon_wheel_bridge
    INSTALL_NAMESPACE "kwin/plugins"
)

target_sources(kwin_ribbon_wheel_bridge PRIVATE
    main.cpp
    wheelbridge.cpp
)

target_link_libraries(kwin_ribbon_wheel_bridge PRIVATE
    KWin::kwin
    Qt6::Core
)
