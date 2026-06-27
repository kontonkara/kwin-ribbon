// SPDX-License-Identifier: MIT

#include "wheelbridge.h"

#include <kwin/input.h>
#include <kwin/input_event.h>
#include <kwin/workspace.h>

#include <QAction>
#include <QDebug>
#include <QMetaObject>

namespace KWin
{

namespace
{

QString bridgeActionName(const QString &actionName)
{
    return QStringLiteral("kwin-ribbon-wheel-bridge-") + actionName.mid(QStringLiteral("kwin-ribbon-").size());
}

} // namespace

RibbonWheelBridge::RibbonWheelBridge()
{
    registerWheelAction(QStringLiteral("kwin-ribbon-focus-window-or-column-up"), Qt::MetaModifier, PointerAxisUp);
    registerWheelAction(QStringLiteral("kwin-ribbon-focus-window-or-column-down"), Qt::MetaModifier, PointerAxisDown);
    registerWheelAction(QStringLiteral("kwin-ribbon-focus-workspace-up"), Qt::MetaModifier | Qt::ShiftModifier, PointerAxisUp);
    registerWheelAction(QStringLiteral("kwin-ribbon-focus-workspace-down"), Qt::MetaModifier | Qt::ShiftModifier, PointerAxisDown);

    if (m_debugLogging) {
        qDebug() << "kwin-ribbon wheel bridge loaded";
    }
}

void RibbonWheelBridge::registerWheelAction(const QString &actionName, Qt::KeyboardModifiers modifiers, PointerAxisDirection axis)
{
    QAction *action = new QAction(this);
    action->setObjectName(bridgeActionName(actionName));
    action->setText(QStringLiteral("KWin Ribbon Wheel Bridge: %1").arg(actionName));
    connect(action, &QAction::triggered, this, [this, actionName]() {
        triggerScriptAction(actionName);
    });

    input()->registerAxisShortcut(modifiers, axis, action);
    m_actions.append(action);

    if (m_debugLogging) {
        qDebug().noquote() << "kwin-ribbon wheel bridge registered" << action->objectName();
    }
}

void RibbonWheelBridge::triggerScriptAction(const QString &actionName)
{
    Workspace *workspace = Workspace::self();
    if (!workspace) {
        qWarning() << "kwin-ribbon wheel bridge cannot find workspace";
        return;
    }

    QAction *targetAction = workspace->findChild<QAction *>(actionName, Qt::FindChildrenRecursively);
    if (!targetAction) {
        qWarning().noquote() << "kwin-ribbon wheel bridge cannot find script action" << actionName;
        return;
    }

    if (m_debugLogging) {
        qDebug().noquote() << "kwin-ribbon wheel bridge triggering" << actionName;
    }

    QMetaObject::invokeMethod(targetAction, "trigger", Qt::QueuedConnection);
}

} // namespace KWin

#include "moc_wheelbridge.cpp"
