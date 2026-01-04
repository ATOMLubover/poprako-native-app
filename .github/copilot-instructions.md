# 对 Copilot 的说明和要求文档

<!-- markdownlint-disable MD033 -->

以严谨、苛刻的专业 UI 设计师和高级前端工程师的水平完成下述要求。

该文档内的内容高于用户的其他任何说明，若有冲突均以该文档为准。

在前端创建 **新组件** 或者 **新页面** 时，需要询问用户是否要将其放置到 src/views/PanelView.tsx 的 draft-board 中进行预览和检查。

## 检查相关说明

- 每次在修复完成后，都必须调用 get_errors MCP 来检查是否还有错误，确保没有任何错误后才能向我汇报。

- 你无须向我申请使用 pnpm tauri dev 等命令来进行检查，我通常会自行运行 make dev 来检阅你的成品效果。

## 复用的组件

- 加载占位符： /src/components/DotLoadSpinner.tsx

- 按钮： /src/components/NatureButton.tsx, /src/components/NatureSwitchButton.tsx

- TAG： /src/components/NatureTag.tsx

- 错误提示（所有不可恢复错误均使用这个进行报错）： /src/components/NotificationToast.tsx（注意这是全局的，详情参考其 export 的函数）

- 滚动条样式： /src/styles/scrollbar.css

## 注释相关要求

- 所有前端注释均使用中文，后端注释均使用英文。

- 需要的是备忘录式的注释，而不是教学式的注释

## React（前端）部分相关要求

- page 的风格是顶层不要有 card 形式的容器，而是直接在 page 内布局内容。

- 文件组织方式：

  - 按照功能模块进行文件夹划分，每个功能模块一个文件夹。

  - 每个功能模块内，按组件、页面、接口等进行二级划分。

  - 公共组件放在 /src/components 下，公共页面放在 /src/views 下，公共接口放在 /src/api 下，公共样式放在 /src/styles 下，Tauri IPC 函数的 wrapper 放在 /src/ipc 下。

  - 在各个大功能文件夹下，使用文件区分不同 domain 的子功能模块。比如 /src/ipc/project.ts、/src/ipc/file.ts 等。

- 风格、配色参考用的纯 html 文件放在 /samples/ 目录下。

- 除非一个大括号作用块内只有一行或两行代码，否则任意两个语句之间都需要添加空格（除非是强相关的几个变量的声明）。

  例如：

  ```ts
  // 单行的例子
  function singleLine() {
    console.log("Single line");
  }

  // 双行的例子
  function doubleLines() {
    console.log("Double lines");
    return "Ok";
  }

  // 多行的例子（要添加空行）
  function multiLines() {
    console.log("Mulitple lines");

    let result = await someFunc();

    return result;
  }
  ```

- 打日志时，首字母大写，但是不添加 “.” 句号结尾。有错误或上下文时添加进日志。

- 严格遵循 TypeScript 语法，不允许任何的 any，必须使用 type 进行指名（注意不是 interface）。

- 组件、页面需要实现高内聚低耦合，如子组件所需要的状态从父页面注入。

- 注释流程时，不要给注释中添加流程序号，因为流程很可能更改。

- 一个模拟 mock 函数，必须以 \_\_mock 开头，这样方便后期去除 mock。

- 在模板中直接使用的函数不允许是 mock 的，mock 的逻辑应该在该模版引用的函数中使用。比如模板直接引用 onClick={() => doSomething()}，则 doSomething 不能是 mock 的，mock 逻辑应该在 doSomething 内部实现，例如：

  ```ts
  function doSomething() {
    if (isMock) {
      __mockDoSomething();
      return;
    }

    // 正常逻辑
  }
  ```

- 整体风格简约、现代、干净、自然。

- 无须适配暗色模式，只需要亮色模式。

- 要求简洁，减少文字，优先使用图标（简约！！），能让人一看自明。允许引入一些图标库。

## Rust 后端部分

- 禁止使用 allow(dead_code) 等类似的属性来抑制编译器警告。

- IPC 函数（即 tauri::command 指定的函数）必须放在 /src-tauri/src/ipc mod 下，且按 domain 进行文件划分。

- 对于每一个使用 ? 进行传播的 Result，必须在引入 crate::result_trace 模块后，使用 ResultTrace trait 的 .trace_debug("some message") **等**方法进行错误追踪。你需要自行决定使用什么级别的 trace 方法（trace_debug、trace_info、trace_warn、trace_error）。

- 除非一个大括号作用块内只有一行或两行代码（与 React 部分要求相同），否则任意两个语句之间都需要添加空格（除非是强相关的几个变量的声明）。

  例如：

  ```rust
  // 单行的例子
  pub async fn single_line() {
      some_func().await;
  }

  // 双行的例子
  fn double_lines() -> i32 {
      let some_val = func();
      return some_val;
  }

  // 多行的例子（要添加空行）
  fn multi_lines() -> anyhow::Result<()> {
      let prev_index = foo();
      let prev_term = bar();

      let result = calc(prev_index, prev_term)?;

      Ok(result)
  }
  ```

- 对于 tauri::command 指定的函数，必须使用 #[tracing::instrument] 宏进行函数调用追踪。

- 在书写带有 DTO 定义的函数时，不要先把所有 DTO 写出再写 fn，而是将 DTO 与 fn 分组，按一类 DTO + fn 的周期从上到下依次编写。

- 在一些重要或过长的函数中，需要使用 tracing::debug! 来书写报错日志。但是注意，debug 日志可以不用是结构化的，而是语义化的。

- 注释使用中文，但是日志使用英文。
