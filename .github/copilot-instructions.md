### Purpose

Provide concise, actionable guidance for AI coding agents working on this Tauri + React + TypeScript repo.

### Big picture

- **Stack:** Vite (frontend) + React + TypeScript + Tauri (Rust backend). Frontend lives in `src/`; native integration and Rust code live in `src-tauri/`.
- **Data flow:** Frontend calls Rust commands via `invoke(...)` (see `src/App.tsx`), Rust exposes handlers with `#[tauri::command]` (see `src-tauri/src/lib.rs`) and registers them with `invoke_handler` in `run()`.
- **Build outputs:** Frontend dist is `dist/` (configured in `src-tauri/tauri.conf.json` as `frontendDist: ../dist`). Rust build artifacts live in `src-tauri/target/`.

### Key files to inspect

- `package.json` — frontend scripts: `dev`, `build`, `preview`, `tauri` (runs the Tauri CLI).
- `vite.config.ts` — important dev settings: Vite server port `1420`, `strictPort: true`, HMR host/port logic (env `TAURI_DEV_HOST`), and `watch.ignored` excludes `src-tauri`.
- `src/App.tsx` — example of frontend -> backend pattern using `invoke("greet", { name })`.
- `src-tauri/tauri.conf.json` — Tauri dev/build hooks: `beforeDevCommand: pnpm dev`, `devUrl: http://localhost:1420`, `beforeBuildCommand: pnpm build`.
- `src-tauri/Cargo.toml` — Rust crate configuration. Note special `lib.name = "__letter_lib"` used to avoid name collisions on Windows.

### Developer workflows / useful commands

- Install deps (pnpm is used in `tauri.conf.json`):

  - `pnpm install`

- Run frontend only (fast iteration):

  - `pnpm dev` (runs Vite on `:1420`)

- Run the full Tauri dev environment (recommended):

  - `pnpm run tauri dev`

  This triggers `beforeDevCommand` (frontend dev server), points to `devUrl`, and launches the Tauri runtime.

- Build production frontend + bundle native app:

  - `pnpm run tauri build` (runs `pnpm build` first per `tauri.conf.json`)

### Project-specific conventions & gotchas

- Vite uses a fixed port (`1420`) and `strictPort: true` — do not change without updating `src-tauri/tauri.conf.json` `devUrl`.
- HMR can be configured for remote development via `TAURI_DEV_HOST` env var; when set, HMR uses port `1421`.
- `vite.config.ts` sets `clearScreen: false` so Rust/Tauri error output remains visible in the terminal.
- `src-tauri` is intentionally excluded from Vite watch to avoid rebuild loops — direct edits in `src-tauri` require a Tauri/Rust rebuild.
- Rust lib name uses `__letter_lib` (see `src-tauri/Cargo.toml`) to avoid Windows naming collisions; keep that unless you understand the platform implications.

### Integration patterns (examples to follow)

- Frontend -> Rust command: in `src/App.tsx`:

  - `const resp = await invoke("greet", { name })`

- Rust command handler: in `src-tauri/src/lib.rs`:

  - `#[tauri::command]
fn greet(name: &str) -> String { ... }`

  - Registered with `tauri::generate_handler![greet]` inside `run()`.

### External dependencies / plugins

- Frontend: `@tauri-apps/api`, `@tauri-apps/plugin-opener` — used for platform APIs and opener plugin (registered in Rust with `tauri_plugin_opener::init()`).
- Rust: `tauri`, `tauri-build`, `serde`, `serde_json` — check `src-tauri/Cargo.toml` for versions and features.

### What an AI agent should do first

- Read `vite.config.ts`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml` to understand dev/build hooks and port assumptions.
- Search for `invoke(` usages in `src/` to find existing frontend->Rust interactions (pattern: action name string and argument shape).
- When modifying backend commands, update both Rust handler signatures and all frontend `invoke` call sites.

### When to run tests / builds locally

- There are no automated tests in the repo. Validate changes by running the dev workflow:

  - `pnpm install`
  - `pnpm run tauri dev`

  Observe Vite output on port `1420` and Tauri logs in the same terminal. For release builds, run `pnpm run tauri build`.

### If you need clarification

- Ask which environment the maintainer uses (`pnpm` vs `npm` vs `yarn`) and whether changing fixed ports or the Rust lib name is allowed.

---

Please review and tell me if you want additional details (e.g., example code snippets, tests, or CI steps).
