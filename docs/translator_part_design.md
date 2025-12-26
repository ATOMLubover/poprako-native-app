# Translator 模块设计方案

## 1. 核心设计理念

采用 **Container / Presentational (Smart / Dumb)** 组件模式。

- **Translator (View)**: 纯展示组件。负责渲染界面、处理交互。它不关心数据来源（本地/远程），也不直接处理文件协议转换。
- **Parent (Container)**: 负责具体的业务逻辑。例如调用 Tauri API 读取本地文件，或者调用 Fetch API 获取远程数据，组装成标准 Model 后传给 Translator。

## 2. 组件接口定义 (Props)

```typescript
import { Project, Page, Unit } from "@/models/translator";

export type TranslatorMode = 'translate' | 'proofread' | 'read';

export interface TranslatorProps {
  // --- 数据源 ---
  project: Project;           // 项目元数据（用于显示标题、总进度）
  currentPage: Page;          // 当前页面的完整数据
  isLoading: boolean;         // 页面加载状态
  
  // --- 环境与状态 ---
  mode: TranslatorMode;       // 当前工作模式
  isOffline: boolean;         // 是否处于离线模式
  
  // --- 交互回调 ---
  /** 请求切换页面 */
  onRequestPage: (pageIndex: number) => void;
  
  /** 刷新数据（应对网络不稳定） */
  onRefresh?: () => void;

  /** 
   * 翻校单元变更事件（增、改）
   * 在这里统一处理，父组件根据 ID 是否存在判断是新建还是更新 
   */
  onUnitSave: (unit: Partial<Unit> & { id: string }) => void;
  
  /** 翻校单元删除事件 */
  onUnitRemove: (unitId: string) => void;
  
  /** 
   * 选中翻校单元事件 
   * 可用于父组件联动其他视图（如侧边栏定位）
   */
  onUnitSelect?: (unitId: string | null) => void;
}
```

## 3. 布局结构

整体布局分为上下两行：

### 3.1. 顶部栏 (Header)
- **左侧**: 项目信息，格式为 `[author] title`。
- **中部**: 紧邻标题的 **Toolbox**（紧凑按钮组）：
    - 模式图标（翻译=铅笔、校对=放大镜、阅览=眼睛，线性风格）。
    - 翻页：上一页、下一页。
    - 工具：四分音符图标（预留特殊字符表入口）。
- **中间**: **ProgressBar** 组件（待实现），显示翻校进度（如：已翻译/总数）。
- **右侧**: 页码指示器。

### 3.2. 主体区域 (Body)
分为两列布局：

1.  **中间画布区 (Stage)**
    - **ImageLayer**: 显示漫画原图。支持缩放（Zoom）、平移（Pan）。
        - *注意*: 本地图片 URL 可能是 `C:\...` 格式，需在父组件或 ImageLayer 内部处理为 `asset://` 或 `convertFileSrc`。
    - **MarkerOverlay**: 在图片之上绘制 **Marker (标记)**。
        - **Marker 定义**: 对应一个 `Unit`（翻校单元）。
        - **视觉样式**: 一个圆圈（内含 `indexInPage`）+ 下方一个定位点。定位点对应 `(x, y)`。
        - **缩放逻辑**: Marker 的屏幕绝对大小应保持不变，不随图片缩放而变大变小（防止放大后遮挡过多内容）。
        - **颜色逻辑**:
            - **Inbox**: 淡粉色背景。
            - **Outbox**: 淡黄色背景。
            - **Border**:
                - 翻译模式: 已翻译 (`translatedText` 有值) -> 绿色细边框。
                - 校对模式: 已校对 (`isProoved` 为 true) -> 绿色细边框。
        - **阅读模式**: 隐藏所有 Marker。

2.  **右侧侧边栏 (Sidebar)**
    - **UnitList**: 上半部分。可收起/隐藏；阅读模式下隐藏。
    - **Editor**: 下半部分。文本编辑器（未来可支持拖出窗口）。



## 5. 关键业务逻辑细节

### 5.1. 图片加载与路径处理
- 本地路径 (`C:\path\to\img.jpg`) 在 Webview 中无法直接加载，需要通过 Tauri 的 `convertFileSrc` 转换。
- 需处理加载失败的情况（显示占位图或重试按钮）。

### 5.2. 坐标与 Marker 渲染
- **数据存储**: `x, y` 为相对坐标 (0~1)。
- **定位计算**: `left = x * imageWidth`, `top = y * imageHeight`。
- **抗缩放 (Anti-scaling)**:
    - 当画布缩放 `scale = 2.0` 时，Marker 元素应用 `transform: scale(0.5)` (即 `1/scale`)，以保持视觉大小一致。
    - 或者使用 DOM + CSS transform 方案，在缩放事件中动态调整 Marker 的 scale。

### 5.3. 模式差异 (Mode Behavior)

| 特性            | 翻译模式 (Translate)      | 校对模式 (Proofread)      | 阅读模式 (Read) |
| :-------------- | :------------------------ | :------------------------ | :-------------- |
| **Marker 显示** | 显示 (状态色: 已翻译绿框) | 显示 (状态色: 已校对绿框) | **隐藏**        |
| **Sidebar**     | 显示                      | 显示                      | **隐藏**        |
| **Editor**      | 编辑 `translatedText`     | 编辑 `proovedText`        | 隐藏   |

### 5.4. 交互细节
- **点击 Marker**:
    1. 高亮该 Marker。
    2. 右侧 UnitList 滚动到对应条目。
    3. Editor 聚焦该 Unit。
- **点击 UnitList 条目**:
    1. 画布自动平移 (Pan) 使对应的 Marker 居中。
    2. Editor 聚焦。
