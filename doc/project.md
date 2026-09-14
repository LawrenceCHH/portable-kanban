# Portable Kanban 專案開發與維護手冊

> 本文檔記錄 Portable Kanban 專案的功能現狀、架構設計、開發環境要求、版本歷史更新紀錄與維護指引。後續所有功能擴充與變更均於此文檔持續維護。

---

## 目錄

1. [專案概覽 (Overview)](#1-專案概覽-overview)
2. [目前功能總覽（現在專案能幹嘛）](#2-目前功能總覽現在專案能幹嘛)
3. [版本歷史更新紀錄 (Release History / Changelog)](#3-版本歷史更新紀錄-release-history--changelog)
4. [測試範本指引 (Sample Kanban Template)](#4-測試範本指引-sample-kanban-template)
5. [Monorepo 架構 (Architecture)](#5-monorepo-架構-architecture)
6. [開發環境需求與設置 (Environment Setup)](#6-開發環境需求與設置-environment-setup)
7. [常用開發指令 (Development Commands)](#7-常用開發指令-development-commands)
8. [VS Code Extension 除錯指南 (Debugging in VS Code)](#8-vs-code-extension-除錯指南-debugging-in-vs-code)
9. [維護與變更指引 (Maintenance Guide)](#9-維護與變更指引-maintenance-guide)

---

## 1. 專案概覽 (Overview)

**Portable Kanban** 是一個以純文字檔案 `.kanban`（標準 JSON 格式）為儲存核心的輕量級看板工具。

核心設計哲學：
- **檔案即看板**：所有資料完整收錄在單一 `.kanban` 檔案內，便於 Git 版本控制、備份與跨裝置攜帶。
- **跨平台共用**：無論是在 VS Code 編輯器、瀏覽器網頁、終端機命令列，或是 AI 助手，皆操作同一份檔案。

---

## 2. 目前功能總覽（現在專案能幹嘛）

### 2.1 支援的客戶端介面

| 客戶端 | 執行環境 | 主要特點 |
|---|---|---|
| **VS Code Extension** | VS Code 編輯器內部 | 透過 Custom Editor 註冊，雙擊 `.kanban` 檔案即開即用，支援視覺化拖曳與 Webview 互動。 |
| **Web App** | 瀏覽器（Chrome, Firefox, Safari, Edge） | 獨立 Web 應用，支援本地檔案讀取與編輯。 |
| **TUI CLI (`pkb`)** | 終端機 (Terminal) | 基於 Ink 的鍵盤快捷操作介面，無 GUI 環境下仍可高效管理看板。 |
| **MCP Server** | Model Context Protocol | 供 Claude Desktop、GitHub Copilot 等 AI Agent 直接讀取與修改看板卡片。 |

### 2.2 看板核心功能

- **清單與卡片管理**：可自由新增、編輯、拖曳排序、封存、刪除 List 與 Card。
- **卡片細節支援**：
  - 多行描述（支援 Markdown 格式）。
  - 彩色標籤分類（支援自訂標籤名稱與色彩）。
  - 到期日管理（過期與即將到期之色標提醒）。
  - 任務檢查清單（Checkboxes，卡片外層即時顯示完成進度條）。
  - 留言紀錄（Comments）。
- **搜尋與篩選**：支援以文字模糊搜尋（Fuse.js）及多標籤組合過濾卡片。
- **外觀主題**：支援深色 (Dark)、淺色 (Light) 及隨系統切換 (System) 三種主題。

### 2.3 多選與快捷鍵操作 (Multi-Select & Shortcuts)

- **多種卡片選取方式**：
  - **右上角勾選框 (Select Checkbox)**：滑鼠懸停於卡片上方時，卡片右上角會浮現勾選按鈕，點擊即可選取或取消選取卡片。當已有卡片被選取時，所有卡片均會持續顯示勾選框便於連續操作。
  - **Ctrl / Cmd 點擊**：按住 `Ctrl`（Windows / Linux）或 `Cmd`（macOS）點擊卡片任何區域，可任意複選或取消複選卡片。
  - 選取的卡片會呈現主題色外框高亮。
- **快捷鍵 `a` 封存操作 (Archive Shortcut)**：
  - **看板模式**：選取一或多張卡片後，按下鍵盤 `a` 鍵即可一次性將選取的卡片全數封存至封存區。
  - **卡片檢視模式 (EditCard Modal)**：開啟卡片詳細內容時，直接按下 `a` 鍵亦可立即封存當前卡片。
  - 焦點位於輸入框（`input` / `textarea` / `contenteditable`）時會自動忽略，避免打字衝突。
- **快捷鍵 `Esc` 與背景點擊**：
  - 看板模式下按下 `Esc` 或點擊看板空白處即可瞬間清除所有選取狀態。
  - 卡片詳細視窗模式下按下 `Esc` 可立即關閉視窗返回看板。
- **批次操作浮動工具列**：選取卡片時，畫面底部中央浮現提示列，顯示「已選取 X 張卡片」，並提供「封存 (a)」與「取消 (Esc)」快捷操作按鈕。

### 2.4 不可變 Block 快照機制 (Immutable Block Snapshot)

- **問題背景**：看板上的清單 (Block) 經常會隨時間改名（例如 `Done 2026-09-28`）或被刪除。若封存卡片僅依賴 `listId` 動態查找清單標題，改名或刪除後歷史歸屬會失真。
- **快照機制**：卡片在封存當下，會將所屬清單的標題快照與封存時間戳永久寫入卡片本體：
  ```json
  "archivedAt": "2026-09-14T14:30:00.000Z",
  "archivedFromList": {
    "id": "list-done",
    "title": "Done 2026-09-28"
  }
  ```
  即使日後看板上的清單改名為 `Done 2026-10-05`，封存卡片始終保留封存當下的精確 Block 資訊。

### 2.5 簡易生命週期審計日誌 (Activity Audit Log)

卡片內建輕量級活動軌跡陣列 `activities`，記錄卡片的完整生命週期：
- 🌟 **建立 (`created`)**：記錄卡片建立的時間與初始清單名稱。
- ➡️ **跨 Block 移動 (`moved`)**：記錄移動發生的時間、來源清單名稱快照與目的清單名稱快照。
- 📦 **封存 (`archived`)**：記錄封存時間與封存時所在的清單名稱快照。
- 🔄 **還原 (`restored`)**：記錄從封存區還原回看板的時間與目標清單。

### 2.6 封存卡片彈跳視窗 (Archived Card Modal)

在封存區點擊任何封存卡片，會彈出專屬檢視視窗：
- **頂部封存快照橫幅**：明確標示「封存自哪個 Block」及「精確封存時間」。
- **卡片完整內容**：標題、標籤、到期日、描述內容、任務清單勾選狀態（含劃線標記）、留言紀錄。
- **活動歷程時間軸 (Activity Timeline)**：以視覺化時間軸依序列出卡片自建立以來的移動與封存歷程。
- **管理動作**：提供「還原至看板 (Restore)」與「永久刪除 (Delete)」按鈕。

---

## 3. 版本歷史更新紀錄 (Release History / Changelog)

### v0.2.8 (2026-09-14)
- **UI 精簡：封存卡片不再顯示 UID**
  - 移除封存卡片列表 (`ArchiveCards.tsx`) 中每張卡片旁的 `#uid` 標籤顯示，以及 `ArchivedCardModal.tsx` 封存快照橫幅中的「UID: ...」列。
  - UID 仍作為內部身分識別（React key、hover 刪除快捷鍵辨識重複標題卡片）持續使用，只是不再顯示於畫面上；改以 `data-uid` DOM 屬性保留供測試／除錯使用。
- **修復：刪除卡片跳出多餘的第二次通知**
  - `EditCard.tsx` 的 `performDeleteCard()` 過去在確認刪除後，會額外呼叫 `getBackend().showInfoMessage()` 觸發一個原生 VS Code 通知（「Delete <標題>」），使用者感覺像是跳了兩次警告。已移除此多餘通知，確認對話框本身與清單更新已足夠作為回饋。
  - 已針對此路徑（Board hover+d 快捷鍵、EditCard 頁面 Delete 按鈕）新增自動化回歸測試，驗證「僅顯示一次確認對話框」且「按下 Cancel 卡片不會被刪除」。
- **新功能：封存卡片依封存時間新到舊排序**
  - `ArchiveCards.tsx` 面板過去依卡片原始陣列順序顯示（最早封存的卡片在最上方）。現在依 `archivedAt` 降冪排序，最新封存的卡片顯示在最上方。
- **開發流程調整：VSIX 安裝方式**
  - Claude Code（AI 助手）所在的沙箱環境沒有 `VSCODE_IPC_HOOK_CLI`，因此無法直接執行 `code --install-extension` 幫使用者安裝擴充套件。
  - 往後的標準流程：每次修復完成後，於 `apps/vscode/package.json` 遞增 patch 版本號 → 重新建置 (`pnpm build:core && pnpm build:ui && pnpm --filter portable-kanban vsce:package`) → 產出新版 `.vsix` 至 `versions/` 並提交 → 由使用者自行在**真正的 VS Code 整合終端機**執行安裝指令（範例見下方）。
  ```bash
  code --install-extension versions/portable-kanban-0.2.8.vsix --force
  ```
  - 若使用 WSL + Windows 端 VS Code 桌面版，請注意實際載入的擴充套件目錄可能是 Windows 端 (`%USERPROFILE%\.vscode\extensions\harehare.portable-kanban-x.x.x`)，而非 WSL 端 (`~/.vscode-server/extensions/...`)；兩邊都可能各自存在一份已安裝的副本，版本落差會導致「明明修好了卻還是看到舊行為」的假象。安裝後務必完整關閉並重新開啟 `.kanban` 檔案分頁（或 Reload Window），確保 Webview 不是沿用舊的快取內容。

### v0.2.7 (2026-09-14)
- **新功能與操作改進：卡片多選與批次封存快捷鍵**
  - 支援右上角浮動勾選框 (Select Checkbox) 與 `Ctrl+Click`（macOS 為 `Cmd+Click`）多選看板卡片。
  - 卡片 Container 增加 `tabIndex={0}`，支援鍵盤焦點選取與無障礙操作。
  - 新增全域快捷鍵 `a`：看板有卡片選取時立即批次封存；卡片檢視視窗 (`EditCard`) 中按下 `a` 亦可立即封存當前卡片。
  - 新增全域快捷鍵 `Esc`：快速清除選取卡片，或自卡片檢視視窗關閉返回看板。
  - 增加底部批次操作浮動工具列（顯示選取計數、封存按鈕、取消按鈕）。
  - 修復 `packages/ui/src/store.ts` 中 `archiveCards` 函式與內部 Jotai Atom 命名衝突導致執行期 `archiveCards is not a function` 拋錯無法封存的問題。
  - 修復 `ArchivedCardModal.tsx` 按鈕屬性型別錯誤。
- **新功能：不可變 Block 封存快照**
  - 卡片封存時寫入 `archivedFromList: { id, title }` 快照與 `archivedAt` 時間戳，徹底解決看板清單改名導致封存歷史混淆的問題。
- **新功能：簡易生命週期活動審計日誌 (CardActivity)**
  - 卡片資料模型擴充 `activities?: CardActivity[]`，自動追蹤紀錄 `created`、`moved`、`archived`、`restored` 四大事件的時間與來源/目的 Block 快照。
  - 維持完全向後相容性，舊有 `.kanban` 檔案可無縫載入。
- **修復與體驗改進：封存卡片彈跳視窗**
  - 修復了過去點擊封存卡片毫無反應的問題。
  - 建立專用 `ArchivedCardModal`，支援展示封存 Block 快照橫幅、完整卡片資訊、活動歷程時間軸、還原與刪除操作。
- **開發環境與架構優化**
  - 升級並對齊 React 與 React-DOM 至 `^19.3.0`，修正 React 19 核心相容性錯誤。
  - 修正 `apps/mcp` TypeScript Node.js 型別宣告支援。
  - 建立完整的 VS Code 除錯設定 (`launch.json` 與 `tasks.json`)。

### v0.2.6 (早期版本)
- 完成 Monorepo 架構遷移，拆分為 `packages/core`、`packages/ui`、`apps/vscode`、`apps/web`、`apps/tui`、`apps/mcp`。
- 引入 Vite、Vitest 與 Oxlint 現代化前端建置工具鏈。

---

## 4. 測試範本指引 (Sample Kanban Template)

專案根目錄提供了一份標準範本檔 [example.kanban](file:///home/lawrencehuang/projects/portable-kanban/example.kanban)（參考使用者的典型筆記格式如 `/home/lawrencehuang/note/r.kanban` 建立）。

該範本包含：
1. **活躍清單**：`Backlog`、`To Do`、`Doing`、`Done 2026-09-28`。
2. **多種類型卡片**：包含含標籤、任務檢查表（Checkboxes）、到期日、留言的完整範例。
3. **活動日誌範例**：示範了包含 `created` 與 `moved` 軌跡的卡片。
4. **已封存卡片範例**：展示了包含 `archivedFromList`（指向 `Done 2026-09-28`）及完整生命週期時間軸的封存卡片。

### 測試方式

1. 在 VS Code 中按下 `F5` 啟動 Extension Development Host。
2. 在新視窗中開啟 [example.kanban](file:///home/lawrencehuang/projects/portable-kanban/example.kanban)。
3. **驗證快捷鍵與多選**：
   - 方式一：滑鼠懸停於卡片右上角，點擊出現的勾選框 (Checkbox) 進行選取或多選。
   - 方式二：按住 `Ctrl`（或 macOS `Cmd`）點擊卡片進行多選，確認外框高亮與底部批次工具列顯示「已選取 X 張卡片」。
   - 按下 `a` 鍵（或點擊底部「封存 (a)」按鈕），確認卡片成功批次封存並移至封存區。
   - 點擊開啟任一卡片檢視視窗 (`EditCard`)，在非文字編輯狀態下按下 `a`，亦可立即封存當前卡片；按下 `Esc` 則可關閉視窗返回看板。
4. **驗證封存彈窗與歷史**：
   - 點擊右上角選單進入 `Archive Cards`。
   - 點擊任一封存卡片，確認彈出 `ArchivedCardModal`，並檢查 Block 快照名稱與活動時間軸是否正確呈現。

---

## 5. Monorepo 架構 (Architecture)

```text
portable-kanban/
├── packages/
│   ├── core/         # 核心資料模型、驗證器 (Decoder)、JSON 解析與序列化
│   └── ui/           # 共用 React 看板組件、頁面、Jotai 狀態管理、@dnd-kit 拖曳
├── apps/
│   ├── vscode/       # VS Code 擴充套件（主進程 esbuild + Webview vite）
│   ├── web/          # 獨立 Web 應用程式 (Vite + React)
│   ├── tui/          # 終端機 TUI 應用程式 (Ink + React 18)
│   └── mcp/          # Model Context Protocol 伺服器
├── doc/
│   └── project.md    # 專案維護手冊（本文檔）
├── example.kanban    # 功能測試與範本檔案
├── .tool-versions    # 工具版本定義 (Node.js 24.16.0)
├── pnpm-workspace.yaml
└── package.json
```

---

## 6. 開發環境需求與設置 (Environment Setup)

| 工具 | 建議版本 | 備註 |
|---|---|---|
| **Node.js** | `24.16.0` | 定義於專案根目錄 `.tool-versions` |
| **pnpm** | `9.15.x` 或以上 | Monorepo 套件管理與鎖定檔 |
| **mise** | 最新版 | 建議的版本管理器（相容 `.tool-versions`） |

### 快速初始化指令

```bash
# 安裝指定 Node 版本與 pnpm
mise install
mise use -g pnpm@9.15.9

# 安裝所有相依套件
pnpm install
```

---

## 7. 常用開發指令 (Development Commands)

### 擴充套件專用指令

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

---

## 8. VS Code Extension 除錯指南 (Debugging in VS Code)

專案已在 `.vscode/` 設定除錯環境：
1. **啟動除錯 (F5)**：選擇 **Launch Extension**，系統會先執行 `build:vscode`，隨後啟動獨立的 Extension Development Host。
2. **隨改隨編除錯**：選擇 **Watch & Launch Extension**，即可以即時監聽模式進行開發與測試。
3. **手動測試新看板**：在除錯視窗按 `Ctrl+Shift+P` 執行 `Portable Kanban: Create new Kanban`，或直接開啟現有的 `.kanban` 檔案。

---

## 9. 維護與變更指引 (Maintenance Guide)

### 新增或修改資料結構流程

若需擴充卡片欄位或看板結構，請依循以下標準步驟：
1. **更新核心模型與 Decoder**：編輯 `packages/core/src/kanban.ts`，新增型別並在 `cardDecoder` 中將新欄位設為 `optional`，以確保向後相容。
2. **更新核心操作函式**：更新 `packages/core/src/kanban.ts` 中的對應操作（例如 `archiveCard`、`moveCard` 等）。
3. **更新單元測試**：在 `packages/core/src/tests/kanban.test.ts` 中撰寫新功能之測試案例，並執行 `pnpm test`。
4. **更新共用狀態與 UI**：在 `packages/ui/src/store.ts` 中新增或擴充 Jotai Atom / Action，並更新對應 UI 組件。
5. **更新本文檔 (project.md)**：將新功能詳細記錄於「目前功能總覽」與「版本歷史更新紀錄」中。

---

*文檔版本：v0.2.8 ｜ 最後更新時間：2026-09-14*
