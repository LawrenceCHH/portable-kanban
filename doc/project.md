# Portable Kanban 專案開發與維護手冊

> 本文檔用於記錄 Portable Kanban 專案架構、開發環境要求、維護規範與常用工作流程。

---

## 1. 專案概覽 (Overview)

**Portable Kanban** 是一個輕量級、跨平台的看板管理工具。它的核心理念是以純文字的 `.kanban`（JSON 格式）作為統一的儲存格式，使看板資料可在不同介面間直接無縫共用。

目前支援的客戶端介面包括：
- **VS Code Extension**：嵌入式 Custom Editor，提供視覺化拖曳編輯體驗。
- **Web App**：瀏覽器獨立執行的 Web 看板。
- **TUI CLI (`pkb`)**：基於 Ink 的終端機鍵盤驅動介面。
- **MCP Server**：符合 Model Context Protocol 規範的服務，供 AI 助手（Claude Desktop、Copilot 等）讀取與編輯看板。

---

## 2. Monorepo 架構 (Architecture)

專案採用 **pnpm workspace** 進行 Monorepo 管理，分為共用套件 (`packages/`) 與獨立應用 (`apps/`)：

```text
portable-kanban/
├── packages/
│   ├── core/         # 核心資料模型、驗證器 (runtypes/decoder)、JSON 解析與序列化
│   └── ui/           # 共用 React 看板 UI 組件、頁面、Jotai 狀態管理、拖曳邏輯 (@dnd-kit)
├── apps/
│   ├── vscode/       # VS Code 擴充套件（主進程擴充端 + Webview 前端打包）
│   ├── web/          # 獨立 Web 應用程式 (Vite + React)
│   ├── tui/          # 終端機 TUI 應用程式 (Ink + React 18)
│   └── mcp/          # Model Context Protocol 伺服器 (Node.js TypeScript)
├── doc/
│   └── project.md    # 專案維護手冊（本文檔）
├── .tool-versions    # 工具版本定義 (Node.js)
├── pnpm-workspace.yaml
└── package.json
```

### 模組依賴關係

- `packages/core` 為底層，無相依其他內部模組。
- `packages/ui` 依賴 `packages/core`。
- `apps/vscode` 與 `apps/web` 同時依賴 `packages/core` 與 `packages/ui`。
- `apps/mcp` 與 `apps/tui` 依賴 `packages/core`。

---

## 3. 開發環境需求與設置 (Environment Setup)

### 依賴要求

| 工具 | 建議版本 | 備註 |
|---|---|---|
| **Node.js** | `24.16.0` | 定義於專案根目錄 `.tool-versions` |
| **pnpm** | `9.15.x` 或以上 | Monorepo 套件管理與鎖定檔 |
| **mise** | 最新版 | 建議的版本管理器（相容 `.tool-versions`） |

### 快速初始化環境

1. **安裝 mise 並設定 Node.js**：
   ```bash
   # 安裝專案指定 Node 版本
   mise install

   # 安裝 pnpm
   mise use -g pnpm@9.15.9
   ```

2. **確認環境變數與 PATH**：
   確保 `~/.local/share/mise/shims` 與 `~/.local/bin` 已包含在 `PATH` 中。

3. **安裝依賴**：
   ```bash
   pnpm install
   ```

---

## 4. 關鍵環境與依賴相容注意事項 (Known Gotchas)

維護本專案或升級套件時需特別注意以下要點：

1. **React 19 版本必須完全一致**：
   - React 19 在載入時會嚴格校驗 `react` 與 `react-dom` 的版本號，若不完全匹配會拋出致命錯誤 `Incompatible React versions`。
   - `packages/ui`、`apps/vscode` 與 `apps/web` 的 `react` 與 `react-dom` 版本必須保持相同（目前使用 `^19.3.0`）。
   - **例外**：`apps/tui` 因 Ink 依賴限制，維持使用 React 18，不可強制覆寫全域 React 版本。

2. **TypeScript 與 Node 內建模組型別**：
   - 包含 Node.js 內建模組（如 `node:fs`、`node:path`、`process`）的專案（如 `apps/mcp`），其 `tsconfig.json` 的 `compilerOptions` 需明確加入 `"types": ["node"]`，避免型別推斷失敗。

3. **雙建置目標 (Dual-bundle) 架構**：
   - `apps/vscode` 包含兩套不同目標的建置：
     - **Extension 主進程**：使用 `esbuild` 編譯為 Node.js CommonJS (`dist/extension.js`)。
     - **Webview UI**：使用 `vite build` 編譯為瀏覽器端程式 (`dist/kanban.js`)。

---

## 5. 常用開發指令 (Development Commands)

### 擴充套件專用開發指令

```bash
# 編譯 VS Code 擴充套件（產出 dist/extension.js 與 dist/kanban.js）
pnpm build:vscode

# 監聽模式：即時編譯 VS Code 擴充套件與 Webview
pnpm dev:vscode

# 打包產出 VS Code 擴充套件 .vsix 安裝包
pnpm --filter portable-kanban run vsce:package
```

### 全專案通用指令

```bash
# 全 Monorepo 構建（core, ui, vscode, web, tui, mcp）
pnpm build

# 執行測試套件 (Vitest)
pnpm test

# 執行程式碼檢查 (Oxlint)
pnpm lint
```

### 其他子應用指令

```bash
# Web 應用開發伺服器
pnpm dev:web

# TUI 開發
pnpm dev:tui

# MCP 伺服器開發
pnpm dev:mcp
```

---

## 6. VS Code Extension 除錯指南 (Debugging in VS Code)

專案已配置根目錄下的 `.vscode/launch.json` 與 `.vscode/tasks.json`：

1. **啟動除錯 (F5)**：
   - 在 VS Code 中按下 `F5` 或至「執行與偵錯」分頁選擇 **Launch Extension**。
   - 系統會自動先執行 `build:vscode` 建置，隨後開啟 Extension Development Host 獨立視窗。
2. **即時監聽除錯**：
   - 選擇 **Watch & Launch Extension**，會在背景執行 `pnpm dev:vscode` 隨改隨編。
3. **功能驗證步驟**：
   - 在新開啟的 Extension Development Host 視窗中，按下 `Ctrl+Shift+P`（或 `Cmd+Shift+P`）。
   - 執行命令：`Portable Kanban: Create new Kanban`。
   - 即可測試看板的新增、拖曳卡片、編輯文字、標籤等全部互動功能。

---

---

## 7. 看板操作與卡片生命週期功能 (Card Features & Lifecycle)

### 快捷鍵與多選卡片 (Multi-Select & Shortcuts)
- **多選卡片**：按住 `Ctrl`（Windows / Linux）或 `Cmd`（macOS）並點擊卡片，可切換該卡片的選取狀態。選取之卡片會呈現醒目高亮外框。
- **批次封存 (`a` / `A`)**：選取一或多張卡片後，直接按下 `a` 鍵即可執行**批次封存**。
- **取消選取 (`Esc`)**：按下 `Esc` 鍵或點擊看板空白處即可取消所有卡片選取。
- **批次操作浮動工具列**：一旦有卡片被選取，畫面底部會浮現操作列，顯示已選取數量並提供「封存 (a)」與「取消 (Esc)」按鈕。

### 卡片封存快照與活動日誌 (Archive Snapshot & Lifecycle Audit Log)
- **不可變 Block 快照**：卡片封存時，會在卡片資料內永久寫入當下的封存時間 `archivedAt` 與所屬清單快照 `archivedFromList: { id, title }`。即使看板上的清單事後被改名（例如 `Done 2026-09-28` 改為 `Done 2026-10-05`）或被刪除，已封存卡片始終保留當時封存所屬的 Block 名稱。
- **生命週期軌跡 (Audit Log)**：卡片支援 `activities?: CardActivity[]`，自動追蹤關鍵生命週期事件：
  - `created`：卡片建立時間與初始清單。
  - `moved`：跨清單移動之來源清單與目的清單快照名稱及時間。
  - `archived`：封存時間與當時清單快照名稱。
  - `restored`：還原時間與目的清單名稱。
- **向後相容**：所有新增欄位均為可選（`optional`），舊版 `.kanban` 檔案可正常載入與解析。

### 封存卡片彈跳視窗 (Archived Card Modal)
- 在封存側邊欄點擊卡片時，會開啟詳細檢視 Modal：
  - 頂部醒目橫幅顯示**封存時間**與**封存當下的 Block 快照名稱**。
  - 完整展示卡片標題、標籤、到期日、描述、任務檢查清單（含勾選狀態）、留言紀錄。
  - **活動歷程時間軸 (Activity Timeline)**：視覺化展示該卡片自建立、移動、封存到還原的所有生命週期軌跡。
  - 提供「還原 (Restore)」、「永久刪除 (Delete)」與「關閉 (Close)」操作按鈕。

---

## 8. 維護與變更指引 (Maintenance Guide)

### 修改資料結構流程

若需擴充卡片欄位或看板資料結構：
1. **修改核心模型**：編輯 `packages/core/src/kanban.ts`，新增型別與欄位定義。
2. **更新序列化與解碼器**：更新 `packages/core/src/kanban.ts` 內的解碼器，以確保能向後相容舊有 `.kanban` 檔案。
3. **更新共用狀態與 UI**：在 `packages/ui/src/` 中更新 Jotai Atom (`store.ts`) 及對應元件。
4. **執行測試**：執行 `pnpm test` 確保既有解析與操作邏輯不被破壞。

---

*最後更新時間：2026-09-14*

