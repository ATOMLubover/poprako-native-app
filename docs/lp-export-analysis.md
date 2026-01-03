# LabelPlus 导出格式实现分析（面向 PortProject）

本文基于：
- 官方说明：[docs/labelplus-export-format.md](labelplus-export-format.md)
- 示例文件：/samples/LB-翻译转职考核_12月.txt
- 数据结构：`PortProject / PortPage / PortUnit`（Rust）

目标：明确 **LabelPlus txt 的可实现语法**，并给出 **从 `PortProject` 导出为该 txt 的映射规则**。

---

## 1. 文件整体结构（可实现语法）

LabelPlus 导出文件可视为：

- **首部区块（Header）**：版本号 + 分组列表 + 用户备注分组
- **内容区块（Body）**：按“页（图片）”分段，每页内是多个“单元（气泡/文本块）”

### 1.1 Header 的精确定界

约束（来自官方说明）：
- 在文件首部出现之前，各项内容禁止出现 `-`（因为 `-` 是首部分隔符）。

Header 的推荐结构：

1) 第一行：版本号
- 形式：`<major>[,<minor>[,<patch>...]]`
- 示例里是 `1,0`（可理解为 major=1, minor=0）

2) 一行 `-`：进入“分组信息列表”

3) 若干行：分组名称列表（每行一个分组名）
- 示例：
  - `框内`
  - `框外`

4) 一行 `-`：进入“用户备注分组名”

5) 一行：用户备注分组名（官方称“总为最后一组”）
- 示例：`使用 LabelPlusFX 导出`

> 结论：Header 本质上是三段式（版本 / 分组名列表 / 用户备注组名），用两次 `-` 做分隔。

### 1.2 Body 的页分段

每个页面（图片）用一行标记开始：

- `>>>>>>>>[<image_filename>]<<<<<<<<`
- 左右的 `>` / `<` 数量只要超过 6 个即可；`[...]` 不可省略。

示例：`>>>>>>>>[01.jpg]<<<<<<<<`

### 1.3 单元（Unit）块

每个单元由 2 行“分隔行”夹住中间的文本内容：

- 开始分隔行：`----------------[n]----------------[x,y,g]`
- 若干行文本内容（允许空行；文件整体也允许多余空行，会被忽略）
- 下一个单元的开始分隔行（等价于上一个单元的结束标记）

其中：
- `n`：单元编号（示例中每页从 1 递增，且会在新页重置）
- `x,y`：坐标（示例是 0~1 的小数；推测为相对坐标）
- `g`：分组编号（示例使用 1 / 2，对应 Header 中的第 1/2 个分组）

> 结论：Body 是一个“状态机”文本格式：读到页头进入该页；读到 unit 分隔行开始累计文本；遇到下一条 unit 分隔行或下一页页头则提交上一个 unit。

---

## 2. 从示例文件推导的关键细节

1) **分组编号是 1-based**
- Header 分组列表第 1 行 → `g=1`
- Header 分组列表第 2 行 → `g=2`

2) **unit 编号按页重置**
- 示例中每个 `>>>>>>>>[xx.jpg]<<<<<<<<` 下的 unit `[n]` 都从 1 开始。

3) **文本内容原样保留换行**
- 示例大量使用换行排版、以及以 `*` 开头的译注；这些都只是正文文本的一部分。

4) **文件允许多余空行**
- 官方说明明确“自动忽略多余的空行”。

---

## 3. PortProject → LabelPlus 的映射方案

`PortProject`：
- `author`, `title`：导出文件名已在现有逻辑中使用（见 src-tauri/src/project/port.rs）
- `pages: Vec<PortPage>`：对应 Body 的多个页段

`PortPage`：
- `image_filename`：对应 `>>>>>>>>[image_filename]<<<<<<<<`
- `units: Vec<PortUnit>`：对应该页内 unit 列表

`PortUnit`：
- `x`, `y`：直接写入分隔行的 `x,y`
- `index_in_page`：用于排序以及作为 `n`（推荐）
- `is_inbox`：用于选择 `g`（分组编号）
- `translated_text / prooved_text / is_prooved / comment`：映射到正文文本（需要取舍）

### 3.1 Header 生成（建议固定两组）

为了与现有 `PortUnit.is_inbox: bool` 对齐，最简洁且可互通的 Header 是：

- 分组列表：
  1. `框内`
  2. `框外`
- 用户备注分组名：`用户备注`（也可用其它字符串；示例里是“使用 LabelPlusFX 导出”）

对应 Header：

- `1,0`
- `-`
- `框内`
- `框外`
- `-`
- `用户备注`

> 这样 `g` 的含义就稳定：`is_inbox=true → g=1`，`is_inbox=false → g=2`。

### 3.2 每页输出规则

对每个 `PortPage`：

1) 输出页头：`>>>>>>>>[${image_filename}]<<<<<<<<`
2) 输出该页 unit：
- 先按 `index_in_page` 升序排序
- 对每个 unit：
  - `n` 推荐直接使用 `index_in_page`（如果你的数据保证从 1 开始且连续）；否则使用“遍历序号 i+1”更安全
  - `x,y` 输出为十进制小数（建议保留 4 位或原样 `f64` -> string；核心是不要用科学计数法）
  - `g`：`is_inbox ? 1 : 2`
  - 文本：见下一节

### 3.3 单元正文文本选择（关键取舍点）

LabelPlus 的 unit 本体只有“一个文本正文”，而 `PortUnit` 有多份文本：
- `translated_text`（翻译）
- `prooved_text`（校对）
- `comment`（备注）
因此导出需要明确主文本与注释的写法，建议采用以下规则：

- 主文本选择：优先使用 `prooved_text`，若为空则使用 `translated_text`（即 `prooved_text || translated_text`）。

- `comment` 的最终导出格式（当 `comment` 非空时）为：

```
正式文本...\n\n#[翻校注释]：<comment>
```

其中 `正式文本` 是上面的主文本；若 `comment` 为空则不输出 `#[翻校注释]` 部分。

---

## 4. 落地到代码的实现位置（仓库现状）

当前导出流程：
- IPC 侧已构造 `PortProject` 并调用导出（src-tauri/src/ipc/project/port.rs）
- 导出会写两个文件：`.poprako.json` + `.labelplus.txt`（src-tauri/src/project/port.rs）

但编解码层仍未实现：
- `encode_project(..., Format::LabelPlus)` / `decode_export_project(..., Format::LabelPlus)` 目前是 `unimplemented!`（src-tauri/src/project/codec.rs）

> 所以“将 PortProject 导出为 LabelPlus 格式”的真正实现点，就是在 `src-tauri/src/project/codec.rs` 里补齐 LabelPlus 的编码逻辑（至少编码；解码可后续）。

---

## 5. 导出时容易踩坑的点（精简版）

- `g` 必须和 Header 的分组顺序一致，且示例体现为 1-based。
- `x,y` 建议避免科学计数法输出（LabelPlus 解析器未必兼容）。
- unit 的 `n` 在示例中每页从 1 递增；如果你用 `index_in_page`，需要确认你的数据也是按页从 1 开始。
- 文本可包含换行；写入时不要额外转义（按原样写入多行）。
- Header 出现前不要输出 `-`，否则会破坏首部解析。
