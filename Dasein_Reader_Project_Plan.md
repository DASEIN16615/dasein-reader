# Dasein Reader：个人阅读与知识管理系统

> 项目计划书 / 技术需求规格说明书（PRD + 初步架构 + 实施路线）  
> 版本：0.9  
> 日期：2026-11-05  
> 目标执行环境：Google Antigravity（可使用 Gemini / 其他已配置编码 Agent）  
> 项目定位：以 Android 为主要阅读终端、以个人数据自主权为基础、以 Obsidian 为长期知识库的开源个人阅读系统。

---

## 0. 给执行 Agent 的最高优先级指令

本项目不是要求从零编写 EPUB/PDF 阅读器。**第一阶段必须审计 Readest 当前 upstream 仓库，并确认能否以 Fork + 小范围扩展实现目标。** 不允许在未完成审计前重写阅读引擎、数据库、文件导入或批注系统。

建议上游：<https://github.com/readest/readest>  
官方文档：<https://www.readest.com/docs>  
架构文档：<https://github.com/readest/readest/blob/main/apps/readest-app/docs/architecture.md>

截至本计划书日期，Readest 官方文档已描述以下现成能力：EPUB/PDF/MOBI/AZW3/FB2/CBZ/TXT/Markdown 等格式；Android、桌面、Web 多平台；高亮、批注、书签、全文检索；Wiktionary/Wikipedia、StarDict/MDict/Yomitan 词典、自定义 URL 搜索；Android 分享网页并将文章保存为 EPUB；注释导出 Markdown/TXT/JSON；Readest Cloud 和第三方存储同步选项。请以执行时仓库当前 `main` 分支、Release 和文档为准再次验证，不要把本计划书中的任何功能列表当作永久不变的现状。

### 0.1 第一条硬性规则：先审计、后编码

在修改任何源文件之前，先完成以下工作并形成 `docs/audit/BASELINE_AUDIT.md`：

1. 克隆 upstream，记录审计日期、分支、commit SHA、Release 版本。
2. 阅读根目录 `README`、`LICENSE`、`CONTRIBUTING`、`SECURITY`、`package.json`、锁文件、`apps/readest-app/docs/architecture.md`、`code-layout.md`、Android 构建文档。
3. 绘制当前模块结构，识别阅读器、注释模型、词典、网页剪藏、导入、导出、数据库、同步和 Android Share Intent 的现有实现位置。
4. 安装官方 Android Release，至少在一台真实 Android 手机上试用；不要仅凭桌面 Web 模式推断手机体验。
5. 对本计划中的每项功能标记：`已原生支持 / 部分支持 / 不支持 / 未验证`，并附代码路径、官方文档或实测证据。
6. 运行 upstream 的现有 lint、typecheck、test、Android build（可用的项目脚本），记录基线结果。不得把 upstream 原有失败归咎于本项目改动。
7. 审计 Android 文件权限、Storage Access Framework、分享 Intent、离线存储、导出文件位置、应用后台限制。
8. 审计 Readest 的许可证和每项将被复用的依赖许可证。Readest 仓库标示 AGPL-3.0；必须确认 Fork、修改、分发 APK、提供网络服务时的合规义务。不得移除版权、许可证、NOTICE 或上游来源声明。
9. 审计现有功能的付费门槛。不得通过修改客户端代码绕过 Readest 付费校验或服务器授权。若所需功能属于付费项，应选择合法的一次性购买、独立实现可替代功能、或调整产品边界。
10. 提交审计报告后才进入方案决策。

### 0.2 审计后的路线决策

按以下优先级选路线，并在 `docs/DECISION_RECORDS/ADR-001-architecture.md` 中说明理由：

- **路线 A（默认首选）：Readest Fork + 扩展模块。** 如果当前 Readest Android 版本稳定、核心功能满足需求且许可证与维护成本可接受，则保留 Foliate/Readest 阅读引擎、现有注释模型、词典和剪藏能力，只新增本地知识库、Obsidian 导出/同步、个人数据备份、工作流整合。
- **路线 B：独立 companion app / sidecar。** 如果直接改 Readest 侵入性太强，或希望保持 upstream 更新能力，则开发独立 Android 配套应用/插件，通过导出文件、分享 Intent、公开 API 或稳定数据格式与 Readest 交互。不可依赖未承诺稳定的内部 API；需要实现适配层。
- **路线 C：独立阅读器。** 只有在审计证明 A、B 均无法达到关键需求时才考虑。必须复用成熟阅读引擎/解析库；不得自行从零实现 EPUB CFI、分页排版、PDF 渲染和批注锚定。

默认路线是 A，但必须由审计结果确认，而不是无条件 Fork。

---

## 1. 项目愿景与最终目标

### 1.1 愿景

建设一个面向个人长期阅读、学习和研究的工具链。用户能够在 Android 手机上阅读本地电子书、专业教材、论文、网页文章和外语材料；查词、检索俚语、保存摘录、添加自己的批注；最终将重要材料沉淀为可长期迁移、可全文检索、可被 Obsidian 管理的 Markdown 知识资产。

系统不以书友社交、排行榜、推荐算法、会员书城或商业版权内容聚合为目标。书籍来源由用户自行管理，系统不提供盗版书库、不移除 DRM、不绕过付费墙。

### 1.2 最终用户体验

目标工作流：

1. 用户通过 Android 文件选择器、系统分享菜单、浏览器剪藏或自建 OPDS/Calibre 服务，将 EPUB/PDF/网页文章导入个人书库。
2. 手机中完成舒适的阅读、全文检索、章节导航、字体/主题/亮度设置和离线阅读。
3. 用户长按词语或短语，可同时使用离线词典、在线词典、搜索引擎和俚语网站；查词不应强制切换出阅读上下文。
4. 用户选中句子或段落，可以高亮、加下划线、创建批注，并把笔记标记为“摘录 / 观点 / 疑问 / 反驳 / 联系 / 待查”。
5. 重要摘录和笔记可自动导出为 Obsidian Vault 中的 Markdown 文件，带来源、章节、定位信息、标签和双链。
6. 网页文章可通过 Android 分享菜单/浏览器扩展剪藏为离线可读内容，并以相同方式批注和沉淀。
7. 用户不依赖某一服务商账户即可保有原始书籍和知识文件；换手机、换阅读器或停止维护本项目，仍能读取 Markdown、JSON、原文件及备份。

### 1.3 成功标准

项目交付的成功不以“功能数量”衡量，而以以下闭环是否可靠为准：

- 阅读闭环：导入 → 打开 → 阅读 → 记忆进度 → 离线再次打开。
- 查词闭环：选词 → 查询离线/在线资源 → 保留阅读上下文 → 可选择保存词条。
- 笔记闭环：选择文本 → 高亮/批注 → 导出 Markdown → 在 Obsidian 中可读、可编辑、可检索。
- 网页闭环：分享 URL → 提取正文 → 生成离线文章 → 阅读与批注 → 导出知识笔记。
- 迁移闭环：完整备份 → 清空或换设备 → 恢复数据 → 书籍、批注和定位关系可验证。

---

## 2. 用户画像与核心约束

### 2.1 主要使用者

单人个人用户，Android 手机是主要阅读设备；Windows 电脑主要承担文件整理、项目维护和少量知识管理，不假定用户经常在电脑上阅读。用户阅读类型包括：

- 社科、哲学、历史、经济学、马克思主义原著等出版书；
- 计算机专业教材、技术文档、论文和 PDF；
- 英文及其他外文材料，包含习语、俚语和上下文义项；
- 小说、文学及一般 EPUB/TXT 内容；
- 浏览器中的长篇文章、技术博客、新闻分析和公开网页资料。

### 2.2 优先级约束

1. Android 体验优先于桌面体验。
2. 本地可用优先于依赖云端；断网时仍能阅读、看已有笔记、使用已安装离线词典。
3. 开放格式优先于封闭数据库；Markdown、JSON、原始 EPUB/PDF 必须可导出。
4. 用户控制数据优先于平台账号；不得把个人笔记锁在开发者服务器中。
5. 保持上游可更新优先于深度改造；尽量通过模块化适配器扩展。
6. 低维护成本优先于功能堆叠；MVP 不开发社交、推荐、复杂 AI Agent 和自建商业书城。

---

## 3. 产品范围与功能需求

### 3.1 P0：MVP 必须交付

#### R-001 本地书库与导入

- Android 支持通过系统文件选择器/SAF 导入单个或多个文件。
- 支持 Android 系统分享菜单将文件交给应用。
- 优先格式：EPUB、PDF、TXT、Markdown、HTML；若上游已支持 MOBI/AZW3/FB2/CBZ，则保留其能力。
- 保留原始文件，不得因解析失败覆盖或删除源文件。
- 书库支持标题、作者、格式、导入时间、阅读状态、标签、最近阅读等基本元数据。
- 重复导入应识别重复文件或提供明确提示，不得静默覆盖批注。
- 导入失败应展示具体文件和原因，不得只显示笼统的“失败”。
- 支持应用内部文件存储和用户指定文件夹；若使用“原位阅读”，必须明确提示删除行为会不会影响原文件。

#### R-002 阅读体验

- EPUB：分页与连续滚动模式；字体、字号、行高、段间距、页边距、主题、背景、横竖屏等设置。
- PDF：页码导航、缩放、适配宽度/页面、文本选择；文本型 PDF 支持高亮和批注。
- 阅读进度自动保存，异常退出后尽量恢复最后位置。
- 目录、书签、书内全文搜索。
- 夜间模式和低亮度阅读；界面操作不应遮挡主要正文。
- 断网阅读已下载的书籍和已有批注。
- 长按、选择文本、弹出操作栏必须在常见 Android 屏幕尺寸下可用。

#### R-003 查词与搜索

- 支持单词、短语和用户选择的整句查询。
- 多 Provider：系统词典（可用时）、离线词典、Wiktionary/Wikipedia、用户自定义 URL 搜索模板。
- 自定义搜索模板支持 `%WORD%` 占位符；至少能配置 Google、Bing、Merriam-Webster、Urban Dictionary 等目标；目标站点可用性由用户所在地网络决定。
- 查询词必须进行 URL 编码，不能直接拼接未经处理的输入。
- 离线词典至少沿用上游已支持的 StarDict、MDict、Yomitan 等格式；先验证 Android 端导入、索引、资源显示和内存表现。
- 对词形变化提供可选基础词回退（如 running → run），不能错误地把短语强制拆词。
- 结果以抽屉/浮层/卡片呈现，返回阅读时恢复原位置。
- 区分“查词结果”和“翻译结果”；翻译默认不自动保存，用户明确点击保存后才写入笔记。

#### R-004 高亮、批注和阅读笔记

- 高亮至少支持多颜色/样式（沿用上游能力即可）。
- 可对选中内容添加独立文字批注。
- 笔记类型：`quote`（摘录）、`thought`（观点）、`question`（疑问）、`critique`（反驳/批判）、`connection`（联系）、`todo`（待查）。
- 每条注释保留：源书籍 ID、标题/作者、章节、原文摘录、注释正文、创建/修改时间、颜色、定位信息、内容指纹。
- 支持查看当前书籍全部笔记，并可跳回原文位置。
- 删除、编辑和批量导出前应提供合理的撤销或确认机制。
- 不能因修改字体、行距或屏幕方向而使 EPUB 注释错位；PDF 注释应保持在正确页和坐标。

#### R-005 Obsidian Markdown 导出

- 用户可以指定 Obsidian Vault 对应目录，或通过 Android 文件选择器选择目标目录（需确认 SAF 持久授权的可行性）。
- 最低要求为手动导出；推荐进一步支持“保存批注时自动/排队导出”。
- 每本书生成一个 Markdown 文件，或按书籍/章节拆分；具体策略可配置，默认每本书一个文件。
- 使用 YAML frontmatter，包含稳定 ID、title、author、format、source file/hash、created、updated、tags、status。
- 每条摘录以 Markdown blockquote 呈现，注释紧随摘录；保留章节、页码/定位信息。
- 采用稳定注释 ID，重新导出时更新对应条目，不能不断追加重复摘录。
- 导出过程必须幂等：同一数据连续导出两次，不能生成重复笔记或覆盖用户手工修改的正文。
- 将阅读器自动生成内容与用户手工编辑内容分区；同步时不得覆盖用户编辑区域。
- 支持 Markdown、JSON、纯文本全量导出；原始 EPUB/PDF 可单独备份。

#### R-006 基础备份与恢复

- 支持导出完整备份包：书籍文件（可选）、数据库/元数据、批注、词典设置、搜索模板、阅读进度、配置。
- 备份格式须有版本号、manifest、文件清单和校验哈希。
- 恢复前预览备份版本、文件数和大小；恢复前自动创建当前状态备份。
- 数据迁移不能依赖开发者账户或不可控云服务。

### 3.2 P1：MVP 稳定后开发

#### R-101 网页正文提取与稍后阅读

- Android 分享 URL 到应用：优先复用 Readest 已有分享接收和剪藏能力。
- 浏览器扩展（Chrome/Edge/Firefox 等）只在确认手机场景收益和上游支持情况后决定是否开发；Android 用户优先走系统分享菜单。
- 剪藏生成 HTML/EPUB/Markdown 文章，保留标题、作者（如能提取）、来源 URL、发布日期（如能提取）、抓取时间、主图及必要图片。
- 正文提取优先采用成熟 Readability 类库，清除导航、广告、弹窗、脚本和非正文内容。
- 保留引用来源和原始 URL；用户点击“打开原网页”时回到原网页。
- 对登录墙/付费墙内容：仅允许通过用户已登录的浏览器会话或用户明确分享的可访问内容采集；不破解访问控制、不绕过付费或 DRM。
- 长网页、动态网页、图片懒加载和站点反爬会造成不完整提取，必须展示失败或不完整状态，不能声称完整保存。

#### R-102 全局知识检索

- 对用户自己的笔记、摘录、书籍元数据和剪藏文章建立本地全文索引。
- 优先复用现有数据库能力；若需要独立索引，使用 SQLite FTS5 或上游适配的搜索机制，禁止无理由引入多套数据库。
- 支持关键词、标题、作者、标签、笔记类型过滤。
- 查询结果可回到原书/原文章定位；如果源文件缺失，应展示“原文文件不可用”，而不是伪造定位。

#### R-103 生词本与表达收藏

- 用户可以把单词/短语保存为词条，关联原句、来源书籍/文章、词典释义、自己的解释、标签。
- 支持手动复习状态（新词、学习中、掌握）。
- 暂不自行开发复杂 SRS；如确有需要，再研究 Anki 导出或标准 CSV/JSON。

#### R-104 可选 AI 辅助

- 只有在 P0/P1 核心流程稳定后开发。
- AI 功能：解释句子、辨析近义词、解释俚语语境、提出阅读问题、将用户自己的批注整理成主题草稿。
- 默认只把用户明确选择的片段发送给模型；必须展示即将发送的数据和目标提供商。
- 允许配置 OpenAI-compatible API、Gemini、DeepSeek、OpenRouter 或本地兼容端点；不要把 API Key 写入源码、日志或普通明文备份。
- AI 输出必须标记为“模型生成”，不得自动混入用户自己的观点或自动改写原始摘录。
- AI 不应替用户自动总结整本受版权保护的书或输出大量原文。

### 3.3 P2：未来探索，不进入第一版

- 多设备实时协同编辑。
- 复杂知识图谱/实体抽取。
- 社交、书友动态、排行榜、书城和推荐算法。
- OCR 全量扫描书籍处理。
- 自动抓取/索引任意网站或爬取付费内容。
- 自动化 AI Agent 代替用户阅读、批注和形成观点。
- 自建大型云端账号体系、支付系统和公共 SaaS 服务。

---

## 4. 非功能需求

### 4.1 隐私与数据自主权

- 本地优先（local-first）：不登录账户也能完成基础阅读、批注、查离线词典、导出。
- 不默认上传书籍文件、全文、批注或词典；每一种网络请求都应有明确用途。
- 外部字典/翻译/AI 服务需要清晰提示：查询词或文本片段可能被发送给第三方。
- API Key 使用 Android Keystore 或上游安全凭证存储；不得写到 Markdown 笔记、普通日志或 Git。
- 提供遥测开关；默认关闭非必要分析事件。若上游遥测不能关闭，应在审计报告中说明并决定是否保留。
- 用户可导出和删除全部个人数据。

### 4.2 可靠性

- 任何批注保存都应有事务/原子性保证。
- 崩溃、强制关闭、低内存、重启后不得静默丢失已确认保存的笔记。
- 导出失败需保留待导出状态并允许重试。
- 同步发生冲突时不可直接使用“最后写入覆盖”处理所有冲突；需保存版本或提供冲突副本。
- 备份包可校验、可恢复，并进行至少一次真实恢复测试。

### 4.3 性能

- 中端 Android 设备可流畅翻页、滚动和划词。
- 大型 EPUB 打开和章节跳转不应明显卡死 UI。
- 离线词典索引不应一次性把整个词典载入内存；需评估内存峰值和冷启动时间。
- 长 PDF 的文本选择、缩放和页码跳转需稳定。
- 书库几千册时应避免一次性加载全部封面位图。

### 4.4 可移植性

- 主要笔记格式为 Markdown；结构化导出为 JSON。
- 原始书籍文件与阅读器数据库分离保存。
- 每个实体应有稳定 UUID；不可仅靠文件名或书名识别书籍。
- 定位信息同时保留机器可用锚点和人类可读回退文本。
- 书籍更新或替换后，旧批注应可识别是否失效，而非错误地附着到相似文本。

### 4.5 可维护性

- 新功能按独立 service/adapter 实现，不在 Reader 页面堆积所有逻辑。
- 上游更新时尽量避免大面积冲突；所有新增功能有单独测试。
- 关键决策写入 ADR；数据库 schema 迁移有版本号和回滚/备份策略。
- 提供可复现构建流程、开发环境说明和发布说明。

---

## 5. 初步技术架构

### 5.1 总体架构原则

以 Readest 当前架构为基线（如审计确认）：TypeScript/React 前端、Tauri v2 原生容器、Foliate 阅读引擎、现有服务层/状态管理/数据库和 Android 能力。上游架构文档描述了移动端/桌面 Tauri、Web Next.js、共享 React UI、Foliate、服务层以及原生桥接。执行 Agent 必须复核仓库当前实现，不得照搬过时目录结构。

建议逻辑分层：

```text
Android UI / Reader UI
        |
        +-- Reader Engine Adapter (保留上游阅读引擎)
        |
        +-- Domain Services
        |      +-- LibraryService
        |      +-- AnnotationService
        |      +-- DictionaryService
        |      +-- WebClipService
        |      +-- KnowledgeExportService
        |      +-- BackupRestoreService
        |      +-- SearchIndexService
        |
        +-- Persistence Adapters
        |      +-- Upstream DB / Annotation Store
        |      +-- Local File Store (SAF / app-private files)
        |      +-- Markdown Vault Adapter
        |      +-- Optional Sync Adapter (WebDAV / S3 / user-selected sync folder)
        |
        +-- Tauri / Android Native Bridge
               +-- Android Share Intent
               +-- SAF folder permission
               +-- File picker / file provider
               +-- Secure credential storage
               +-- Deep links / notifications (if needed)
```

### 5.2 推荐模块边界

#### A. Reader Core

- 负责 EPUB/PDF/TXT/HTML 等内容渲染、分页、目录、定位和基础注释。
- 优先复用 Readest 当前实现及 Foliate，不重写。
- 对外暴露经过审计的 reader adapter：`openDocument`、`getCurrentLocator`、`resolveLocator`、`createAnnotation`、`searchInDocument` 等概念接口。实际命名以现有代码为准。

#### B. Dictionary & Lookup

- Provider interface：`id`、`name`、`type`、`lookup(query, language, context)`、`isOffline`、`settingsSchema`。
- Provider 分类：离线词典、在线词典、Web Search、翻译服务。
- Web Search 模板持久化为配置，不将查询词拼接进任意可执行内容。
- 记录最近查询可以关闭；默认不建立用户查询历史云端记录。

#### C. Annotation & Reading Notes

- 不创建与上游完全平行的注释模型；先评估并扩展上游 Annotation canonical model。
- 如果上游注释模型不能承载用户分类/关系，则通过 sidecar metadata 表扩展，不篡改原有定位结构。
- 原文摘录、注释正文和用户自己的知识观点必须区分字段。

建议逻辑字段：

```ts
interface ReadingNote {
  id: string;                 // UUID，跨导出稳定
  sourceId: string;           // book/article stable ID
  sourceType: 'book' | 'article' | 'pdf' | 'web';
  noteType: 'quote' | 'thought' | 'question' | 'critique' | 'connection' | 'todo';
  selectedText?: string;     // 原文摘录
  body: string;               // 用户批注/思考
  locator?: Locator;          // EPUB CFI / PDF page+rect / text anchor
  chapter?: string;
  color?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  contentHash?: string;       // 用于检测源内容更换
  exportState?: 'pending' | 'synced' | 'error';
}
```

`Locator` 需基于上游模型适配，示意而非强制代码：

```ts
type Locator =
  | { kind: 'epub'; cfi?: string; quote: string; prefix?: string; suffix?: string }
  | { kind: 'pdf'; pageIndex: number; pageLabel?: string; rects?: number[][]; quote?: string }
  | { kind: 'html'; selector?: string; quote: string; prefix?: string; suffix?: string };
```

注意：EPUB 不能只保存页码，因为字体、字号、分页方式会改变页面；PDF 不能只保存文本，因为同一文本可能在多处出现；需要结合页号和坐标。原文 quote + prefix/suffix 可作为锚点失效后的回退匹配信息。

#### D. Knowledge Export / Obsidian Adapter

- 输入：书籍/文章元数据、摘录、注释、定位、标签。
- 输出：用户指定 Vault 下的 Markdown 文件、可选 JSON sidecar。
- 使用稳定文件名：`Books/<safe-title>--<short-id>.md`、`Articles/<date>-<safe-title>--<short-id>.md`；标题清洗时防止路径穿越和重名冲突。
- YAML 值正确转义，避免用户标题/标签破坏 frontmatter。
- 写文件采用临时文件 + 原子替换（Android SAF 可用能力需单独验证）。
- 自动导出采用队列和重试机制；手动编辑的正文不允许被无条件覆盖。
- 用户可以设置：自动导出全部批注 / 仅导出收藏 / 仅手动导出。

Markdown 建议模板：

```markdown
---
id: "<stable-uuid>"
type: book
status: reading
title: "书名"
author: "作者"
format: epub
source_hash: "..."
created: 2026-11-05
updated: 2026-11-05
tags: [reading, philosophy]
---

# 书名

## 阅读摘录

> 原文摘录……

<!-- dasein-note:id=<annotation-uuid> -->
**我的观点**：……

- 章节：……
- 定位：……
- 类型：thought

## 待思考问题

- [ ] ……

## 延伸联系

- [[某个主题笔记]]
```

以上为建议模板。实现时必须解决“自动生成区”和“用户手工编辑区”的边界。可以用固定标记包围自动生成区域，或维护 sidecar manifest；不能依赖脆弱的正则表达式覆盖整份文件。

#### E. Web Clip / Article Ingestion

- Android：接收 `ACTION_SEND` / `ACTION_SEND_MULTIPLE` 等系统分享内容，准确处理 URL、纯文本、HTML 和文件 Uri；具体 Intent 类型以 Android 实测为准。
- 优先复用 Readest 现有 Share Sheet / Send to Readest / Web Browser 剪藏流程。
- 正文提取：成熟 Readability parser + DOM 清理 + 相对 URL 转绝对 URL + 图片资源本地化（可选）。
- 文章对象保存 `canonicalUrl`、`originalUrl`、`capturedAt`、`title`、`author`、`siteName`、`publishedAt?`、`contentHash`。
- 如果只是保存 URL 而未实际保存正文，UI 必须标明“网页链接”，不能误标为离线文章。

#### F. Persistence / Sync

- 首选复用上游数据库和数据服务；新增数据通过受控 schema migration 管理。
- 本地书籍文件优先放应用私有存储或用户指定 SAF 目录；导出 Vault 独立于应用私有目录。
- 第一版不开发自有实时云同步引擎。
- 先支持可靠的本地导出、备份和恢复；之后根据需求增加 WebDAV / S3 / Syncthing 等互操作方式。
- 如果使用文件夹同步（Syncthing、Nextcloud、Obsidian Sync 等），必须警告用户不要让同一个 Vault 同时由多个同步客户端竞争写入。
- 不把 Readest Cloud 作为唯一数据出口；不把付费第三方存储同步标注为免费。

### 5.3 数据流

```text
本地 EPUB/PDF -----------+
Android Share Intent ----+--> Import / WebClip --> Reader Library
Browser extension -------+                         |
                                                    v
                                      Reader / Search / Dictionary
                                                    |
                                      Highlight / Annotation / Notes
                                                    |
                                                    v
                                          Annotation Service
                                                    |
                                  +-----------------+----------------+
                                  |                                  |
                                  v                                  v
                         Local DB / Backup                 Markdown Exporter
                                                                     |
                                                                     v
                                                               Obsidian Vault
                                                                     |
                                                         用户自己的同步工具
```

### 5.4 Android 关键实现注意事项

- 使用系统 Storage Access Framework 让用户选择目录，不假定应用可以任意访问 `/storage/emulated/0/`。
- 持久目录授权需要处理：授权失效、文件夹被移动、云盘 Provider 离线、文件被用户外部修改等情况。
- Android 分享 Uri 可能是 `content://`，不得只按文件路径处理；需要正确读取 ContentResolver/权限标志。
- 分享来的 URL 可能包含追踪参数、登录状态或敏感令牌。写入文章前应进行 URL 清理，但不能删除必要的文章路径参数；不要把 URL 查询参数中的 token 写入 Markdown。
- 后台导出/剪藏不得依赖应用长期驻留；必要时使用受平台限制的 WorkManager/前台任务，并向用户反馈状态。
- Android 版本、WebView 版本、文件权限和 Tauri 插件兼容性需在目标真机验证。

---

## 6. 数据模型与文件组织建议

### 6.1 核心实体

- `Source`：书籍或网页文章。
- `ReadingProgress`：阅读位置、进度、最后打开时间。
- `Annotation`：高亮、摘录、批注及定位。
- `DictionaryEntry`：用户收藏的单词/短语和上下文。
- `Tag`：标签。
- `ExportRecord`：某条数据导出到某个文件的记录、内容哈希、上次导出时间。
- `BackupManifest`：备份包版本、数据版本、文件哈希和创建时间。

必须先检查 Readest 当前数据模型，尽可能复用其 Source/Book、Annotation、Progress 对象，不可无理由另建完全相同的实体。

### 6.2 Obsidian Vault 目录建议

```text
Vault/
├── 00-Inbox/
│   └── Web-Clips/
├── 10-Library/
│   ├── Books/
│   ├── Articles/
│   └── Papers/
├── 20-Notes/
│   ├── Quotes/
│   ├── Vocabulary/
│   ├── Questions/
│   └── Reading-Notes/
├── 30-Topics/
├── 90-Attachments/
└── _DaseinReader/
    ├── manifest.json
    ├── export-state.json
    └── templates/
```

建议默认采用较少层级，避免用户觉得维护目录比阅读更复杂。用户应可修改目录模板。大图和网页图片按需保存；默认不要复制整个书籍文件到 Vault，避免 Vault 膨胀。

### 6.3 稳定 ID 与同步原则

- 所有 Source、Annotation、DictionaryEntry 使用 UUID。
- `title + author` 不能作为唯一键；同名书、不同版本和修订版必须可区分。
- 对书籍文件记录 SHA-256 或上游使用的内容哈希；哈希策略必须明确是整文件还是规范化内容。
- 导出器以 annotation UUID 为幂等键。
- 如果用户在 Obsidian 中编辑自动生成区，下一次同步要检测冲突；优先产生冲突副本/提示用户合并，不可静默覆盖。
- 删除源书籍时，不默认删除已导出的 Markdown 笔记。

---

## 7. 交互设计原则

### 7.1 阅读首页

- 默认进入“继续阅读”和最近书籍，而非复杂仪表盘。
- 清楚显示本地书籍、网页文章、已完成、待读等类别。
- 导入入口必须容易发现。
- 搜索框可在书库元数据、书内全文和个人笔记之间切换。

### 7.2 阅读界面

- 正文区域优先，常驻 UI 尽量少。
- 长按文字后，操作优先级：复制、查词、翻译、高亮、批注、更多。
- 查词结果应支持多个 Provider 切换，不要一次打开多个浏览器窗口。
- 批注输入支持快速保存和取消；保存状态可见。
- 手机单手操作友好，按钮触控区域符合 Android 常见可用尺寸。

### 7.3 笔记界面

- 每条记录能看出原文和自己的思考，不要将二者混为一体。
- 支持按笔记类型、颜色、章节、标签筛选。
- 点击笔记能够定位回书中原文。
- 一键导出当前书籍全部笔记和选中笔记。

### 7.4 设置界面

按模块组织：阅读、词典与搜索、笔记与 Obsidian、网页采集、数据与备份、隐私与网络。避免把所有高级参数堆在一个页面。

---

## 8. 分阶段开发计划与里程碑

不按固定工期承诺，按可验证交付物推进。每个阶段结束必须由测试结果决定是否进入下一阶段。

### Phase 0：可行性与代码审计（Gate 0）

任务：
- 完成第 0.1 节审计清单。
- 真机体验 Readest Android。
- 验证 EPUB/PDF、词典、搜索模板、注释导出、网页剪藏、Obsidian 导出路径。
- 分析 Fork 后构建签名、应用 ID、品牌资源、更新渠道和 upstream 合并方式。
- 输出 ADR-001：Fork / companion / rewrite 决策。

交付：
- `docs/audit/BASELINE_AUDIT.md`
- `docs/DECISION_RECORDS/ADR-001-architecture.md`
- `docs/audit/FEATURE_MATRIX.md`
- upstream 基线测试结果

验收：无代码改动也能清楚回答“哪些功能已满足、哪些不满足、为何必须开发”。

### Phase 1：工程基线和 Android MVP（Gate 1）

任务：
- 建立 fork 仓库，保留 upstream remote，建立自己的 main/develop/feature 分支策略。
- 固定基线 commit 和 Release 标签。
- 在不改变核心 Reader 的情况下，构建可安装 Android APK。
- 更换应用 ID、应用名称、图标和包信息前，先完成许可证/品牌使用审查。
- 验证本地导入、阅读进度、全文搜索、离线阅读、现有批注。

交付：
- 可安装 debug APK
- 开发环境与构建指南
- `CHANGELOG.md`
- CI 基础检查

验收：原有核心功能没有回归；APK 可在目标 Android 真机安装并稳定打开 EPUB/PDF。

### Phase 2：Obsidian 导出闭环（Gate 2，项目核心差异化）

任务：
- 设计 Markdown 模板和稳定 ID。
- 实现单本书手动导出。
- 实现所有摘录/批注导出。
- 实现重复导出幂等更新。
- 验证 Android SAF 目标 Vault 写入、授权持久性和文件更新能力。
- 实现导出失败重试、状态显示和导出冲突处理。

交付：
- `KnowledgeExportService`
- `ObsidianVaultAdapter`
- 数据格式说明和 Markdown 模板
- 手工导出与自动导出设置

验收：同一本书至少 30 条不同类型批注重复导出 3 次，不产生重复条目；在 Obsidian Android 中可打开；用户手工编辑区不会被自动覆盖。

### Phase 3：查词与个人词汇沉淀（Gate 3）

任务：
- 审计上游词典能力及 Android Provider 现状。
- 验证 StarDict/MDict/Yomitan 样例词典。
- 增加/整理自定义 Web Search 管理器。
- 增加词条收藏：原词、词形、释义、上下文、来源、个人笔记。
- 为无法访问的在线网站提供清晰错误状态和替代 Provider。

交付：
- 词典 Provider 配置
- 自定义搜索模板
- 词汇收藏与导出

验收：飞行模式下已安装词典可查词；联网时自定义搜索可正确编码单词和短语；查询失败不丢失阅读位置。

### Phase 4：网页采集与文章阅读（Gate 4）

任务：
- 优先使用 Android Share Intent 接收 URL/HTML。
- 复用/扩展上游剪藏能力；如必要，加入 Readability 提取层。
- 保存原 URL、来源站点、采集时间和正文。
- 将文章作为一种 Source，复用阅读/批注/导出流程。
- 处理图片、相对链接、正文提取失败和网络重试。

交付：
- `WebClipService`
- 网页文章 Source 类型
- 文章阅读/批注/导出工作流

验收：对至少 10 种不同网页结构进行测试，包括技术博客、长篇新闻、纯文本网页、含图文章、动态网页和登录墙页面；每个结果标记完整/部分/失败，禁止静默保存空正文。

### Phase 5：全局搜索、备份恢复和打磨（Gate 5）

任务：
- 建立跨 Source 的个人笔记和摘录检索。
- 实现版本化备份 manifest、校验和恢复向导。
- 完成数据删除、隐私设置、日志脱敏。
- 完成 Android UI/性能/无障碍优化。

交付：
- 全局搜索
- 备份/恢复工具
- 发布候选 APK
- 完整测试报告与用户文档

验收：在另一台设备/干净安装环境恢复备份，比较 Source、Annotation、词典设置、Markdown 输出和文件哈希；差异必须可解释。

### Phase 6：可选 AI 与长期维护

只有核心项目完成后再考虑：
- 上下文解释、俚语语用分析、外语句法解释。
- 观点草稿整理和问题生成。
- 用户主动选择的知识关联建议。
- AI 结果单独标记、可撤销，不自动改写用户笔记。

---

## 9. 测试与验收矩阵

### 9.1 文件格式

- EPUB 2 / EPUB 3、含目录/脚注/图片/复杂 CSS 的 EPUB。
- 普通文本 PDF、双栏 PDF、扫描版 PDF（扫描版仅验证限制，不要求 MVP OCR）。
- TXT、Markdown、HTML。
- 若上游声明支持，抽测 MOBI/AZW3/FB2/CBZ。
- 损坏文件、空文件、超大文件、重复文件、中文路径和特殊字符文件名。

### 9.2 语言与查词

- 简体中文、繁体中文、英文；可选日文。
- 英文词形变化、短语、缩写、俚语、大小写、撇号和连字符。
- 离线词典有资源图片/格式化文本的词条。
- Web Search URL 编码、特殊字符和空查询。
- 网络断开、DNS 失败、站点限流、证书异常。

### 9.3 注释定位

- EPUB 在字号/字体/行距/主题变化后定位仍正确。
- EPUB 章节重排或源文件替换后检测锚点失效。
- PDF 在缩放、旋转、适配宽度后注释显示仍正确。
- 同一摘录在同一书中出现多次，定位不能跳到错误位置。
- 删除和编辑批注后，Markdown 导出结果正确。

### 9.4 Obsidian 集成

- Android Obsidian Vault 目录授权。
- 首次导出、二次导出、离线导出、目标文件删除、目标目录不可用。
- 用户手工修改导出文件后再次同步。
- 中文、英文、日文标题；特殊字符、冒号、斜线、emoji、超长标题。
- YAML frontmatter 正确转义。
- 同名书、同名章节、重复摘录。
- Obsidian 内部链接正常，缺少原书文件时能给出说明。

### 9.5 可靠性与安全

- 低内存、后台被杀、设备重启、存储空间不足。
- 恶意或畸形 EPUB/HTML/PDF；HTML 清理和脚本隔离。
- URL 输入 `localhost`、私有 IP、云元数据 IP、重定向到内网的 SSRF 测试（如果存在服务端抓取）。
- 路径穿越、恶意文件名、YAML 注入、Markdown 链接注入。
- API Key 不出现在日志、崩溃报告和导出文件。
- 备份损坏、哈希不一致和中途取消恢复。

### 9.6 核心质量门槛

- P0 功能必须有自动化测试或明确的真机测试用例。
- 每个 PR 至少运行 lint、typecheck、相关 unit tests。
- 合并前不得增加未经解释的 TypeScript 错误、Rust 编译错误或 Android build 错误。
- 对 Reader Core 的改动必须做 EPUB 与 PDF 回归；不相关的功能不得修改 Reader Core。
- Release APK 必须可安装、签名正确、离线启动并打开已导入的书。

---

## 10. 风险、限制与现实边界

### 10.1 上游功能变化

Readest 是持续更新的项目，目录、API、商业功能边界和数据模型可能改变。所有新增开发前都要检查当前 upstream，不能基于旧版本印象开发。维护 fork 必须保留 upstream remote，定期评估 rebase/merge 成本。

### 10.2 AGPL-3.0 与分发义务

Readest 仓库标示 AGPL-3.0。Fork 后对外分发修改版 APK 或将修改版作为网络服务提供时，应由项目维护者认真履行适用的源码提供、许可证、版权和网络交互条款要求。不能把 AGPL 代码复制进闭源应用后假定没有义务；不能删除上游版权/许可证；不能擅自使用 Readest 商标造成官方背书印象。第三方依赖、图标、字体、样例书籍和字典数据库需分别审查许可证。

本计划书不构成法律意见。对外发布、商业化或采用不同许可证前，应进行正式许可证合规审查。

### 10.3 付费功能和自托管

Readest 当前官方文档说明部分第三方云同步/自定义翻译等功能要求 Plus、Pro 或一次性 Full Customization。项目不能将“代码开源”误解成“服务端功能、托管额度和付费权限全部免费”。

可选路径：
- 个人先用本地文件、Markdown 导出和自己的同步工具；
- 购买上游合法解锁以使用原生功能；
- 在许可证允许范围内独立开发自己的 Vault 导出/备份/同步模块；
- 需要自托管 Readest 后端时，按上游官方部署文档搭建 Supabase、对象存储等依赖，并评估维护成本。

禁止通过移除客户端付费门槛、伪造权益或绕过服务器验证来实现功能。

### 10.4 Obsidian Android 文件访问

Android 的 SAF、Obsidian Vault 目录授权、文件写入和同步插件可能存在限制。原生目录访问不能想当然。Phase 0/2 必须做真机 PoC：选择 Vault、创建 Markdown、更新 Markdown、重启应用后继续访问、同步后文件冲突。若不能稳定写入，退化方案是 Android Share Sheet 导出 Markdown 到 Obsidian，或导出到用户可同步目录。

### 10.5 EPUB 与 PDF 定位差异

EPUB 是可重排版内容，PDF 是固定页面布局。两者的定位模型、文字选择、注释同步和跨设备表现不同。扫描 PDF 可能没有文本层，需要 OCR，而 OCR 准确率、语言支持、成本和隐私风险另行评估。MVP 不承诺扫描 PDF 的准确文字选择。

### 10.6 网页提取不可能百分之百准确

单页文章、动态加载、复杂脚本、登录状态、反爬策略、付费墙和图片懒加载会影响正文提取。用户通过浏览器分享已登录页面时，采集能力取决于系统分享内容/浏览器扩展是否提供 DOM 和资源；不能承诺所有网页完整抓取。禁止绕过访问控制。

### 10.7 第三方词典和搜索站点

词典 API、网站 HTML 结构和访问政策可能变化。Urban Dictionary 等站点不保证稳定、无广告或适合所有内容。搜索引擎可能出现验证码/地区差异。在线查词必须支持用户自定义 Provider，并保留离线词典作为兜底。

### 10.8 数据冲突与同步

多设备同步、Obsidian 同步、WebDAV、Syncthing 和第三方云盘叠加时可能产生冲突副本、重复写入或损坏。第一版不实现复杂实时协同；先做好稳定 ID、幂等导出、冲突检测、备份恢复。不要让两个独立程序同时对同一份数据库文件做实时写入。

### 10.9 AI 成本与隐私

AI API 可能按 token 收费，并可能把所选文本发送到第三方。必须有成本提示、调用开关、文本长度限制、缓存和明确的发送确认。AI 结果不能被当作可靠词典事实或原作者观点。

### 10.10 个人项目的维护成本

最大的长期成本往往不是第一次写代码，而是上游更新、Android 版本变化、依赖安全更新、数据库迁移和打包签名。不要无节制增加功能；每个新增模块都应有明确维护价值和退出路径。

---

## 11. 安全与版权政策

- 不提供盗版电子书搜索、下载或内置资源包。
- 不移除 DRM、不解密受保护电子书、不绕过付费墙/登录验证。
- 用户导入的书籍和网页内容默认仅本地处理。
- 对网页正文提取进行 HTML sanitization，移除脚本、内联事件处理器和危险 URL scheme。
- 如果后端抓取 URL，必须限制协议为 HTTP/HTTPS，拒绝 localhost、内网、环回、链路本地、云元数据地址；检查每次重定向；防止 DNS rebinding；限制下载大小、超时和内容类型。
- 不在日志中记录完整 URL 中的敏感 token、用户全文或 API Key。
- 对书籍封面、插图、网页图片进行文件类型验证和大小限制。
- 备份加密可作为后续功能；若提供加密，必须说明忘记密码无法恢复，不能自创弱加密方案。
- 导出原文摘录时尊重版权，默认只导出用户主动高亮/摘录的片段，不实现整本书批量复制到公开服务。

---

## 12. 工程工作流与 Agent 执行规则

### 12.1 Git 规则

- Fork 后保留 `upstream` remote 指向官方 Readest。
- 开发前创建基线 tag，例如 `dasein-baseline-YYYYMMDD`。
- 每个功能独立分支；每一阶段有可审阅 commit。
- 不允许 Agent 无确认执行 `git reset --hard`、强制 push、删除分支或覆盖用户现有改动。
- 开始工作前执行 `git status`；若工作树不干净，先报告改动归属，不得覆盖。
- 禁止一次性重写大量文件；修改 Reader Core 必须先解释必要性。

### 12.2 Agent 工作节奏

每个任务循环：

1. 读取相关代码和文档，列出理解的现状。
2. 提交小型实施计划和会修改的文件清单。
3. 先写测试或至少定义可验证条件。
4. 小步修改，不顺手重构无关模块。
5. 运行相关测试、typecheck、lint、Android build（适用时）。
6. 检查 Git diff，说明关键变动、测试结果、未解决风险。
7. 更新文档和 CHANGELOG。

遇到上游架构不明、许可证风险、数据迁移风险或测试环境无法验证时，先停止该子任务并报告证据，不得编造已完成。

### 12.3 每阶段 Agent 必须交付

- 代码变更清单。
- 架构/数据模型变更说明。
- 测试命令和真实输出摘要。
- 当前已知限制与未验证事项。
- 可安装 APK（涉及 Android 阶段）。
- 更新后的 README/CHANGELOG/ADR。

### 12.4 禁止事项

- 未审计就从零重写阅读引擎。
- 在客户端写死 API Key、密码、签名密钥或云端凭证。
- 删除或绕过上游付费门槛。
- 用模拟数据冒充真实同步或真实网页抓取。
- 只验证 Web，不验证 Android 真机。
- 将 AI 生成的解释自动写成用户本人的观点。
- 未经测试就声称“Obsidian 双向同步已完成”。
- 将整个 EPUB/PDF 内容不加选择地复制到 Obsidian Vault。
- 大规模改变上游目录/状态管理/数据库，只为了让代码看起来更统一。

---

## 13. 最终交付物清单

### 用户可见交付

- Android arm64 APK（debug 与 release 分开）。
- 可导入 EPUB/PDF/TXT/HTML/Markdown 的书库。
- 可用的阅读、查词、批注和笔记界面。
- Obsidian Markdown 导出/同步工作流。
- 网页剪藏（若纳入 P1）。
- 个人数据备份与恢复工具。
- 用户手册：导入、词典配置、Obsidian Vault 选择、备份、恢复、常见问题。

### 工程交付

- 可复现的源码仓库和 upstream 关系。
- `BASELINE_AUDIT.md`、`FEATURE_MATRIX.md`、ADR。
- 构建、测试、发布文档。
- 数据模型和导出格式规范。
- 单元测试、集成测试、Android 真机验收报告。
- 第三方许可证清单和 NOTICE。
- Release notes、变更记录和已知问题清单。

### 发布标准

- 不以“能启动”作为完成标准。
- 至少通过一轮完整的阅读→批注→Obsidian→备份→恢复验收。
- 发布前检查 APK 签名、包名、权限、网络请求、日志和隐私说明。
- 保留原始书籍和用户笔记的独立导出路径。

---

## 14. 初步决策建议

1. 先把 Readest 官方 Android 版作为对照基线。用真实材料测试：一本 EPUB、一本英文 EPUB、一本专业 PDF、若干网页文章。
2. 由于 Readest 当前已有词典、URL 搜索、批注导出和 Android 网页分享能力，**不要把这些项目列为首轮重写目标**。
3. 项目第一项真正值得开发的差异化能力是可靠的 Obsidian Vault 连接器：稳定 ID、幂等 Markdown 导出、自动导出队列、避免覆盖手工编辑、回链原文。
4. 第二项是统一的网页文章 Source 模型，让网页文章和 EPUB 一样可以阅读、查词、批注和沉淀。
5. 第三项是本地优先的备份/恢复与全局知识检索。
6. 在完成 Phase 0 前，不要创建复杂后端，不要购买 VPS，不要开发账号系统。

---

## 15. 可直接交给 Google Antigravity 的执行提示词

请将本计划书作为项目需求基线。你是本项目的技术负责人和实施 Agent。请严格遵守以下要求：

**当前任务只执行 Phase 0：可行性与代码审计。不要提前进入功能开发。**

1. 克隆并检查 `https://github.com/readest/readest` 当前仓库，记录 commit SHA、版本、许可证和工作树状态。
2. 读取本计划书第 0、5、10、12 节，结合 upstream 当前实际代码，完成 `BASELINE_AUDIT.md` 和 `FEATURE_MATRIX.md`。
3. 对 Android 真实使用流程做验证：本地导入、EPUB/PDF 阅读、长按查词、自定义 Web Search、离线词典导入、批注、Markdown/JSON 导出、系统分享网页、网页离线剪藏。
4. 检查 Obsidian Android Vault 的文件访问可行性。先做最小 PoC：通过 Android SAF 选择 Vault 目录，创建、读取、更新一个 Markdown 文件，并在应用重启后再次访问。不得仅凭桌面文件系统测试推断 Android 可行。
5. 审查 AGPL-3.0 及上游/第三方依赖许可证，说明 Fork、修改、分发 APK、自托管服务的义务和潜在限制。不要移除许可证或绕过任何商业权限控制。
6. 运行 upstream 提供的基础检查和 Android 构建；逐条记录命令、结果、失败原因。
7. 形成路线建议：Fork Readest / companion app / 独立阅读器，并给出证据、改造文件范围、主要风险和维护成本。
8. 结束时只提交审计产物与下一阶段建议，不要做未授权的大规模代码更改。

报告必须明确区分：`已验证`、`从代码推断`、`尚未验证`。不得编造测试成功，不得把官方云端能力等同于免费自托管能力。Phase 0 验收通过后，再开始 Phase 1。

---

## 16. 参考资料与事实核验入口

以下为本计划书编写时核对过的官方入口。项目执行时请再次查看最新内容和对应 Git commit：

1. Readest GitHub：<https://github.com/readest/readest>
2. Readest Architecture：<https://github.com/readest/readest/blob/main/apps/readest-app/docs/architecture.md>
3. Readest Getting Started：<https://www.readest.com/docs/getting-started>
4. Readest Reading / Export notes：<https://www.readest.com/docs/reading>
5. Readest Translate & Lookup / Custom dictionaries / Web Search：<https://www.readest.com/docs/translate>
6. Readest Library / Send to Readest：<https://www.readest.com/docs/library>
7. Readest Sync & Backup / Cloud storage providers：<https://www.readest.com/docs/sync>
8. Readest License：仓库根目录 `LICENSE`，当前仓库页面标示 AGPL-3.0。
9. Obsidian Help：<https://help.obsidian.md/>（核实 Android Vault 与文件访问行为时使用）
10. Android Storage Access Framework：<https://developer.android.com/guide/topics/providers/document-provider>
11. Android Sharesheet：<https://developer.android.com/training/sharing/send>

---

**项目原则总结：先利用成熟阅读引擎，把个人知识数据掌握在自己手中；先做可迁移、可验证的阅读闭环，再考虑 AI 和复杂自动化。**
