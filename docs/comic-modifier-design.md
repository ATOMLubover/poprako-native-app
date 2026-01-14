# Comic Modifier 组件设计文档

> 本文档用于规划 `ComicModifier` 组件的功能、布局及交互逻辑，作为后续开发的指导依据。

## 1. 组件概述

`ComicModifier` 是用于**修改现有漫画项目**信息的组件。它基于 `ComicCreator` 的 UI 框架进行扩展，保留了基础信息编辑和人员分配功能，并在此基础上新增了**漫画图片上传与管理**的功能。

该组件将替代简单的编辑表单，提供一站式的漫画维护体验。

## 2. 布局设计 (Ref: ComicCreator & CompressorPage)

采用与 `ComicCreator` 一致的 **左右双栏** 布局。

### 2.1 左侧面板 (Left Panel) - 核心操作区

- **基础信息区域** (Top)

  - **Collection**: 下拉选择 (Mock 数据)。
  - **Title**: 文本输入。
  - **Author**: 文本输入。
  - **Description**: 只读输入框，点击后在右侧面板编辑。
  - **人员分配列表**: 包含 翻译、校对、嵌字、美工、监修 五个角色的当前人员展示。点击“更改”在右侧面板选择。

- **图片上传区域** (Bottom, **新增**)
  - 位置：位于左侧面板的最下方，与上方列表有一定间距或视作底部工具栏。
  - 布局：Flex 布局，水平排列。
  - **左对齐元素**:
    - 图标 (`Image` 或 `Upload` icon)。
    - 标题/说明文字 (如 "图片管理")。
  - **右对齐元素** (按钮组):
    - `[已上传列表]` 按钮: 点击后，右侧面板切换为 `UPLOAD_LIST` 模式。
    - `[选择上传]` 按钮: 样式需突出 (如 Primary 色)，点击后触发文件选择逻辑，并自动切换右侧为 `UPLOAD_LIST`。

### 2.2 右侧面板 (Right Panel) - 辅助/详情区

右侧面板根据 `panelMode` 显示不同内容，通过状态机管理视图切换。

- **Mode: `NONE`**
  - 空状态占位提示。
- **Mode: `DESC`**
  - 多行文本输入框，用于编辑简介。
- **Mode: `ASSIGN_[ROLE]`**
  - 复用 `UserSelector` 组件，进行人员选择。
- **Mode: `UPLOAD_LIST` (新增, Ref: CompressorPage)**
  - **设计参考**: 参考 `CompressorPage` 中右侧文件列表的实现，追求优雅、清晰的状态展示。
  - **Header**:
    - 标题: "上传队列" / "页面状态"。
    - 统计信息: 使用 `NatureTag` 展示 "上传中"、"成功"、"失败" 的数量。
  - **Content (Scrollable)**:
    - 列表项 (`PageStatusItem`)。
    - 每项包含:
      - 文件名 (Truncated)。
      - 状态标签 (Pending / Uploading / Completed / Failed)。
      - (可选) 失败重试按钮 (仅针对失败项)。
  - **Footer**:
    - 全局操作按钮: "重试所有失败"、"清除已完成"。

## 3. 状态管理 (State)

### 3.1 组件 Props

```typescript
type ComicModifierProps = {
  comicId: string; // 目标漫画 ID
  onClose?: () => void;
  onUpdate?: (payload: any) => Promise<void> | void;
};
```

### 3.2 内部 State

```typescript
// 视图模式
type RightPanelMode =
  | "NONE"
  | "DESC"
  | "ASSIGN_TRANS"
  | "ASSIGN_PROOF"
  | "ASSIGN_TYPE"
  | "ASSIGN_ART"
  | "ASSIGN_REVIEW"
  | "UPLOAD_LIST"; // 新增模式

// 任务状态定义
type UploadTaskStatus = "pending" | "uploading" | "completed" | "failed";

interface UploadTask {
  id: string;
  fileName: string;
  filePath: string;
  status: UploadTaskStatus;
  errorMessage?: string;
  // progress?: number; // 暂不实现详细进度百分比，仅状态
}

// 状态 Hooks
const [panelMode, setPanelMode] = useState<RightPanelMode>("NONE");
const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);
// ...以及 title, author, assignments 等表单状态
```

## 4. 关键逻辑与 Mock

由于后端 API 尚未准备好，所有 IPC 调用需进行 Mock。

### 4.1 初始化

- `useEffect` 监听 `comicId`。
- 模拟异步获取漫画详情，延迟 500-800ms 后设置 mock 的 `title`, `author`, `assignments` 等数据。

### 4.2 图片上传流程 (Mock)

1.  用户点击 "选择上传"。
2.  **Mock File Select**: 不调用真实系统弹窗，直接生成一组 (3-5 个) 虚拟文件路径数组。
3.  **Task Creation**: 将路径转换为 `UploadTask` 对象，初始状态为 `pending`，加入 `uploadTasks`。
4.  **Auto Switch**: `setPanelMode("UPLOAD_LIST")`。
5.  **Mock Upload**:
    - 遍历新加的任务。
    - 使用 `setTimeout` 模拟网络耗时。
    - 随机决定结果: 80% 变为 `completed`，20% 变为 `failed`。
    - 实时更新状态，驱动 UI 变化。

## 5. 组件复用策略

- **`UserSelector`**: 直接复用。
- **`NatureButton`, `NatureTag`, `Icon`**: 直接复用。
- **`PageStatusList`**:
  - 虽参考 `CompressorPage`，但建议在 `ComicModifier` 内部实现一个简化版的列表渲染逻辑，或者提取为一个小型私有组件 (`Components/PageStatusItem`)，因为这里的样式需求可能比 Compressor 更紧凑 (右侧面板较窄)。

## 6. 开发顺序建议

1.  **文件创建**: 建立 `src/components/ComicModifier.tsx` 和 `.css`。
2.  **基本移植**: 将 `ComicCreator` 代码复制过来，修剪不需要的创建逻辑。
3.  **上传入口**: 在左侧底部实现 Flex 布局的上传工具栏。
4.  **右侧列表**: 实现 `UPLOAD_LIST` 视图的静态样式。
5.  **Mock 逻辑**: 编写 Mock 的上传函数和状态更新逻辑。
6.  **联调**: 串联交互，确保从点击上传到列表滚动的体验流畅。
