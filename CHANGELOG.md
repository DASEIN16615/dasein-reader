# Dasein Reader 变更日志 (CHANGELOG)

本项目基于上游 [Readest](https://github.com/readest/readest) 仓库演化，遵循 [Keep a Changelog](https://keepachangelog.com/) 规范。

---

## [Unreleased] - Phase 1: 工程基线建立与 CI 构建自动化

### 新增 (Added)
- **基线审计与决议**：
  - 完成上游 Readest `v0.12.16`（commit `5b3f854`）代码结构、存储模式与 AGPL-3.0 许可证基线审计（[`BASELINE_AUDIT.md`](file:///docs/audit/BASELINE_AUDIT.md)）。
  - 输出系统架构决议书（[`ADR-001-architecture.md`](file:///docs/DECISION_RECORDS/ADR-001-architecture.md)），确立本地优先与通用 Markdown/JSON 导出的核心策略。
  - 编制功能成熟度对照矩阵（[`FEATURE_MATRIX.md`](file:///docs/audit/FEATURE_MATRIX.md)）。
- **工程与 CI/CD**：
  - 建立专属自动化构建流 [`.github/workflows/dasein-build-android.yml`](file:///.github/workflows/dasein-build-android.yml)，支持一键打包 Android arm64 APK 并作为构建产物归档。
  - 编写本地敏捷调试与云端构建指南 [`docs/BUILD_GUIDE.md`](file:///docs/BUILD_GUIDE.md)。
- **Git 分支管理**：
  - 保留官方 `upstream` 远端，设立 `dasein-baseline-20261105` 原始快照 Tag，初始化 `develop` 开发主分支。

---

## [0.12.16] - 2026-11-05 (Upstream Base)
- 上游官方 Release 基准线。
- 原生包含 Foliate 阅读引擎、离线多词典支持（StarDict/MDict）、网页转 EPUB 剪藏管道与基础注释管理。
