# Hpannel 导航重构版

Hpannel 导航重构版是一个面向 uTools 插件环境的导航面板，基于 Vue 3 + Vite 构建。项目用于集中管理内网/外网链接、分类、浏览器书签、个性化界面配置和服务连通性检测，同时也支持在普通浏览器开发环境中运行调试。

## 当前能力

### 导航与分类

- 支持多级分类展示、折叠/展开、新增、编辑和删除。
- 支持链接名称、图标、图标 URL、内网地址、外网地址和备注。
- 支持网格视图和列表视图。
- 支持按分类、名称、备注、内网地址、外网地址搜索。
- 支持喜欢分组，喜欢项会引用原始链接数据。
- 支持一键展开/折叠所有分类。

### 系统应用设置

系统应用设置以抽屉形式打开，当前包含：

- 分类管理：管理分类层级和分类下链接。
- 个性化设置：配置布局、主页面组件、网格卡片和背景壁纸。
- 数据管理：导入、导出、刷新、重置和清空数据。
- 连通检测：配置服务检测开关、分类检测范围、并发和超时。
- 关于：展示应用信息，可通过构建产物中的关于模板调整内容。

设置抽屉支持：

- 左侧或右侧打开。
- 拖拽调整宽度。
- 设置导航收起/展开。

### 个性化设置

- 布局设置使用双态胶囊开关，支持：
  - 网格 / 列表。
  - 内网 / 外网。
  - 亮色 / 暗黑。
  - 系统设置左侧 / 右侧打开。
- 主页面组件可单独显示/隐藏：添加、时钟、显示秒、搜索、刷新、视图模式、内外网、暗黑、连通检测徽标。
- 网格卡片支持调整卡片大小和圆角。
- 背景壁纸支持：
  - 图片 URL 预览。
  - 本地图片上传并压缩。
  - 最后一次上传图片复用。
  - 透明度和模糊度调整。
  - 下载当前壁纸，下载内容会转换为 JPG。

### 连通性检测

- 支持全局总开关，关闭后隐藏检测 UI 和检测行为。
- 支持按分类启用/停用检测，子分类和后续新增链接可继承分类配置。
- 支持批量选择分类、全选、清空、启用、停用、重置和清除配置。
- 支持立即全量检测、分类检测、单链接重新检测。
- 支持启动自动检测、可见时轮询检测、最大并发数、默认超时时间和延迟显示。
- 状态展示覆盖：顶部徽标、分类概览、网格卡片、列表标签、URL Tooltip、仅看异常聚合区。
- 异常口径包括已检测后的 `offline`、`timeout`、`unknown`、`reachable-unknown` 等非在线结果。
- uTools 环境优先使用 preload 注入的 Node 探测能力，支持 HTTP HEAD/GET fallback 和 TCP 端口探测；普通浏览器环境会使用 fetch/image 尽力探测，受 CORS 限制。

### 数据管理

- 系统数据导入/导出：用于当前导航面板备份、迁移和恢复。
- 兼容浏览器书签导入/导出：专门处理浏览器书签 HTML。
- 导入时支持重复项判断、分类路径创建和导入数量上限。
- 支持刷新当前数据、重置默认数据、清空所有数据。

## 技术栈

- Vue 3.5
- Vite 6
- uTools API 类型提示
- uTools preload Node 能力：`fs`、`http`、`https`、`net`

## 项目结构

```text
.
├── index.html
├── package.json
├── jsconfig.json
├── public/
│   ├── logo.png
│   ├── plugin.json              # uTools 插件配置
│   ├── about-template.html       # 关于页运行时模板
│   └── preload/
│       ├── package.json          # 标记 preload 为 CommonJS
│       └── services.js           # uTools preload 能力注入
├── src/
│   ├── main.js                   # Vue 挂载入口
│   ├── main.css                  # 全局基础样式
│   ├── App.vue                   # uTools 环境判断与导航面板挂载
│   ├── NavigationPanel.vue       # 主容器，集中业务状态、持久化和编排逻辑
│   ├── ClockDisplay.vue          # 时钟组件
│   ├── default-data.json         # 默认导航数据
│   └── components/
│       ├── layout/
│       │   ├── AppHeader.vue
│       │   ├── FunctionBar.vue
│       │   └── SystemSettingsDrawer.vue
│       ├── navigation/
│       │   ├── CategorySection.vue
│       │   ├── EmptyState.vue
│       │   ├── FavoritesSection.vue
│       │   ├── GridItemCard.vue
│       │   └── ListItemRow.vue
│       └── settings/
│           ├── AboutPanel.vue
│           ├── DataManagementPanel.vue
│           ├── HealthCheckSettingsPanel.vue
│           ├── PersonalizationPanel.vue
│           └── SystemSettingsDrawer.vue  # 历史/备用同名组件，当前主入口使用 layout 版本
└── dist/                         # npm run build 生成
```

当前拆分策略是：`NavigationPanel.vue` 仍负责核心业务状态、localStorage 持久化、导入导出和连通检测编排；子组件主要负责 UI 展示和事件转发，降低状态同步复杂度。

## 关键文件职责

### `src/App.vue`

- 判断是否运行在 uTools 环境中。
- 注册 `window.utools.onPluginEnter` / `onPluginOut`。
- 挂载 `NavigationPanel`。

### `src/NavigationPanel.vue`

- 管理分类、链接、喜欢、搜索、视图模式和网络模式。
- 管理系统应用设置抽屉状态。
- 管理 UI 配置、壁纸配置、暗黑模式。
- 负责数据导入导出、浏览器书签兼容导入导出。
- 负责连通检测运行时状态、批量任务、轮询和异常汇总。
- 维护 Toast、URL Tooltip、菜单定位等跨组件交互状态。

### `public/preload/services.js`

- 向渲染进程注入 `window.services.readFile`。
- 向渲染进程注入 `window.healthServices.probe`。
- 在 uTools 环境中为连通检测提供 Node 原生 HTTP/TCP 探测能力。

### `src/components/layout/`

- `AppHeader.vue`：顶部标题栏、搜索框、时钟和主要快捷按钮。
- `FunctionBar.vue`：全部折叠/展开和仅看异常入口。
- `SystemSettingsDrawer.vue`：系统设置抽屉布局、左右打开、拖拽宽度和设置导航。

### `src/components/navigation/`

- `FavoritesSection.vue`：喜欢分组展示与事件转发。
- `CategorySection.vue`：分类标题、分类检测概览、网格/列表切换展示。
- `GridItemCard.vue`：网格链接卡片、状态标记和浮动菜单。
- `ListItemRow.vue`：列表链接行、状态标签和行内操作。
- `EmptyState.vue`：无数据状态。

### `src/components/settings/`

- `PersonalizationPanel.vue`：布局、主页面组件、卡片样式和壁纸设置。
- `DataManagementPanel.vue`：系统数据、浏览器书签和维护操作入口。
- `HealthCheckSettingsPanel.vue`：连通检测全局配置和分类检测配置。
- `AboutPanel.vue`：关于内容展示。

## 本地开发

### 安装依赖

```bash
npm install
```

### 启动开发服务

```bash
npm run dev
```

默认地址通常为：

```text
http://localhost:5173
```

如端口被占用，Vite 会自动选择其他端口。

### 生产构建

```bash
npm run build
```

构建产物输出到：

```text
dist/
```

## uTools 部署说明

1. 完成开发与本地验证。
2. 执行生产构建：

```bash
npm run build
```

3. 使用 `dist/` 作为插件运行资源。
4. 确认 `dist/preload/services.js` 存在，并且 `dist/preload/package.json` 保留 `commonjs` 类型。
5. 确认 `dist/plugin.json` 和 `dist/about-template.html` 存在。
6. 在 uTools 开发者工具中加载或更新插件入口。

构建产物通常包含：

```text
dist/
├── index.html
├── assets/
├── logo.png
├── plugin.json
├── about-template.html
└── preload/
    ├── package.json
    └── services.js
```

## localStorage 数据

项目主要使用 localStorage 保存运行数据和用户配置：

- `navigation-panel-data`：分类、链接、喜欢分组等主数据。
- `navigation-panel-ui-settings`：主页面组件、壁纸、卡片样式、系统设置位置等 UI 配置。
- `navigation-panel-health-settings`：连通检测配置。
- `navigation-panel-dark-mode`：暗黑模式状态。
- `navigation-panel-last-uploaded-wallpaper`：最后一次上传壁纸。

调整这些结构时需要保持历史数据兼容，避免破坏已有用户配置。

## 开发约定

1. 业务状态优先集中在 `NavigationPanel.vue`，子组件优先做展示和事件转发。
2. 修改导入导出、localStorage key 或数据结构时，需要考虑旧数据兼容。
3. 修改连通检测时，需要同时检查 uTools preload 探测、Node fallback 和浏览器 fallback 三条路径。
4. 新增 UI 时需要同时检查亮色和暗黑模式。
5. 改动结构性逻辑后至少运行：

```bash
npm run build
```

## 部署前检查清单

- [ ] `npm run build` 无报错。
- [ ] 主页面能正常打开。
- [ ] 分类、链接、喜欢、搜索功能正常。
- [ ] 系统应用设置可从左侧/右侧打开，拖拽宽度正常。
- [ ] 个性化设置能保存，壁纸上传、预览、清除、下载正常。
- [ ] 数据导入导出和浏览器书签导入导出正常。
- [ ] 连通检测全局开关、分类配置、全量检测、分类检测、单条检测正常。
- [ ] 异常检测结果能在顶部徽标、分类概览、卡片/列表和仅看异常中标记。
- [ ] uTools 环境下 preload 能正常注入 `window.healthServices.probe`。

## 常见问题

### 开发环境能运行，uTools 中连通检测不准确

优先检查：

- `dist/preload/services.js` 是否存在。
- `dist/preload/package.json` 是否声明 CommonJS。
- uTools 插件配置是否正确加载 preload。
- 当前是否实际运行在普通浏览器 fallback 模式。浏览器模式受 CORS 限制，离线判断只能尽力而为。

### 样式在拆组件后不生效

当前大量业务样式仍在 `NavigationPanel.vue` 的全局 `<style>` 中。拆分或改名子组件 class 时，需要同步检查这些全局样式选择器。

### 数据丢失或配置异常

优先检查 localStorage 中的主数据和配置项，必要时先通过数据管理导出备份，再执行重置或清空操作。
