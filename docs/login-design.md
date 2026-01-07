# 登录流程相关设计

当前的 poprako native（下称 native）是完全没有任何在线内容的，为了接入我后续的 poprako main server（下称 server），需开始着手构建在线功能的框架了。

## Overview

native 需要支持在线模式和离线模式两种模式。这应该通过一个 store 中的全局变量进行管理，如 isOnline 变量。

在离线状态下，部分组件和功能不予展示。

## 大致实现思路：LoginView 部分

LoginView 放在 views/ 下。

LoginView 是用户打开 native 的默认页面（和 PanelView 整体同级）。

LoginView 内含三个子页面，分别属于三个阶段：

1. 刚进入的默认阶段，为 CheckUpdatePage，（在请求 check update 接口时，用 spinner dot loader 占位）在 mounted 时会尝试最多两次后端的检测更新接口（这个接口你可以先 mock，总是返回成功且有更新）。响应体的 DTO 定义在 models/update.ts 下。当有更新时，在界面上显示一个 div 表示这些内容。在 footer 位置右对齐以 mist nature button 显示 “确认” 按钮。你也可以 mock 一个获取当前本地版本号的函数，用来比对 server 返回的这个 latestVersion，当前可以 mock 为总是返回要更新。
2. 如果发现没有更新的版本，则跳过显示 CheckUpdatePage 的实际内容，直接进入到 LoginPage。LoginPage 居中显示登录界面，DTO 你可以参考 models/user.ts/LoginReq。需要注意的是， qq 和 email 两者必须填一个，可以在一个 input 里输入，但是需要用 placeholder 提醒用户，该 input 的题目应该是 “账号”。invitationCode 是可选的，因为这是第一次登录并加入汉化组时才有用的内容。
3. 如果在 check update 时两次全失败，可以提示是否重试，如果不重试，允许用户点击 “以离线模式” 启动。
4. 在 LoginPage mount 后、显示之前，也需要请求后端，查看是否已经登录了。当前你可以 mock 掉，并总是返回未登录。
5. 实际上，Login Page 和 ApplyTeamPage 是在一个区域内显示的（对于 LoginView 来说）。ApplyTeamPage 是申请创建汉化组的页面，DTO 你可以参考 models/team.ts/CreateTeamApplicationReq。两者是以一个悬浮 topbar 的形式切换的。你需要参考 views/ToolboxPage（对应 LoginView）的实现方式。
6. 注意，在登录成后，会在全局有一个 MemberInfo 的存储，用来表示 **在线模式** 下，当前用户的身份。

## 业务逻辑总结

根据现有代码库和需求分析，LoginView 是应用的入口点，承载了 **版本检查**、**在线状态初始化** 和 **用户认证** 三大核心职责。

1.  **全局状态管理**：
    *   引入 `isOnline` 状态标识当前应用是在线/离线模式。
    *   引入 `currentUser` (类型参考 `MemberInfo`) 存储当前登录用户信息。
    *   需要一个视图切换机制，在 `LoginView` (认证/启动前) 和 `PanelView` (主应用界面) 之间切换。

2.  **启动流程 (LoginView)**：
    *   **初始阶段 (Phase 1): 版本检查 (CheckUpdatePage)**
        *   **Action**: 组件挂载时自动调用 Mock 的 `checkUpdate`。
        *   **Loading**: 使用 `DotLoadSpinner`。
        *   **Success (有更新)**: 展示更新内容 (`models/update.ts`), 提供 "确认" 按钮 (Mist 风格 NatureButton)。
        *   **Success (无更新)**: 自动跳转 Phase 2。
        *   **Fail**: 尝试 2 次。若全失败，提供 UI 选项：“重试” 或 “以离线模式启动”。离线模式将设置 `isOnline=false` 并直接进入 `PanelView`。
    *   **认证阶段 (Phase 2): 登录/申请 (Container)**
        *   **Action**: 进入前检查登录状态 (Mock `checkLoginStatus`)，若已登录直接进入 Phase 3 (`PanelView`)。
        *   **Layout**: 采用 TopBar 选项卡切换模式 (参考 `ToolboxPage`)，包含 "登录" (LoginPage) 和 "申请建组" (ApplyTeamPage)。
        *   **LoginPage**:
            *   输入: 账号 (QQ/Email 合并), 密码, 邀请码 (可选)。
            *   提交: Mock `login` 接口。成功后设置全局 User 信息, `isOnline=true`，进入 `PanelView`。
        *   **ApplyTeamPage**:
            *   输入: 参考 `CreateTeamApplicationReq` (名称, 简介, QQ, 描述)。
            *   提交: Mock `applyTeam` 接口。

## 实现步骤计划

1.  **基础设施准备**
    *   在 `src/store` 中创建或扩充 Store (如 `useAppStore` 或 context)，包含 `view` ('login' | 'panel')、`isOnline`、`currentUser` 状态。
    *   修改 `src/App.tsx`，根据 Store 中的 `view` 状态决定渲染 `LoginView` 还是 `PanelView`。

2.  **Mock 接口实现** (建议放在 `src/ipc/mock_login.ts` 或类似位置)
    *   `mockCheckUpdate()`: 模拟版本检查。
    *   `mockGetLocalVersion()`: 模拟获取本地版本。
    *   `mockLogin(req: LoginReq)`: 模拟登录。
    *   `mockCheckLoginStatus()`: 模拟检查登录状态。
    *   `mockApplyTeam(req: CreateTeamApplicationReq)`: 模拟建组申请。

3.  **UI 组件开发 (src/views/Login/)**
    *   创建 `src/views/Login/CheckUpdatePage.tsx`:
        *   实现版本检查逻辑、重试逻辑、离线模式入口。
    *   创建 `src/views/Login/LoginPage.tsx`:
        *   实现登录表单。
    *   创建 `src/views/Login/ApplyTeamPage.tsx`:
        *   实现建组申请表单。
    *   创建 `src/views/Login/LoginView.tsx` (主容器):
        *   管理 Phase 1 -> Phase 2 的流转。
        *   实现 LoginPage 与 ApplyTeamPage 的 Tab 切换 (参考 `ToolboxPage`)。

4.  **集成与验证**
    *   在 `LoginView` 中集成上述子页面。
    *   在 `App.tsx` 中引入 `LoginView`。
    *   验证流程：启动 -> 检查更新 -> (有更新显示/无更新跳转) -> 登录界面 -> 登录 -> 进入主界面。
    *   运行 `get_errors` 确保无类型错误。