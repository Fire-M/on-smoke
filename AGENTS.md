# AGENTS.md — one-smoke（就抽一根）

本文件供 AI 助手快速理解项目结构、约定与常用命令。修改代码前请先阅读。

## 项目概述
虚拟戒烟辅助应用「就抽一根」。用户可以记录吸烟、查看健康/省钱数据、养虚拟宠物、解锁皮肤/背景/吐烟样式、看广告换取额外配额等。
技术栈：**uni-app + Vue 3 + Vite**，通过 `@dcloudio` 编译到 **H5 / 微信小程序 / App**。

## 常用命令
```bash
npm install                 # 安装依赖
npm run dev:h5              # 本地开发 H5（端口 8086，见 vite.config.js 的 strictPort）
npm run build:h5            # 构建 H5
npm run dev:mp-weixin       # 微信小程序开发
npm run build:mp-weixin     # 构建微信小程序
npm run dev:app / build:app # App 端
```
注意：PowerShell 中请用 `;` 连接命令，不要用 `&&`。

## 目录结构
- `src/pages/`：所有页面，每个页面一个文件夹，含 `xxx.vue`。**新增页面必须在 `src/pages.json` 的 `pages` 数组里登记路由**，否则无法访问。
- `src/components/`：公共组件，含自定义 tabBar `custom-tabbar/`。
- `src/utils/`：
  - `store.js`：核心数据层，基于 `uni.getStorageSync/setStorageSync`（兼容多端），所有持久化读写都走这里。
  - `ad-manager.js`：激励视频 / 插屏广告管理（H5 为模拟广告）。
  - `tracker.js`：埋点上报（被 ad-manager 等引用）。
  - `pet-engine.js`：宠物渲染/动画引擎。
- `src/static/`：静态资源（图片、音频 `audio/`、`custom.css`）。
- `src/App.vue`：全局样式与自定义 tabBar 隐藏逻辑。
- `src/main.js`、`src/manifest.json`、`src/uni.scss`：入口与全局配置。

## 关键约定（务必遵守）
1. **页面导航样式**全部为 `"navigationStyle": "custom"`，页面需自行处理返回/标题栏（参考 `index.vue`）。
2. **数据存储**：新增持久化数据务必在 `store.js` 的 `KEYS` 中定义 key（统一前缀 `os_`），并通过导出的 get/save 函数读写，不要直接用 `uni.setStorageSync`。
3. **新增页面入口**：在 `pages.json` 加路由后，若需从首页/其他地方跳转，使用 `uni.navigateTo({ url: '/pages/xxx/xxx' })`。
4. **跨端条件编译**：平台相关代码用 `// #ifdef H5` / `// #ifdef APP-PLUS` / `// #ifdef MP-WEIXIN` 包裹。广告真实逻辑目前被注释，仅 H5 模拟。
5. **烟雾效果**：H5 使用 `three.js`（`three` 依赖）做完整 3D 烟雾；小程序端烟雾已移除（`test-smoke-svg/`、`test-smoke-2d/`、`test-smoke-css/` 等为实验/测试页面）。新增图形效果优先参考 `pages/smoking/`。
6. **改动默认面向小程序**：本项目是「小程序兼容 + H5」的跨端应用。**除非用户明确说「改 H5」，否则默认改动必须保持小程序兼容，不得主动修改 H5 专属代码**（如 `// #ifdef H5` 的 three.js 烟雾逻辑、H5 模拟广告等）。涉及平台差异时优先用跨端 API 与条件编译。
6. **样式单位**：使用 `rpx`；全局暗色主题（背景 `#0f0f0f`，主色 `#f59e0b` 琥珀色），公共样式见 `App.vue` 与 `static/custom.css`。
7. **提交规范**：保持现有中文 `feat/fix/style` 等前缀的提交信息风格。

## 业务数据模型（store.js 要点）
- 设置 `settings`：每日配额 `dailyQuota`、冷却、价格、包大小、戒烟日期等。
- 今日 `today`：已吸数量、上次吸烟时间、品牌计数；**跨午夜自动重置**。
- 统计 `stats`：`totalSmoked`、`totalSaved` 等。
- 额外配额：看广告 `addExtraQuota()` 累加，`getEffectiveQuota()` 返回 设置配额 + 额外配额。
- 解锁系统：贴纸 `stickers`、背景 `backgrounds`（brand/smoking 两类）、吐烟样式 `smokeStyles`、宠物装扮 `petAccessories`。
- 其它模块：勋章 `badges`、烟瘾 `cravings`、每日挑战 `challenges`、情绪 `moods`、省钱目标 `savingsGoals`、时间胶囊 `timeCapsules`、宠物 `pet`。

## 调试提示
- H5 开发直接用浏览器访问 `http://localhost:8086`。
- 提交前先跑 `git status` 确认改动；本仓库默认分支 `main`，已跟踪 origin。
- 不要提交 `node_modules/`、`dist/`、`unpackage/`（见 `.gitignore`）。
