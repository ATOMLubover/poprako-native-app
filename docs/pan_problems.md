# Image Pan / Zoom — 问题汇总与实现位置

说明：本文档整理 `src/components/translator` 目录中所有与图片平移（pan）和缩放（zoom）相关的实现、问题观察与建议，便于后续重构为统一 camera 模型。

## 相关文件总览

- `src/components/translator/ImageLayer.tsx`
  - 作用：图片渲染、响应鼠标拖拽与滚轮缩放，计算渲染信息并通过 `onRenderUpdate` 上报给父组件（Stage）。
  - 关键状态：`naturalSize`（图片原始像素）、`fitScale`（适配容器的基础缩放）、`userScale`（camera scale）、`userOffset`（camera 偏移）、（历史上存在）`transformOrigin`。
  - 当前实现要点：在多次修改中混用了两种策略：CSS `transform: scale(...)` + `transformOrigin` 与直接修改 `width/height` 的方式；缩放时尝试通过计算并补偿偏移来保持鼠标下像素不动；也曾加入过边界(clamp)逻辑来限制 camera 可移动区域。
  - 已出现的问题（历史与当前）：
    - transform-origin 与 offset 补偿的耦合导致缩放时出现“先上后左”或“跳变”的视觉现象（尤其连续滚轮时）。
    - clamp（边界）与缩放耦合：缩放时 camera 被强制纠正，导致鼠标所指位置突然被移出图片背景的情况。
    - 在多次尝试中出现过 marker 漂移（原因：marker 的位置计算未正确独立于缩放实现，或 imageRenderInfo 上报不准确）。
    - 不同实现间变量命名/语义不清（`fitScale`、`userScale`、`transformOrigin`、`userOffset` 混用）增加了出错几率。

- `src/components/translator/Stage.tsx`
  - 作用：Stage 作为画布容器，包含 `ImageLayer` 与 `MarkerOverlay`，收集 `imageRenderInfo`（width/height/left/top/scale）并传给 `MarkerOverlay`。
  - 关键点：`handleImageRenderUpdate` 接收 `ImageLayer` 上报数据并更新内部 `imageRenderInfo` —— 这是 marker 定位的唯一数据源。
  - 注意：任何 `ImageLayer` 的变更必须保证 `onRenderUpdate` 上报的数据与实际 DOM 渲染位置/尺寸严格一致，否则 `MarkerOverlay` 会计算错误位置。

- `src/components/translator/MarkerOverlay.tsx` / `Marker.tsx`
  - 作用：`MarkerOverlay` 渲染 marker 容器（覆盖在 image layer 之上）；`Marker` 根据 `imageRenderInfo` 将 unit 的相对坐标（0..1）映射到屏幕像素并显示。
  - 关键映射逻辑（应当保持不变）：
    - markerX_pixel = imageRenderInfo.left + unit.x * imageRenderInfo.width
    - markerY_pixel = imageRenderInfo.top + unit.y * imageRenderInfo.height
  - 常见故障来源：`imageRenderInfo` 的 left/top/width/height/scale 必须和 DOM 上图片的真实位置尺寸严格对应；若 `ImageLayer` 使用了 `transform`（scale）而 `imageRenderInfo` 报告基于不同度量，marker 会漂移。

- `src/components/translator/Translator.tsx`
  - 作用：包含键盘快捷（Home/Tab 等），Home 被期望重置 camera（回到默认缩放并居中）——目前实现由 Stage/ImageLayer 提供 reset 接口。
  - 注意：Home 触发重置必须和 `ImageLayer` 的状态一致，且 `onRenderUpdate` 在重置后应尽快上报新的 renderInfo。

## 问题总结（优先级高）

1. 实现混用（CSS scale + width/height）导致数据模型与渲染不同步。Marker 计算使用像素映射，若 ImageLayer 使用 CSS transform 而上报基于未转换的数值，必然漂移。
2. transform-origin 的引入与不一致补偿逻辑会在缩放时引入额外的偏移，需要严谨数学补偿或避免使用 transform-origin。
3. clamp 或边界修正逻辑（在缩放时触发）会强制移动 camera，导致鼠标指向的像素点被“驱逐”到背景上。应当把边界限制与缩放解耦或在缩放补偿计算后再应用。
4. `fitScale`、`userScale`、`userOffset` 语义不够明确，容易混淆谁负责基础适配、谁负责用户交互。

## 建议的统一方案（高层）

目标：建立一个单一的、可验证的 camera 模型，图片渲染与 marker 映射基于同一来源数据，消除跳变/漂移。

- 数据模型：
  - `naturalSize`：图片原始像素（不变）
  - `fitScale`：使图片初始适配容器（固定，直到页面/容器尺寸变化或图片替换）
  - `cameraScale`（或 `userScale`）：用户缩放倍数（相对于 `fitScale`）
  - `cameraOffset`（或 `userOffset`）：平移偏移（以像素计）

- 渲染规则（单一实现）：
  - 计算 `displayWidth = naturalSize.width * fitScale * cameraScale`（同理 height）
  - 计算 `displayLeft = containerCenterX - displayWidth/2 + cameraOffset.x`
  - Image DOM 使用 `width`/`height`（避免 transform-origin 引入的复杂偏移），或若使用 CSS `scale`，则必须在 `imageRenderInfo` 中上报基于 transform 后的 left/top/width/height（精确一致）

- 缩放交互：
  - 在 wheel 事件中：
    1. 读取鼠标在容器中的位置（client 相对 container）
    2. 将鼠标映射为图片上的相对位置（按当前 displayWidth/Left）——得出 `relativeX/relativeY`
    3. 计算新 displayWidth/new displayLeft（基于 new scale）
    4. 计算目标鼠标在新 display 坐标，然后调整 cameraOffset 使鼠标在屏幕上的位置不变（offsetDelta = mouseContainerPos - targetMousePos）
  - 只修改 cameraScale/cameraOffset，不修改图片原始数据

- Marker 映射：
  - 始终使用 `imageRenderInfo`（由 ImageLayer 按照上面渲染规则上报）进行映射

## 推荐的短期修复步骤（可直接实施）

1. 确认 `ImageLayer` 采用“width/height + offset” 的渲染策略，不使用 `transform-origin`，或如果使用 `transform`，则在 `onRenderUpdate` 中上报 transform 后的 DOM 结果（getBoundingClientRect）。
2. 在 `ImageLayer` 的 wheel handler 中使用上面“相对位置映射并补偿偏移”的流程（现有代码块已部分实现，但存在 transform-origin 残留）。
3. 暂时移除 clamp/边界限制，或把 clamp 放到一个可选 flag 下，仅在用户明确需要时启用。先保证缩放/marker 不跳变，再加回合适的边界。
4. 在 `Stage` 中校验 `imageRenderInfo` 与 `ImageLayer` DOM（可用 `imageRef.current.getBoundingClientRect()`）是否匹配，若不匹配，优先上报 DOM 的真实值。
5. 添加集成回归测试步骤（手动）：
   - 在图片中央和远离边缘处各放一个 marker，滚轮缩放并确认 marker 位置不动；
   - 拖动画布并缩放，确认 marker 对齐；
   - 按 `Home` 恢复视图并确认 marker 与图片一同居中。

## 结论

当前出现的大多数问题源自实现细节耦合（transform-origin、clamp、不同缩放度量混用）。最稳妥的路径是：定义清晰的 camera 数据模型，保证 `ImageLayer` 渲染输出与 `onRenderUpdate` 上报一致，然后让 `Marker` 只依赖这些上报数据进行映射。

如果你同意，我可以：
- 将 `ImageLayer` 重构为严格的 camera-only 实现（按照上面的渲染规则），并在 `onRenderUpdate` 中直接上报 `getBoundingClientRect()` 的值作为真实来源；
- 或者把现有代码回滚到最近的稳定版本并从那处逐步替换为 camera-only。

请回复你偏好的路线（彻底重构为 camera-only / 回滚到最近稳定再改 / 其它），我会立即开始并把具体修改提交到仓库。