// SPDX-License-Identifier: MIT

#include "wheelbridge.h"

#include <KPluginFactory>

#include <memory>

namespace KWin
{

class KWIN_EXPORT RibbonWheelBridgeFactory : public PluginFactory
{
    Q_OBJECT
    Q_PLUGIN_METADATA(IID PluginFactory_iid FILE "metadata.json")
    Q_INTERFACES(KWin::PluginFactory)

public:
    std::unique_ptr<Plugin> create() const override
    {
        return std::make_unique<RibbonWheelBridge>();
    }
};

} // namespace KWin

#include "main.moc"
