# Project IPC 模块重构方案

## 背景

当前 `src-tauri/src/ipc/project.rs` 文件过长（1106 行），包含了 project、page、unit 相关的所有 IPC 函数。参考 repository 层已经完成的重构（将 project/page/unit 拆分到子模块），我们需要对 IPC 层进行类似的重构。

## 当前状态

### Repository 层结构（已重构完成）

```
src-tauri/src/repository/
├── project.rs          # 核心 project 相关函数
│   ├── pub mod page;
│   ├── pub mod unit;
│   ├── pick_local_project()
│   ├── pick_cached_project()
│   ├── get_cached_projects()
│   ├── get_local_projects()
│   ├── create_cached_project()
│   ├── create_local_project()
│   └── update_local_project()
├── project/
│   ├── page.rs         # page 相关的 repository 函数
│   │   ├── get_project_pages()
│   │   ├── save_project_pages()      # upsert 操作
│   │   └── delete_project_pages()
│   └── unit.rs         # unit 相关的 repository 函数
│       ├── get_page_units()
│       ├── save_page_units()         # upsert 操作
│       └── delete_page_units()
```

**Repository 层的设计亮点：**
- 使用 `save_*` 函数统一处理 upsert（update or insert）逻辑
- 使用事务确保数据一致性
- 使用 `LazyLock<Mutex<()>>` 锁保证并发安全
- 自动更新 project 的统计字段（unit_count、translated_unit_count 等）

### IPC 层当前结构（待重构）

```
src-tauri/src/ipc/
├── project.rs          # 1106 行，包含所有 project/page/unit 相关的 IPC 函数
│   ├── pub mod page;   # 已声明但未使用
│   ├── pub mod unit;   # 已声明但未使用
│   │
│   # Project 相关 (应保留在 project.rs)
│   ├── get_projects()                    # 获取所有项目（本地+缓存）
│   ├── create_local_project()            # 创建本地项目
│   ├── update_project()                  # 更新项目
│   ├── select_project_dir()              # 选择项目目录对话框
│   ├── select_poprako_archived_path()    # 选择归档路径对话框
│   ├── export_poprako_project()          # 导出 Poprako 格式
│   ├── export_labelplus_project()        # 导出 LabelPlus 格式（未实现）
│   └── import_poprako_project()          # 导入 Poprako 项目
│   │
│   # Page 相关 (应移至 project/page.rs)
│   ├── get_project_pages()
│   ├── create_project_pages()
│   ├── update_project_pages()
│   └── delete_project_pages()
│   │
│   # Unit 相关 (应移至 project/unit.rs)
│   ├── get_page_units()
│   ├── create_page_units()
│   ├── update_page_units()
│   └── delete_page_units()
├── project/
│   ├── page.rs         # 存在但为空
│   └── unit.rs         # 存在但为空
```

### Project 业务逻辑层

```
src-tauri/src/project/
├── codec.rs            # 编解码逻辑
│   ├── encode_project()        # 编码项目到指定格式（PopRaKo/LabelPlus）
│   └── decode_export_project() # 从指定格式解码项目
└── port.rs             # 导入导出逻辑
    ├── export_project()        # 导出项目（Dir/Zip 模式）
    ├── export_project_to_dir()
    └── export_project_to_zip()
```

## 重构目标

1. **减少单文件长度**：将 1106 行的 `project.rs` 拆分为更易维护的多个文件
2. **职责清晰**：按照 domain 划分（project/page/unit）
3. **保持一致性**：与 repository 层的结构保持一致
4. **向后兼容**：确保前端调用的 IPC 函数名称和签名不变

## 重构方案

### 文件结构

```
src-tauri/src/ipc/
├── project.rs          # 保留核心 project 相关的 IPC 函数
│   ├── pub mod page;
│   ├── pub mod unit;
│   │
│   # Project 核心功能（约 600-700 行）
│   ├── get_projects()
│   ├── create_local_project()
│   ├── update_project()
│   ├── select_project_dir()
│   ├── select_poprako_archived_path()
│   ├── export_poprako_project()
│   ├── export_labelplus_project()
│   └── import_poprako_project()
├── project/
│   ├── page.rs         # Page 相关的 IPC 函数（约 200 行）
│   │   ├── get_project_pages()
│   │   ├── create_project_pages()
│   │   ├── update_project_pages()
│   │   └── delete_project_pages()
│   └── unit.rs         # Unit 相关的 IPC 函数（约 200 行）
│       ├── get_page_units()
│       ├── create_page_units()
│       ├── update_page_units()
│       └── delete_page_units()
```

### IPC 函数分类明细

#### 保留在 `project.rs` 中的函数（8 个）

```rust
#[tauri::command]
pub async fn get_projects() -> Result<Vec<model_project::Project>, String>

#[tauri::command]
pub async fn create_local_project(project: model_project::Project) -> Result<(), String>

#[tauri::command]
pub async fn update_project(project: model_project::Project) -> Result<(), String>

#[tauri::command]
pub async fn select_project_dir() -> Result<Vec<String>, String>

#[tauri::command]
pub async fn select_poprako_archived_path() -> Result<String, String>

#[tauri::command]
pub async fn export_poprako_project(project_id: String) -> Result<String, String>

#[tauri::command]
pub async fn export_labelplus_project(project_id: String) -> Result<String, String>

#[tauri::command]
pub async fn import_poprako_project(project_path: String) -> Result<(), String>
```

#### 移至 `project/page.rs` 的函数（4 个）

```rust
#[tauri::command]
pub async fn get_project_pages(project_id: String) -> Result<Vec<model_project::LocalPage>, String>

#[tauri::command]
pub async fn create_project_pages(project_id: String, pages: Vec<model_project::LocalPage>) -> Result<(), String>

#[tauri::command]
pub async fn update_project_pages(project_id: String, pages: Vec<model_project::LocalPage>) -> Result<(), String>

#[tauri::command]
pub async fn delete_project_pages(page_ids: Vec<String>) -> Result<(), String>
```

#### 移至 `project/unit.rs` 的函数（4 个）

```rust
#[tauri::command]
pub async fn get_page_units(page_id: String) -> Result<Vec<model_project::LocalUnit>, String>

#[tauri::command]
pub async fn create_page_units(page_id: String, units: Vec<model_project::LocalUnit>) -> Result<(), String>

#[tauri::command]
pub async fn update_page_units(page_id: String, units: Vec<model_project::LocalUnit>) -> Result<(), String>

#[tauri::command]
pub async fn delete_page_units(unit_ids: Vec<String>) -> Result<(), String>
```

### Repository 层与 IPC 层对应关系

#### Page 相关

| IPC 层                   | Repository 层              | 说明                                |
| ------------------------ | -------------------------- | ----------------------------------- |
| `get_project_pages()`    | `repo_page::get_project_pages()` | 直接调用                            |
| `create_project_pages()` | `repo_page::save_project_pages()` | 使用 save 实现 upsert               |
| `update_project_pages()` | `repo_page::save_project_pages()` | 使用 save 实现 upsert               |
| `delete_project_pages()` | `repo_page::delete_project_pages()` | 直接调用                            |

**注意**：Repository 层使用 `save_project_pages()` 统一处理创建和更新，IPC 层保持 `create_` 和 `update_` 分开以保持 API 向后兼容。

#### Unit 相关

| IPC 层                | Repository 层            | 说明                                |
| --------------------- | ------------------------ | ----------------------------------- |
| `get_page_units()`    | `repo_unit::get_page_units()` | 直接调用                            |
| `create_page_units()` | `repo_unit::save_page_units()` | 使用 save 实现 upsert               |
| `update_page_units()` | `repo_unit::save_page_units()` | 使用 save 实现 upsert               |
| `delete_page_units()` | `repo_unit::delete_page_units()` | 直接调用                            |

### 需要修改的其他文件

#### `src-tauri/src/lib.rs`

当前可能在 `invoke_handler!` 中注册了所有 IPC 函数，需要更新为：

```rust
use crate::ipc::project::{page, unit};

// ...

.invoke_handler(tauri::generate_handler![
    // ... 其他函数 ...
    
    // Project 相关
    ipc::project::get_projects,
    ipc::project::create_local_project,
    ipc::project::update_project,
    ipc::project::select_project_dir,
    ipc::project::select_poprako_archived_path,
    ipc::project::export_poprako_project,
    ipc::project::export_labelplus_project,
    ipc::project::import_poprako_project,
    
    // Page 相关
    page::get_project_pages,
    page::create_project_pages,
    page::update_project_pages,
    page::delete_project_pages,
    
    // Unit 相关
    unit::get_page_units,
    unit::create_page_units,
    unit::update_page_units,
    unit::delete_page_units,
])
```

## 重构的关键注意事项

### 1. Repository 层调用统一化

IPC 层的 `create_*` 和 `update_*` 都应该调用 repository 层的 `save_*` 函数，因为后者已经实现了 upsert 逻辑。

**示例（page.rs）：**

```rust
// IPC 层
pub async fn create_project_pages(
    project_id: String,
    pages: Vec<model_project::LocalPage>,
) -> Result<(), String> {
    // ... 日志和转换 ...
    
    let mut conn = repo_project::acquire_connection().await?;
    
    repo_page::save_project_pages(&mut conn, po_pages.as_slice())
        .await
        .trace_error("创建项目页时失败")
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

pub async fn update_project_pages(
    project_id: String,
    pages: Vec<model_project::LocalPage>,
) -> Result<(), String> {
    // ... 日志和转换 ...
    
    let mut conn = repo_project::acquire_connection().await?;
    
    // 同样调用 save，由 repository 层处理 upsert
    repo_page::save_project_pages(&mut conn, po_pages.as_slice())
        .await
        .trace_error("更新项目页时失败")
        .map_err(|e| e.to_string())?;
    
    Ok(())
}
```

### 2. 模块导入

**在 `project.rs` 中：**

```rust
use crate::{
    ipc::get_ipc_request_id,
    model::po::project as po_project,
    model::project as model_project,
    repository::project::{self as repo_project},
    result_trace::ResultTrace,
};

// 子模块声明
pub mod page;
pub mod unit;
```

**在 `project/page.rs` 中：**

```rust
use crate::{
    ipc::get_ipc_request_id,
    model::po::project as po_project,
    model::project as model_project,
    repository::project::{self as repo_project, page as repo_page},
    result_trace::ResultTrace,
};
```

**在 `project/unit.rs` 中：**

```rust
use crate::{
    ipc::get_ipc_request_id,
    model::po::project as po_project,
    model::project as model_project,
    repository::project::{self as repo_project, unit as repo_unit},
    result_trace::ResultTrace,
};
```

### 3. 日志规范

所有 IPC 函数都需要：
1. 使用 `#[tracing::instrument]` 宏
2. 在函数开始时获取 `ipc_id` 并记录 start 日志
3. 在函数结束时记录 success 日志
4. 使用 `.trace_error()` 或其他 trace 方法进行错误追踪

**示例：**

```rust
#[tauri::command]
#[tracing::instrument]
pub async fn get_project_pages(
    project_id: String,
) -> Result<Vec<model_project::LocalPage>, String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.page.get_project_pages.start");

    let mut conn = repo_project::acquire_connection().await?;

    let pages = repo_page::get_project_pages(&mut conn, project_id.as_str())
        .await
        .trace_error("获取项目页列表时失败")
        .map_err(|e| e.to_string())?;

    // ... 转换逻辑 ...

    tracing::info!(ipc_id = ipc_id, "ipc.project.page.get_project_pages.success");

    Ok(result)
}
```

### 4. DTO 转换

IPC 层使用的是 `model_project::*`（前端接口模型），Repository 层使用的是 `po_project::*`（持久化对象）。

需要在 IPC 层进行转换：

```rust
let po_pages: Vec<po_project::LocalPage> = pages
    .into_iter()
    .map(|p| po_project::LocalPage {
        id: p.id,
        project_id: p.project_id,
        index_in_project: p.index_in_page,
        local_image_path: p.local_image_path,
    })
    .collect();
```

## 执行步骤

1. **创建 `project/page.rs`**
   - 从 `project.rs` 中移动 4 个 page 相关的函数
   - 添加必要的导入
   - 确保 `create_` 和 `update_` 都调用 `repo_page::save_project_pages()`

2. **创建 `project/unit.rs`**
   - 从 `project.rs` 中移动 4 个 unit 相关的函数
   - 添加必要的导入
   - 确保 `create_` 和 `update_` 都调用 `repo_unit::save_page_units()`

3. **更新 `project.rs`**
   - 删除已移动的函数
   - 确保 `pub mod page;` 和 `pub mod unit;` 声明存在
   - 更新导入（移除不再需要的 `page as repo_page` 和 `unit as repo_unit`）

4. **查找并更新 `lib.rs` 或其他注册 IPC 的地方**
   - 更新 `invoke_handler!` 宏中的函数路径

5. **验证编译**
   - 运行 `cargo check` 确保没有编译错误
   - 运行 `cargo build` 确保构建成功

6. **测试**
   - 测试所有 page 相关的 IPC 调用
   - 测试所有 unit 相关的 IPC 调用
   - 确保功能与重构前一致

## 预期效果

重构完成后：
- `project.rs`：约 600-700 行（原 1106 行）
- `project/page.rs`：约 200 行（新增）
- `project/unit.rs`：约 200 行（新增）
- 代码组织更清晰，可维护性更强
- 与 repository 层结构保持一致
