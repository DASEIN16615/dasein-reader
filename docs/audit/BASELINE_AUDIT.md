# Readest 上游基线审计报告 (BASELINE_AUDIT)

- **审计项目**：Dasein Reader 基线底座选型（Readest）
- **审计日期**：2026-11-05
- **上游仓库**：<https://github.com/readest/readest>
- **审计分支**：`main`
- **基线 Commit SHA**：`5b3f854c5f9f11c723e21f56b868fde3c592e04d`
- **最新 Release Tag**：`v0.12.16`
- **审计环境**：Windows 11 / Node.js / pnpm / Git
- **审计执行人**：Google Antigravity Pair Programmer (Gemini 3.8 Flash)

---

## 1. 仓库整体结构与架构拓扑

Readest 采用基于 `pnpm` workspace 的 Monorepo 架构。核心应用位于 `apps/readest-app`，原生移动与桌面容器由 **Tauri v2** 驱动。

```text
readest/ (Monorepo 根目录)
├── apps/
│   ├── readest-app/             # 核心应用 (Next.js/React + Tauri v2 原生壳)
│   ├── readest-calibre-plugin/  # Calibre 伴侣插件
│   ├── readest-crosspoint-plugin/# CrossPoint 电子墨水屏支持
│   └── readest.koplugin/        # KOReader 伴侣插件
├── packages/
│   ├── foliate-js/              # 核心阅读引擎 (支持 EPUB/MOBI/AZW/FB2/CBZ/TXT/HTML)
│   ├── js-mdict/                # MDict (.mdx/.mdd) 词典解析库
│   ├── qcms/                    # 颜色管理
│   ├── simplecc-wasm/           # 简繁转换 WASM
│   ├── swift-rs/                # macOS/iOS Swift 绑定
│   └── tauri/                   # Tauri 运行时封装
└── .github/workflows/           # CI/CD (包含 Android APK 自动化交叉编译工作流)
```

### 1.1 `apps/readest-app` 内部边界分层
- **前端 UI 层** (`src/app` & `src/components`)：基于 React / TailwindCSS / Radix UI 构建现代化交互界面。
- **阅读引擎层** (`packages/foliate-js` & `src/pages/reader`)：通过 WebView 隔离承载排版计算、字体缩放、分页与原生 DOM 选择。
- **领域服务层** (`src/services/`)：
  - `bookService.ts` / `libraryService.ts`：书籍生命周期与书库管理。
  - `dictionaries/`：离线词典索引解析、词形还原 (lemmatize) 与在线 URL 搜索。
  - `send/conversion/`：网页提取与文章转 EPUB 离线封装管道。
  - `database/`：SQLite (Turso/libsql) 数据迁移与统计。
- **原生桥接层** (`src-tauri/`)：
  - Rust 核心与 Android NDK 桥接。
  - `gen/android/` 已固化 Android Studio / Gradle 工程结构。

---

## 2. 关键子系统详细审计

### 2.1 阅读引擎与格式兼容性
- **定位**：代码路径 `packages/foliate-js`。
- **格式支持**：原生支持 `EPUB`、`PDF`、`MOBI`、`AZW`、`AZW3`、`CBZ`、`FB2`、`TXT`、`MD`、`HTML`，并支持流媒体有声书（ABS/OPDSAUDIO）。
- **定位稳定性**：EPUB 采用标准 **Canonical Fragment Identifier (CFI)**；同时补充记录了 `xpointer` 与 `text` 前后片段，排版变动具有天然容错回退机制。
- **结论**：阅读引擎高度成熟，完全满足 P0 需求，坚决不需要重写。

### 2.2 数据模型与本地存储架构
Readest 的本地持久化设计极其优秀且去中心化，完全符合“本地优先”哲学：
- **书库清单**：保存在应用存储目录的 `Books/library.json`。
- **每本书独立目录**：以 `${book.hash}/` 散列值隔离存放：
  - `${book.hash}/${title}.${ext}`：原始书籍文件。
  - `${book.hash}/cover.png`：封面缓存。
  - `${book.hash}/config.json`：存放 `BookConfig`，内含阅读进度（`progress`、`cfi`）、个性化排版配置，以及该书的所有批注列表（`booknotes: BookNote[]`）。
  - `${book.hash}/search.db`：单个书籍的专属 SQLite 数据库，存储全文分段文本与折叠后的搜索字段（folded text），极大加快全局搜索且不污染整库。
- **批注结构 (`BookNote`)**：
  ```ts
  export interface BookNote {
    id: string; // 唯一 UUID
    type: 'bookmark' | 'annotation' | 'excerpt' | 'notebook' | 'ink';
    cfi: string; // 规范化 CFI
    page?: number;
    text?: string; // 原文高亮摘录
    style?: HighlightStyle; // highlight / underline / squiggly
    color?: HighlightColor; // red / yellow / green / blue / violet
    note: string; // 用户手写批注正文
    createdAt: number;
    updatedAt: number;
  }
  ```
- **结论**：原有数据模型已经具备 UUID、CFI 定位与手写笔记字段；新增认知分类（thought/question/critique 等）只需在 `note` 扩展或扩展类型枚举即可，无需推倒原有存储结构。

### 2.3 查词与多 Provider 系统
- **代码路径**：`apps/readest-app/src/services/dictionaries/`。
- **格式与生态**：
  - 离线：原生实现 `stardictReader.ts` (StarDict)、`slobReader.ts` (Aard 2 Slob)、`bglReader.ts` (Babylon)，并通过 `packages/js-mdict` 支持 `MDict` (.mdx/.mdd)，支持 Yomitan 字典包。
  - 词形还原：内置 `lemmatize/` 支持英语不规则动词与屈折变化（如 running → run）。
  - 在线搜索：内置 `webSearchTemplates.ts`，原生支持 `%WORD%` 和 `%25WORD%25` 占位符 URL 模板，预置 Google、Urban Dictionary、Merriam-Webster、Goodreads 等。
- **结论**：已 100% 满足并超越计划书中 R-003 的功能要求。

### 2.4 网页剪藏与离线转换系统
- **代码路径**：`apps/readest-app/src/services/send/conversion/`。
- **核心流程**：
  - 接收 URL 或 HTML 片段。
  - 调用 `@mozilla/readability` 进行主体正文提取，并调用 `sanitizeHtml` 移除危险脚本与内联样式。
  - 通过 `assetBundler.ts` 抓取远程图片并本地化。
  - 通过 `buildEpub.ts` 和 `coverGenerator.ts` 动态打包生成单文件规范离线 EPUB，直接导入本地书库。
- **结论**：设计高度契合 ADR-001 決议，网页文章可无缝复用 Foliate 阅读器全部能力。

### 2.5 批注导出系统现状
- **代码路径**：`apps/readest-app/src/utils/note.ts`。
- **现状**：
  - 已支持 Markdown、Plain Text、JSON 格式导出。
  - 内部集成了 **Nunjucks (Jinja2 兼容)** 模板引擎，支持 `customTemplate` 自定义渲染。
  - 提供了单条批注 Obsidian 友好格式拼接（`buildAnnotationCopyMarkdown`）。
- **待增强点（本项目切入点）**：
  - 增强为符合《ADR-001》规范的 YAML Frontmatter 与 Obsidian Callout 语义块模板。
  - 增设通用“一键导出 Markdown 文件至本地存储”及“调用 Android 系统分享（Share Sheet）导出”入口。

### 2.6 Android 原生集成与权限
- **代码路径**：`apps/readest-app/src-tauri/gen/android/`。
- **清单配置 (`AndroidManifest.xml`)**：
  - 权限声明：`INTERNET`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, `MANAGE_EXTERNAL_STORAGE`。
  - 系统分享 Intent Filter：配置了 `android.intent.action.SEND` 与 `SEND_MULTIPLE`（mimeType `*/*`），可直接接收外部浏览器分享的链接与文件。
  - 文件关联：关联了 `.epub`, `.pdf`, `.mobi`, `.azw3`, `.txt`, `.md` 等全系列文件后缀。
  - Deep Link：已声明 `readest://` 原生 URL scheme。

---

## 3. 商业功能与付费边界审计

上游代码中的 `UserQuota`（配额控制）定义于 `src/types/quota.ts`：
- **云端服务**：Readest Cloud 存储空间、DeepL 官方翻译 API 中继、云端 AI Token、云端设置备份。这些功能涉及官方托管服务器成本，属于订阅项。
- **本地纯离线功能**：
  - 本地导入与书库管理：**完全免费无限制**。
  - Foliate 阅读排版、高亮与批注：**完全免费无限制**。
  - 离线 StarDict/MDict 词典查询与自定义 URL Web 搜索：**完全免费无限制**。
  - 网页转离线 EPUB 剪藏：**完全本地执行，免费无限制**。
  - Markdown/JSON 本地笔记导出：**完全本地执行，免费无限制**。
- **合规承诺**：Dasein Reader 绝不破解或绕过 Readest Cloud 的任何服务端验证，严格专注于本地数据自主权与离线知识闭环。

---

## 4. 许可证合规审计 (AGPL-3.0)

1. **主许可证**：Readest 根目录下标示 **GNU Affero General Public License v3.0 (AGPL-3.0)**。
2. **合规义务**：
   - Fork 仓库必须同样以 AGPL-3.0 许可证开源并保留完整原始版权声明与 NOTICE。
   - 若对外公开发布修改版 APK，必须向用户公开对应修改版本的源代码。
   - 必须替换应用名称（由 Readest 更名为 Dasein Reader）与品牌图标，避免侵犯上游商标权益或造成官方背书假象。
3. **第三方依赖**：`foliate-js`（GPL-3.0）、`@mozilla/readability`（Apache-2.0）、`js-mdict`（MIT），与 AGPL-3.0 兼容无冲突。

---

## 5. 最终审计结论与实施路线选定

### 结论：坚决采纳【路线 A：Fork Readest + 小范围扩展模块】
- Readest 的成熟度远超预期：其阅读引擎、本地分书目录存储、全格式离线词典、URL 搜索模板、网页 Readability 转 EPUB 等核心链路已高度完备。
- 从零重写（路线 C）或做伴侣应用（路线 B）都将白白耗费数月甚至无法达到此等排版品质与稳定性。
- 实施重心高度聚焦：**在保留 95% 上游核心能力的基础上，剥离商业云依赖，增强本地 SQLite 批注管理、完善认知分类体系，并交付精美的 Markdown/JSON 手动导出能力。**
