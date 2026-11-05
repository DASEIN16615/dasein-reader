# Dasein Reader 开发环境与构建指南 (BUILD_GUIDE)

本项目基于 Readest（Tauri v2 + Next.js/React + Rust + Foliate 阅读引擎）构建，采用 **GitHub Actions CI 自动出包为主 + 本地 Node/Web 敏捷调试** 的双轨工作流。

---

## 1. 为什么采用双轨工作流？

Tauri v2 的 Android 交叉编译链路极为复杂，涉及以下重型依赖：
- Rust `aarch64-linux-android` 交叉编译目标
- Android NDK (r28+) 及 CMake 3.22+
- JDK 17 (Zulu)
- C++ 共享库与 Linux/Posix 工具链

在 Windows 本地直接配置 Android 交叉编译极易踩中 NDK 路径、路径长度限制、长文件名与符号链接兼容性问题。因此：
- **日常业务逻辑（80% 的工作）**：在 Windows 本地使用 Node.js / pnpm 快速启动 Web 模式，秒级热重载排查 UI、笔记批注、Markdown 导出与本地逻辑。
- **真机 APK 打包验证（20% 的工作）**：推送代码至 GitHub 仓库（或在 GitHub Actions 页面手动点击触发），由免费的 Ubuntu 虚拟主机完成 Rust + Android NDK 编译并直接产出 `arm64` APK。

---

## 2. 本地敏捷开发调试模式 (Web Mode)

### 2.1 环境要求
- **Node.js**：`v24+`（当前已安装 `v24.14.0`）
- **pnpm**：`10+`（当前已安装 `10.30.3`）
- **Git**

### 2.2 启动步骤
1. 安装依赖：
   ```bash
   pnpm install
   ```
2. 拷贝必要的 vendor 资产（PDF.js / simplecc）：
   ```bash
   pnpm --filter @readest/readest-app setup-vendors
   ```
3. 启动开发服务器：
   ```bash
   pnpm --filter @readest/readest-app dev-web
   ```
4. 打开浏览器访问 `http://localhost:3000` 即可：
   - 可直接拖入 EPUB / PDF / TXT 电子书进行阅读与测试；
   - 支持高亮、批注、查词面板与 Markdown 导出调试。

---

## 3. GitHub Actions CI 自动化构建 Android APK

### 3.1 触发方式
仓库预置了 [`.github/workflows/dasein-build-android.yml`](file:///.github/workflows/dasein-build-android.yml)：
1. **手动一键构建**：在 GitHub 仓库页面进入 **Actions** -> 选择 **Build Dasein Reader Android APK** -> 点击 **Run workflow**。
2. **提交自动构建**：向 `develop` 或 `main` 分支推送非文档代码时自动触发构建。

### 3.2 获取 APK 安装包
构建任务耗时约 8-15 分钟（带有 Rust Cache 缓存加速）。构建成功后：
1. 打开当次 GitHub Actions 运行详情页；
2. 在底部 **Artifacts** 区域即可找到并直接下载 `DaseinReader-Android-arm64.zip`；
3. 解压后得到可直接在 Android 手机上安装的 `.apk` 文件。
