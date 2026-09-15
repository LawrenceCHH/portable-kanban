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
  - **卡片檢視模式 (EditCard Modal)**：開啟卡片詳細內容時，直接按下 `a` 鍵（或點擊「Archive」按鈕）即可立即封存當前卡片；封存完成後會自動關閉卡片視窗，並直接跳轉至「封存卡片 (Archived Cards)」清單，方便立即確認或還原。
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
- **可摺疊的卡片內容區塊**：快照橫幅下方為一個可點擊的「Card Details」摺疊列，預設收合，僅顯示標題與封存快照，讓使用者快速瀏覽封存清單；點擊後向下展開，才顯示標籤、到期日、描述內容、任務清單勾選狀態（含劃線標記）、留言紀錄與活動歷程時間軸。
- **活動歷程時間軸 (Activity Timeline)**：以視覺化時間軸依序列出卡片自建立以來的移動與封存歷程（收合於上述摺疊區塊內）。
- **管理動作**：提供「還原至看板 (Restore)」與「永久刪除 (Delete)」按鈕，不受摺疊狀態影響、隨時可操作。

---

## 3. 版本歷史更新紀錄 (Release History / Changelog)

### v0.2.13 (2026-09-15)
- **新功能：新增 `c` / `l` 快捷鍵直接開啟封存清單，並支援 hover**
  - `Board.tsx` 全域快捷鍵新增：未 hover 任何卡片時按下 `c` 會直接開啟「Archived Cards」；按下 `l`（不論是否 hover 卡片）會直接開啟「Archived List」。皆會帶上 `backgroundLocation`，維持看板背景可見的既有覆蓋層機制。
  - 既有的 `c`（hover 卡片時複製該卡片）行為完全保留、優先順序不變：只有在**沒有 hover 任何卡片**時，`c` 才會改為開啟 Archived Cards，因此不會與既有複製卡片快捷鍵衝突。
  - 新增 `Board.test.tsx` 回歸測試：驗證未 hover 時按 `c`／`l` 會分別導向 Archived Cards／Archived List 頁面；hover 卡片時按 `c` 仍是複製卡片而非導向頁面。
- **新功能：右上角新增鍵盤快捷鍵說明小圖示**
  - 新增 `ShortcutsHelp.tsx`，在 `Header.tsx` 最右側（既有封存選單圖示的右邊）新增一個鍵盤圖示（`MdKeyboard`），點擊後於右上角彈出面板，依「Board（hover/已選取卡片）」「Board（未 hover 任意處）」「Card view」「Archived cards」四個情境列出目前所有已實作的快捷鍵與說明（包含這次新增的 `c` 開啟 Archived Cards、`l` 開啟 Archived List，以及先前版本新增的 `r` 還原）。
  - 沿用既有 `Menu.tsx` 使用的 `menuAtom`（`selectors.useMenu()` / `actions.useSetMenu()`）機制，因此點擊看板空白處或開啟其他選單時會自動收合，行為與既有封存選單一致。
  - 新增 `ShortcutsHelp.test.tsx` 驗證：面板預設不顯示，點擊圖示後才出現，且內容包含新快捷鍵說明。

### v0.2.12 (2026-09-15)
- **新功能：封存卡片新增 `r` 快捷鍵還原，支援 hover**
  - 比照既有的 `a`（封存）／`d`（刪除確認）／`Ctrl+d`（直接刪除）快捷鍵模式，在「封存卡片 (Archive Cards)」清單頁面 hover 一張卡片後按下 `r`，會直接呼叫 `restoreCard()` 將該卡片還原（無需確認對話框，行為對齊清單上原本就有的「Restore」點擊按鈕）。
  - `ArchivedCardModal.tsx` 彈跳視窗內按下 `r` 同樣直接還原目前檢視的卡片並關閉視窗，行為對齊視窗內原本的「Restore」按鈕。
  - 新增回歸測試：`ArchiveCards.test.tsx` 驗證 hover 卡片後按 `r` 僅還原該張卡片（其餘卡片仍留在封存清單）；`ArchivedCardModal.test.tsx` 驗證按 `r` 會呼叫 `onRestore` 並關閉視窗。
- **UX 調整：封存卡片彈跳視窗的摺疊範圍改回涵蓋全部卡片內容**
  - v0.2.11 曾把標籤、到期日、任務清單移出摺疊範圍改為直接顯示，只讓描述與留言收合。重新檢視後，凡是在 Board 上點擊卡片（EditCard）會顯示的資訊——標籤、到期日、任務清單、描述、留言——現在統一收合回同一個摺疊列裡，摺疊列文字也改回「Card Details」。
  - 「活動歷程（Activity History）」維持不變：不受摺疊列控制，永遠緊接在摺疊列之後直接顯示，讓使用者每次都能明確分辨「上方摺疊列展開後才是卡片內容，下方固定是卡片歷程」。
  - `ArchivedCardModal.test.tsx` 更新既有測試，改為驗證標籤／到期日／任務清單／描述／留言全部預設收合、點擊「Card Details」後一次展開、再次點擊收合；活動歷程則拆成獨立測試驗證其永遠直接顯示。

### v0.2.11 (2026-09-15)
- **UX 調整：封存卡片彈跳視窗重新拆分摺疊範圍，活動歷程改為永遠直接顯示**
  - `ArchivedCardModal.tsx` 在 v0.2.10 的做法是把標籤、到期日、描述、任務清單、留言、活動歷程時間軸全部塞進同一個「Card Details」摺疊列，一次全收合或全展開。
  - 改為只有**描述（Description）與留言（Comments）**維持預設收合，摺疊列文字也改成「Description & Comments」以反映實際涵蓋範圍；標籤、到期日、任務清單則不再受摺疊控制，永遠直接顯示。
  - 「活動歷程（Activity History）」區塊移出摺疊範圍，固定緊接在摺疊列之後永遠直接展開顯示，不需使用者額外點擊。摺疊列位置固定在標籤／到期日／任務清單之後、活動歷程之前，讓使用者每次打開封存卡片都能立即分辨「上方是卡片內容（可展開描述與留言）、下方固定是卡片歷程」，避免描述或留言內容過長時把歷程位置擠到不可預期的地方。
  - `ArchivedCardModal.test.tsx` 更新既有摺疊測試（改用新的「Description & Comments」文字），並新增一則測試驗證標籤／到期日／任務清單／活動歷程無需點擊摺疊列即可直接看到。

### v0.2.10 (2026-09-15)
- **體驗改進：卡片檢視視窗封存後自動跳轉封存清單**
  - `EditCard.tsx` 的 `handleArchiveCard()` 過去封存卡片後仍停留在同一個視窗，僅切換成顯示「This card has been archived.」橫幅與「Restore」按鈕，需要使用者自行手動關閉再打開封存清單才能看到剛封存的卡片。
  - 現在無論是按下快捷鍵 `a` 還是點擊「Archive」按鈕，封存動作完成後會直接 `navigate('/archive/cards')`，關閉目前卡片視窗並跳轉至「封存卡片」清單，同時保留原本的看板背景（沿用既有的 `backgroundLocation` 覆蓋層機制，維持 Board 在背後可見）。
  - 新增 `EditCard.test.tsx` 回歸測試：以真實 `Route` 結構驗證「按下 `a` 後卡片視窗消失、封存清單頁面出現」。
- **修復：卡片視窗開啟時「留言」輸入框會意外搶走焦點，導致快捷鍵完全失效**
  - 排查上述封存跳轉功能時發現，`AddComment.tsx` 的留言輸入 `textarea` 一直帶有未受任何條件保護的 `autoFocus`，且留言區塊在 `EditCard` 中永遠會渲染。也就是說，只要一打開任何卡片，瀏覽器就會自動把焦點移到「Enter a comment」輸入框。
  - 由於 `EditCard.tsx` 鍵盤監聽邏輯會在偵測到焦點位於 `input` / `textarea` / `contenteditable` 時直接忽略所有快捷鍵（避免打字衝突），這個意外的自動對焦會讓 `a`（封存）、`d`（刪除確認）、`Ctrl+d`（直接刪除）**全部失效**，使用者剛打開卡片的當下按任何快捷鍵都只是把字元打進留言框。
  - 已移除該處多餘的 `autoFocus`，卡片開啟後不再搶奪焦點，快捷鍵恢復正常運作。
- **新功能：封存卡片彈跳視窗新增可摺疊內容區塊**
  - `ArchivedCardModal.tsx` 過去一打開就會完整展開標籤、到期日、描述、任務清單、留言、活動歷程時間軸等所有內容，卡片內容較多時視窗會非常長。
  - 頂部封存快照橫幅下方新增「Card Details」摺疊列（預設收合），點擊後才向下展開完整卡片內容；「Restore」／「Delete」／「Close」等操作按鈕維持永遠可見、不受摺疊狀態影響。
  - 新增 `ArchivedCardModal.test.tsx` 回歸測試，驗證內容預設收合、點擊摺疊列後展開、再次點擊後收合。

### v0.2.9 (2026-09-15)
- **重大修復：封存卡片 hover + `d` 鍵會跳出兩個互不相干的刪除確認視窗**
  - **根本原因**：`App.tsx` 為了讓 Board 在開啟 Archive Cards / EditCard / Filters 等覆蓋層路由時仍維持「背景可見」，會把 `<Board />` 包在 `<Routes location={backgroundLocation ?? location}>` 裡渲染。React Router 的這個機制會讓該子樹內所有的 `useLocation()` 呼叫，看到的都是被覆寫過的背景路徑（永遠是 `/`），而不是瀏覽器實際的當前網址。
  - 因此 `Board.tsx` 原本用來判斷「目前是否真的在看板首頁、該不該回應全域快捷鍵」的檢查 `if (location.pathname !== '/') return;` **從未真正生效過**——不管實際上是否有覆蓋層開著，Board 的全域鍵盤監聽永遠被判定為「在首頁」。
  - 具體症狀：在 Archive Cards 面板 hover 一張封存卡片、按下 `d`，會同時觸發**兩個獨立、互不知情**的元件：`ArchiveCards.tsx` 自己的「Delete Archived Card」確認框（正確），以及 Board.tsx 仍在背景監聽而誤觸發的「Delete Card」確認框（針對同一張卡片，因為 `hoveredCardInfo` 是全域共用的 Jotai atom）。使用者會看到兩個長得很像但標題不同的警告視窗疊在一起，在其中一個按 Cancel，另一個仍獨立存在、可能被誤按確認。
  - **修復方式**：`App.tsx` 改為在未被覆寫的最外層 `location` 判斷是否有 `backgroundLocation`，並以明確的 `isBackground` prop 傳給 `<Board />`；`Board.tsx` 的全域快捷鍵判斷改用這個 prop，不再依賴會被覆寫的 `useLocation()`。
  - 新增以真實 `App.tsx` 路由結構（而非手動拼裝元件）驗證的回歸測試，證實修復前會重現此 bug、修復後不會。
- **除錯過程紀錄**：此問題一開始被誤判為「VS Code webview 快取沒重新整理」，浪費了不少來回；關鍵突破點是使用者提供了截圖中的完整快捷鍵操作步驟（純 hover + 按一次 `d`，無其他互動）以及當下 `.kanban` 檔案的原始內容，才排除環境快取問題、鎖定到 React Router 巢狀 `location` 覆寫的機制性問題。日後若再懷疑「webview 沒更新」，應先請使用者提供**最小重現步驟**與**當下檔案內容**，而不是預設是快取問題。

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

*文檔版本：v0.2.10 ｜ 最後更新時間：2026-09-15*
