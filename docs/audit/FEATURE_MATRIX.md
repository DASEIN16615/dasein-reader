# 功能对照与成熟度矩阵 (FEATURE_MATRIX)

- **基线版本**：Readest `v0.12.16` (commit `5b3f854`)
- **审计日期**：2026-11-05
- **标记规则**：
  - `已原生支持`：上游代码已完整实现且设计符合项目愿景，无需额外改写。
  - `部分支持`：上游已具备底层骨架或初级功能，仅需小范围扩展/定制即可满足。
  - `不支持`：上游无直接对应实现，需由本项目新增独立模块交付。
  - `未验证`：需要进一步在真实 Android 物理设备上运行验证。

---

| 编号 | 需求特性名称 | 上游成熟度状态 | 上游对应代码路径 / 证据 | Dasein 演化改造策略 |
| :--- | :--- | :---: | :--- | :--- |
| **R-001** | **本地书库与全格式导入** | `已原生支持` | `apps/readest-app/src/services/bookService.ts`<br>`packages/foliate-js/` | 原生支持 EPUB, PDF, MOBI, AZW3, CBZ, FB2, TXT, MD, HTML 等全格式。文件以 `${book.hash}/` 目录独立存储。直接复用。 |
| **R-002** | **移动端核心阅读体验** | `已原生支持` | `packages/foliate-js/`<br>`src/pages/reader/`<br>`src/services/settingsService.ts` | 完整支持分页/平滑滚动、目录跳转、自定义字体字号、深色/夜间主题、CFI 锚点与进度记忆。直接复用。 |
| **R-003** | **多源查词与 Web 搜索** | `已原生支持` | `src/services/dictionaries/`<br>`stardictReader.ts`, `js-mdict`<br>`webSearchTemplates.ts` | 原生内置 StarDict、MDict、BGL、Slob 离线解析引擎与词形还原（lemmatization）；支持 `%WORD%` 模板自定义在线搜索。直接复用。 |
| **R-004** | **高亮、批注与定位管理** | `部分支持` | `src/types/book.ts` (`BookNote`)<br>`src/utils/book.ts` (`config.json`) | 原生支持多色高亮、独立文字批注与精确 CFI/PDF 坐标回跳。**改造点**：在批注界面扩展 6 种认知分类标签（quote/thought/question/critique/connection/todo）。 |
| **R-005** | **通用 Markdown / JSON 导出** | `部分支持` | `src/utils/note.ts`<br>`renderNoteTemplate` (Nunjucks) | 原生支持基于 Nunjucks 的自定义模板导出。**改造点**：内置符合《ADR-001》规范的 YAML Frontmatter 与 Obsidian Callout 模板，并增加一键保存至 Downloads 或调用系统分享菜单导出。 |
| **R-006** | **数据自主备份与恢复** | `已原生支持` | `src/services/backupService.ts`<br>`src/utils/backup.ts` | 原生提供完整书籍与设置配置的 Zip 打包导出与一键导入恢复机制。直接复用。 |
| **R-101** | **网页剪藏与稍后读 (EPUB化)** | `已原生支持` | `src/services/send/conversion/`<br>`convertToEpub.ts`, `buildEpub.ts` | 原生利用 `@mozilla/readability` 清洗正文、抓取本地化图片并打包为标准离线 EPUB，直接纳入阅读书库。直接复用。 |
| **R-102** | **全局全文与笔记搜索** | `已原生支持` | `src/services/database/migrations/index.ts`<br>`search.db` (`library-search`) | 原生为每本书构建轻量 SQLite 搜索索引数据库（`search.db`），支持秒级全文折叠匹配。直接复用。 |
| **R-103** | **生词本沉淀与词汇复习** | `部分支持` | `src/services/dictionaries/dictionaryService.ts` | 上游具备查词记录与高频词汇能力。**改造点**：增设一键“收藏生词”面板，将原句与释义记录至本地并支持一键导出 Markdown。 |
| **R-104** | **可选 AI 辅助（划词即时分析）** | `部分支持` | `src/services/database/migrations/index.ts` (`reedy`)<br>`src/services/ai/` | 上游已具备内部 Agent 架构（Reedy）。**改造点**：严格约束为划词弹出式即时辅助，采用自带 Key（BYOK），明确请求外发确认机制。 |
| **SYS-01** | **Android 原生 Intent 与构建** | `已原生支持` | `src-tauri/gen/android/AndroidManifest.xml`<br>`.github/workflows/release.yml` | 已预置 Android `ACTION_SEND`（分享接收）与文件关联支持，GitHub Actions 具备成熟的 Android arm64 交叉编译流程。直接复用。 |

---

## 结论汇总

- **原生满足度**：核心计划书中 **约 80% 的繁重工作**（包括复杂的 EPUB/PDF 渲染引擎、排版系统、离线词典格式解析、网页 Readability 转 EPUB 以及 Android 系统 Intent 接收）在上游均已有高质量的原生落地。
- **实施准入门槛**：本项目只需聚焦在约 **20% 的认知化定制与体验打磨**：
  1. 笔记模型的认知分类扩展（quote, thought, question 等）；
  2. 导出模块的 Obsidian 友好模板固化与 Android 本地文件/分享投递；
  3. 生词本独立汇总卡片；
  4. 应用品牌去商业化与 Dasein Reader 命名独立。
