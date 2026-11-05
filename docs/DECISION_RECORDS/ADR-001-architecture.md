# ADR-001: Dasein Reader 核心架构与产品规范决议书

- **状态**：已批准 (Approved)
- **决议日期**：2026-11-05
- **背景依据**：《Dasein Reader 个人阅读与知识管理系统项目计划书》(v0.9)
- **决策机制**：/grill-me 深度交互式设计推演与决策

---

## 1. 上下文与决策背景 (Context)

Dasein Reader 定位为以 Android 手机为主要阅读终端、以本地数据自主权为核心基石、以 Obsidian 为长期沉淀库的开源个人阅读系统。为杜绝从零重写阅读引擎的高风险，项目选定 [Readest](https://github.com/readest/readest)（Tauri v2 + React + Rust + Foliate 引擎）作为上游基线。

在正式实施 Phase 0 基线审计前，我们围绕知识沉淀、批注模型、查词交互、剪藏格式、多端同步、AI 边界与构建交付等核心设计分支逐一推演并确立了最终规范。

---

## 2. 核心架构与设计决议 (Decisions)

### 2.1 知识沉淀：应用内管理 + 通用手动导出 (Annotation & Export Strategy)
1. **范围调整（暂缓自动同步手机 Obsidian）**：
   - 移出当前阶段对 Android 外部 Obsidian Vault 目录的 SAF 持久授权挂载与后台自动静默同步写入逻辑，避免移动端存储权限与多进程写盘竞争的高风险。
2. **应用内闭环为主 (In-App Notes Management)**：
   - 高亮、摘录、批注、认知分类（quote/thought/question/critique/connection/todo）及生词全部存储于阅读器本地 SQLite/IndexedDB 数据库中。
   - 应用内提供完整的“书籍笔记面板”与“全局笔记索引”，支持按分类、章节、颜色过滤，点击即可毫秒级跳转回书中正文锚点。
3. **通用手动导出能力 (Manual Markdown/JSON Export)**：
   - 保留单书/选定批注的**手动导出 Markdown / JSON** 功能。
   - 导出方式简化为：生成格式标准的 Markdown 文件供用户保存至本地 Downloads、通过系统分享菜单（Share Sheet）直接投递给其他应用，或在全量数据备份包中打包输出。
   - Markdown 内容仍遵循规范的 YAML Frontmatter 与语义化 Callout 格式，未来若恢复 Obsidian 自动同步可平滑无缝对接。

### 2.2 批注模型与认知元数据 (Annotation Taxonomy)
1. **划词交互流**：
   - 划词默认生成纯高亮摘录（`quote`），不强弹打断阅读心流的复杂表单。
   - 呼出批注浮层可快速打上认知类型标记：`quote`（摘录）、`thought`（观点）、`question`（疑问）、`critique`（反驳）、`connection`（联系）、`todo`（待查）。
2. **知识库映射**：
   - 在 Markdown 中同时映射为语义化 Callout 块（如 `> [!question] 疑问标题`）与二级标签（如 `#dasein/question`），兼顾视觉排版美观度与 Dataview/全文检索结构化查询。

### 2.3 查词体验与生词本沉淀 (Dictionary & Vocabulary)
1. **交互呈现**：
   - 采用**底部半屏可拖拽抽屉（Bottom Sheet）**，保留正文阅读背景与视觉焦点。
   - 支持在本地离线词典（StarDict/MDict/Yomitan）、维基百科、自定义在线搜索模板（带 `%WORD%` 编码占位符）之间滑动切换。
2. **生词知识化**：
   - 点击“加入生词本”后，单词、原句例句、释义、发音与书籍来源自动沉淀至 Obsidian 的 `20-Notes/Vocabulary/` 目录中，支持后续复习与检索。

### 2.4 网页剪藏与稍后读 (Web Clipping)
1. **底层存储格式**：
   - 接收 Android 系统分享（Share Sheet）的 URL 后，由 Readability 提取正文内容并抓取本地化图片，统一封装打包为**标准单文件离线 EPUB**。
2. **架构收益**：
   - 100% 复用 Foliate 阅读引擎的分页、排版控制、CFI 定位与批注高亮体系，避免在客户端维护两套互不通用的排版引擎。

### 2.5 数据自主权与同步体系 (Local-First Architecture)
1. **零专有云端依赖**：
   - Dasein 彻底采用**本地优先（Local-First）**架构，不强制注册任何平台账号，不依赖专有云端服务器。
2. **多端生态协同**：
   - 书库文件与 SQLite 数据库驻留本地；跨设备多端同步完全交给成熟、去中心化的第三方工具链（如 Syncthing、Obsidian Sync、FolderSync 等），应用专注提供原子读写与带有校验哈希的版本化备份导出包。

### 2.6 AI 辅助边界与隐私策略 (AI Boundary)
1. **定位与约束**：
   - 定位为 Phase 6 的可选低频工具。
   - 仅限在划词菜单中作为即时辅助工具（句子解构、俚语语境、语法剖析）。
2. **隐私红线**：
   - 仅支持用户自带 Key（BYOK），接入兼容 OpenAI/Gemini/DeepSeek 格式的端点。
   - 任何网络请求必须向用户明示即将外发的文字片段并经显式确认，AI 输出内容严格标记为“模型生成”，严禁后台静默抓取整书正文上传。

### 2.7 工程基线与构建交付 (Engineering & Toolchain)
1. **工作流模式**：
   - **GitHub Actions CI 自动出包为主 + 本地 Node/Web 敏捷调试**。
   - 本地集中进行 TypeScript/React 业务逻辑、SAF 适配、Markdown 模板与数据转换开发与测试。
   - 借助 GitHub Actions 完成 Rust、Android NDK、CMake 与 Tauri v2 Android APK 的自动化交叉编译，打通真机安装验证闭环。

---

## 3. 后续执行路径 (Next Steps)

按照《计划书》规定，立即正式启动 **Phase 0：可行性与代码审计（Gate 0）**：
1. 克隆 Readest 上游（`https://github.com/readest/readest`）至工作目录。
2. 完成上游代码结构、依赖包及 AGPL-3.0 许可证审计。
3. 评估 Android 端文件读取/导入及通用手动导出（Share Sheet / 文件保存）机制与应用私有存储设计。
4. 输出 `docs/audit/BASELINE_AUDIT.md` 与 `docs/audit/FEATURE_MATRIX.md`。
