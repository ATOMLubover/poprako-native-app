# ComicCreator 设计文档

## 概述

`ComicCreator` 是用于上传/创建新漫画项目的核心组件。该组件基于 `NewComic` DTO 进行数据构建，并与全局 `AppState` 及 IPC 接口进行交互以获取必要信息（如 Collection 列表、成员列表）。

## 数据流与依赖

### 1. 核心 DTO
基于 `src/models/comic/comic.ts` 中的 `NewComic`：
- `collectionId`: string (必选，用户选择)
- `author`: string (必填)
- `title`: string (必填)
- `description`: string (选填)
- `isSeries`: boolean (开关)
- `tagIds`: string[] (Tag 选择器)
- `preAssignments`: NewAssignment[] (成员分配)

### 2. Store (`AppState`) 需求
需要扩展 `src/store/app.ts` 中的 `AppState`：
- 新增 `collectionIds: string[]` (用于下拉选择所属 Collection，模拟登录时填充)。
- 使用现有的 `currentTeamId` (用于成员搜索)。
- 使用现有的 `currentUser` (创建者自动成为 Reviewer/监修)。

### 3. IPC (Mock)
- **Search Members**:
  - Input: `teamId`, `keyword` (nickname part)
  - Output: `MemberBrief[]`
  - 描述：根据用户输入模糊搜索当前汉化组的成员。

## UI 布局设计

整体采用左右分栏布局，大尺寸容器。

### 1. 顶部主体区域 (Main Content)

#### 左侧：表单输入区 (Input Area)
- **基本信息**
  - Collection 选择 (下拉菜单/Dropdown)
  - 标题 (Input)
  - 作者 (Input)
  - 简介 (Textarea)
  - 连载中 (Switch, 对应 `isSeries`)

- **标签管理 (Tags)**
  - 显示已选 Tag 的 TagContainer (使用 `NatureTag`)。
  - "添加标签" 按钮 -> **激活右侧 Tag 选择器**。

- **人员分配 (Assignments)**
  - 列表项：翻译、校对、嵌字、美工、监修。
  - 交互：点击某职位的“选择人员” -> **激活右侧 Member 选择器**。
  - 特殊逻辑：
    - 监修 (Reviewer) 默认锁定为 `currentUser`，但允许更改（或只读显示）。

#### 右侧：选择器区域 (Selector Area)
此区域为动态内容，根据左侧用户的操作切换显示：
- **状态 A: 默认/Tag Selector**
  - 复用 `ComicSelector` 或 `TagDetailSwitch` 相关的 Tag 选择逻辑/组件。
  - 展示所有可用 Tags，支持点击选择/取消。
  
- **状态 B: Member Selector**
  - 搜索框：输入昵称。
  - 列表：展示 IPC 搜索返回的 `MemberBrief` 列表。
  - 选中后回调左侧，填充对应职位。

### 2. 底部功能区 (Footer)
- **取消按钮** (Secondary Style)
- **创建按钮** (Primary Style, `NatureButton`)
  - 校验必填项。
  - 构建 `NewComic` 对象。
  - 调用 IPC (Mock) 提交。

## 实现步骤

1.  **Store 更新**:
    - 修改 `src/store/app.ts`，添加 `collectionIds` 字段及相关 setter。
    - 添加模拟数据填充逻辑。

2.  **原子组件**:
    - 创建/确认 `MemberSelector` 组件 (支持搜索、展示列表)。

3.  **ComicCreator 组件**:
    - 搭建布局框架 (Left/Right/Footer)。
    - 实现左侧表单状态绑定。
    - 实现右侧 Selector 切换逻辑。
    - 集成 mock IPC 搜索成员。
    - 集成 mock IPC 提交 `NewComic`。
    - 自动将 `currentUser` 设为 Reviewer。

4.  **预览**:
    - 注册到 `src/views/PanelView.tsx` 的 `draft-board` 进行测试。

## 补充说明
- 遵循前端开发规范：中文注释、Hooks 分离逻辑、样式模块化。
- 错误处理：使用 `NotificationToast`。
