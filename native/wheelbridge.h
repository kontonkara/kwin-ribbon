// SPDX-License-Identifier: MIT

#pragma once

#include <kwin/effect/globals.h>
#include <kwin/plugin.h>

#include <QList>
#include <QString>

class QAction;

namespace KWin
{

class RibbonWheelBridge : public Plugin
{
    Q_OBJECT

public:
    explicit RibbonWheelBridge();

private:
    void registerWheelAction(const QString &actionName, Qt::KeyboardModifiers modifiers, PointerAxisDirection axis);
    void triggerScriptAction(const QString &actionName);

    QList<QAction *> m_actions;
    bool m_debugLogging = false;
};

} // namespace KWin
