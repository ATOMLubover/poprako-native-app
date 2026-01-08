# Comic Card 组件设计文档

本文档描述 `BriefComicCard` 组件的设计方案，以及其与 `DetailComicCard` 的交互逻辑。

## 1. 概述

`BriefComicCard` 是漫画列表项的默认展示形态，旨在提供最核心的信息概览。它具有紧凑的布局，并在用户长时间悬浮时能够无缝切换为展示更多信息的 `DetailComicCard`。

## 2. 数据模型调整

目前的 `ComicBrief` 定义如下：

```typescript
export type ComicBrief = {
  // ... existing fields
  reviewedAt: Date;
  publishedAt: Date;
  // ... missing updatedAt
};
```

**需求变更：**
1.  **添加 `updatedAt`**: 布局需求中明确要求显示 `updatedAt`，但当前 `ComicBrief` 中缺失该字段。需在后端及前端模型中添加此字段。
2.  **Date 字段的可空性**: `reviewedAt` 和 `publishedAt` 在当前类型定义中为非空 `Date`。
    - 若这两个字段总是存在有效日期，则无法区分“未开始”与“已完成”。
    - **建议**：将这两个字段改为可选 (`Date | undefined` 或 `Date | null`)，或者约定特殊值（如 1970-01-01）代表未完成。
    - *本设计假定*：字段为可选或有判空逻辑。

## 3. BriefComicCard 组件设计

### 3.1 布局结构

组件采用两行布局，高度紧凑。

**第一行 (Row 1)**
- **布局**: Flex Row, `align-items: center`
- **左侧 (Title Area)**:
  - **内容格式**: `[${collectionId}-${index}]【${author}】${title}`
  - **样式**: 右边距 `8px`。
  - **约束**: `max-width: 50%`。超出部分显示省略号 (`text-overflow: ellipsis`, `white-space: nowrap`, `overflow: hidden`)。
- **右侧紧随 (Progress Tags)**:
  - **布局**: Flex Row, `gap: 4px`。
  - **组件**: 使用类似 `NatureTag` 的小型化变体或复用 `NatureTag` 并覆写背景色。
  - **包含项**: 翻译、校对、嵌字、监修、发布。

**第二行 (Row 2)**
- **布局**: Flex Row, `justify-content: space-between`, `align-items: center`
- **左侧 (Tags)**:
  - **逻辑**: 取 `tags` 的前 3 个。
  - **组件**: `NatureTag`。
- **右侧 (Date)**:
  - **内容**: `updatedAt`。
  - **样式**: `font-size: 0.8em`, 颜色淡化。

### 3.2 视觉样式 (Progress Tag)

为了区分进度状态，Progress Tag 将使用特定的背景色主题。建议在 `NatureTag.css` 或组件内部扩展以下逻辑：

- **状态映射**:
  - **未开始 (Pending)**: 淡灰色 -> 对应 `theme-sand` (需确认具体效果，或新增 `theme-ash`)。
  - **进行中 (In Progress)**: 淡橙色 -> 对应 `theme-amber`。
  - **已完成 (Completed)**: 淡绿色 -> 对应 `theme-mist`。

- **逻辑判断**:
  1.  **Translation/Proofreading/Typesetting**:
      - `CompletedAt` 存在 -> **已完成**
      - `StartedAt` 存在 -> **进行中**
      - 其他 -> **未开始**
  2.  **Review/Publish**:
      - `At` 存在 -> **已完成**
      - 其他 -> **未开始**

### 3.3 交互逻辑 (Hover Expand)

- **状态管理**:
  - 父容器或组件内部需要维护 `isExpanded` 状态。
  - **Timer**: 使用 `useRef` 存储计时器 ID。
- **事件**:
  - `onMouseEnter`: 启动 2秒 计时器 (`setTimeout`)。回调触发 `setIsExpanded(true)`。
  - `onMouseLeave`: 清除计时器 (`clearTimeout`)。如果已展开，是否自动收起需确认（通常移出后应恢复，或者保持展开直到点击其他区域）。*建议：移出后延时收起或立即收起，保持列表整洁。*

### 3.4 动画 (Transitions)

- **Brief -> Detail**:
  - 这里的“丝滑变化”建议使用高度过渡 (Height Transition) 和 交叉淡入淡出 (Cross-fade)。
  - `Brief` 内容淡出 (Opacity 1 -> 0)，同时容器高度增加，`Detail` 内容淡入。
  - `DetailComicCard` 渲染在同一位置。

## 4. 预留接口

```typescript
type Props = {
  data: ComicBrief;
  style?: React.CSSProperties;
  className?: string;
  // 用于通知外部状态变化，或者组件自管理
  onRequestExpand?: () => void;
};
```

## 5. 待确认事项

- [ ] 后端 `ComicBrief` 是否已包含 `updatedAt`？若未包含需添加。
- [ ] `reviewedAt` / `publishedAt` 的空值表示方式。
