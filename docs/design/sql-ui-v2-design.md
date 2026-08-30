# SQL 工作台 UI/UX 优化设计（v2）

> 版本：v2（基于 v1 已落地实现的第二轮优化）
> 范围：`/queries` 页面（`src/views/queries/` 及其依赖的 `src/utils/sql/`、`src/style/sql-workbench.scss`、`src/locales/`）
> 性质：**增量优化**。不改动后端能力、不引入新依赖，只解决 v1 落地后仍存在的「主次不清、状态不可见、中英文混杂、列宽截断、控件感偏重」五类问题。

---

## 1. 背景与目标

v1 改版（见 `sql-ui-design.md`）已经完成结构性重构：三区布局、面板组件化、design token、数据源树搜索、右键菜单、类型徽标、NULL 弱化、截断提示等均已落地。

但落地结果仍有明显残留问题，用户在直观感受上依旧是「比较丑 / 不够统一」：

| 问题 | 现象 | 根因 |
| --- | --- | --- |
| 主次不分 | 「运行」「在新标签运行」两个按钮视觉权重几乎相同 | `.sql-run-btn` 主按钮样式已在 SCSS 定义，但 `SqlToolbar.vue` **从未挂载该类**，Run 按钮仍用 `text bg`（幽灵按钮） |
| 状态不可见 | 执行中/失败/就绪在界面上看不到全局状态 | `SqlToolbar.vue` 接收了 `status` prop、SCSS 也写了 `.sql-status` 与 `sql-status-pulse` 动画，但**模板没有渲染** |
| 中英文混杂 | 同屏出现「还没有数据源 / 添加数据文件」与「Query failed / Retry / 导出 / 复制为 CSV」 | 组件与工具函数中仍有大量硬编码文案，绕过了 i18n 词典 |
| 中文列宽截断 | 结果表格中文字段名的列宽估算偏窄，被 `…` 截断 | `ResultTable.vue` 的 `estimateWidth` 用 `String.length` 计算，中文按 1 个字符计，实际渲染占 2 倍宽度 |
| 控件感偏重 | 树、卡片式 Tabs、分页、分段控件保留了 Element Plus 默认视觉 | 缺少在 `.sql-workbench` 作用域内对 `el-tree` / `el-tabs` / `el-pagination` / `el-segmented` / 输入框的视觉统一 |

### 目标

1. 让「运行」成为唯一的主操作，其余执行入口明确降级；
2. 让执行状态（就绪 / 运行中 / 失败）常驻可见；
3. 消除所有用户可见的硬编码文案，中英切换完整生效；
4. 修复中文字段名列宽截断；
5. 在既有 token 体系上，统一表格、树、标签页、分页、分段控件等原生控件的视觉，让整页像一个连贯的工作台。

### 非目标

- 不改动 `src-tauri` 后端查询逻辑；
- 不引入 `el-table-v2`、新的 UI 框架或任何新依赖；
- 不做 SQL 解析、格式化引擎等能力性变更。

---

## 2. v1 落地现状核对

v1 文档 `§13` 声称的「全量实现」总体属实，与代码逐项核对如下：

| v1 承诺项 | 落地情况 |
| --- | --- |
| token 化样式 `sql-workbench.scss` | ✅ 已建，`main.ts` 引入 |
| 三区布局 + 左栏可折叠可拖拽 | ✅ `el-splitter` 实现 |
| 数据源树搜索、右键菜单、类型徽标 | ✅ `sqlFileTree.ts` + `ContextMenu.vue` |
| 编辑器自动补全 / 三种格式化 | ✅ `aceCompleter.ts` / `formatSql.ts` |
| 状态栏行数/列数/耗时/截断 | ✅ `ResultToolbar.vue` |
| 行号列、NULL 弱化、数值右对齐 | ✅ `ResultTable.vue` |
| i18n 中英词典 | ✅ 词典齐全，但**组件层未完全接入**（见 §3） |
| 窗口拖拽白名单 `.no-drag` | ✅ `layout/index.vue` 已含 |
| 主按钮视觉分层（`.sql-run-btn`） | ⚠️ 样式已写，**模板未挂载**，形同虚设 |
| 全局状态胶囊 | ⚠️ 样式/翻译齐备，**模板未渲染** |

结论：v1 的**结构**到位，**语义与一致性**存在明显缺口，这正是 v2 要补齐的部分。

---

## 3. 残留问题清单（v2 输入）

### 3.1 工具条主次与状态（`SqlToolbar.vue`）

- Run 按钮用 `text bg`，与「新标签运行」同级；`.sql-run-btn` 主按钮样式（实心主色、白字、快捷键高亮）已定义未使用。
- `props.status`（`idle | running | error`）传入后被忽略，`SqlToolbar.vue` 未渲染任何状态胶囊。
- 三个按钮组（执行组 / 格式组 / 设置组）之间无分隔线，组与组的边界靠间距猜测。

### 3.2 硬编码文案（绕过 i18n）

| 文件 | 硬编码示例 |
| --- | --- |
| `DataSourcePanel.vue` | `还没有数据源`、`添加 CSV、Excel、JSON 或 Parquet 文件后…`、`添加数据文件`、`没有匹配的文件或字段` |
| `DataSourceNode.vue` | `` `${n} 字段` `` 徽标、`刷新 schema` / `插入到编辑器` / `移除数据源` 三个 title |
| `ResultPanel.vue` | `Query failed`、`Retry`、`Copy error`、`No query results yet`、`Write SQL above…`、`Query successful, no matching rows`、`The statement can be executed…` |
| `ResultToolbar.vue` | `导出` / `复制`、`复制为 CSV` 等菜单项、`每页`、`显示 X-Y,共 N 条`、`已截断`、`行` / `列` |
| `sqlTabManager.ts` | `Query ${count}` 标签标题、`No data source…`、`SQL script is empty.`、`Export done`、`Copied as CSV/JSON/…`、`Copy failed` |
| `sqlFileTree.ts` | `Failed to load schema for…`、`Refreshed "…"`、`Refresh failed`、`Deleted "…"` |
| `sqlp.vue` | `Copied error message`、`Failed to copy` |

> 这些文案在 `src/locales/en.ts` / `zh-CN.ts` 的 `sql.message`、`sql.result`、`sql.dataSource` 分组里**全部已有对应 key**，v2 只需把硬编码替换为 `t()` 调用，基本无需新增词典词条。

### 3.3 中文字段名列宽（`ResultTable.vue`）

`estimateWidth` 用 `String(value).length` 采样最长长度，再 `longest * 8 + 28` 估算。英文每个字符约 8px 合理，但中文（全角）字符实际宽度约 2 倍，导致中文字段名列被截断成 `…`。需要用**显示宽度**（CJK 记 2、其余记 1）替代 `length`。

### 3.4 原生控件视觉未统一

- `el-tree` 默认缩进、节点内边距、hover 色与面板整体不一致；
- 结果区 `el-tabs` 为 `type="card"`，自带卡片边框与上下留白，视觉偏重；
- `el-pagination`、`el-segmented`、`el-select`、`el-input` 的高度/圆角/边框未与 token 对齐；
- 焦点环、滚动条（表格与树）沿用浏览器/Element 默认，缺少统一收口。

---

## 4. 设计原则（v2 增量）

1. **主次唯一**：一个页面只有一个实心主按钮（Run），其余执行与格式操作全部降级为 ghost / 文本级。
2. **状态常驻**：执行状态作为「胶囊」常驻工具条右侧，不依赖 toast，也不藏在编辑器角落。
3. **语义外显 + 文案单一来源**：用户能看到的每一个字都来自 i18n 词典，杜绝组件内散落的硬编码。
4. **宽度可信**：列宽估算按「显示宽度」计算，保证 CJK 字段名完整可读。
5. **控件同源**：所有原生 Element 控件的视觉统一在 `.sql-workbench` 作用域内收口，只调「外观」，不改动控件行为与 API。

---

## 5. 分区优化方案

### 5.1 顶部工具条（`SqlToolbar.vue`）

**视觉等级（从左到右）**：

| 控件 | 视觉 | 说明 |
| --- | --- | --- |
| 运行 | 实心主色按钮（挂载 `.sql-run-btn`），含 `⌘/Ctrl ⏎` 快捷键 | 唯一主操作 |
| 在新标签运行 | ghost + 边框 | 次要执行入口 |
| 格式化 ▾ | ghost 下拉 | 编辑器辅助 |
| 限制行数 / 字段类型 | `el-segmented`（size small） | 查询设置 |
| 状态胶囊 | 右侧 `ml-auto`，圆点 + 文案 | 常驻显示 `就绪 / 运行中 / 失败` |

**分组与分隔**：执行组、格式组之间、设置组左侧各加一条 1px 竖向分隔线（复用 `.sql-toolbar__divider`，SCSS 已定义未使用）。

**状态胶囊映射**：

| `status` | 圆点色 | 文案 |
| --- | --- | --- |
| `running` | `--sql-accent` + `sql-status-pulse` 动画 | `sql.toolbar.status.running` |
| `error` | `--sql-danger` | `sql.toolbar.status.failed` |
| `idle` | `--sql-text-3` | `sql.toolbar.status.ready` |

复用 SCSS 已存在的 `.sql-status` 结构，并把动画类改挂到圆点上。

### 5.2 数据源面板（`DataSourcePanel.vue` / `DataSourceNode.vue`）

- 空态、搜索无结果、添加按钮、面板标题计数等全部改走 `t()`（对应 `sql.dataSource.*`）。
- `DataSourceNode.vue` 的字段数徽标改用 `t("sql.dataSource.fieldCount", { count: n })`；三个 `title` 提示改用 `sql.dataSource.refresh / insert / remove`。
- 面板标题、树节点悬停色、`el-tree` 缩进与内边距统一收口（见 §6）。

### 5.3 SQL 编辑器（`SqlEditor.vue`）

- 已基本完成 i18n 与状态角标，v2 仅做两处对齐：
  1. 编辑器的「就绪/成功」状态角标语义与工具条胶囊保持一致；
  2. `::v-deep` 覆盖 Ace 的 gutter 前景色、当前行高亮、选区色，使其贴合 token（已在 SCSS 有 gutter 覆盖，补当前行与选区）。

### 5.4 结果区（`ResultPanel.vue` / `ResultToolbar.vue` / `ResultTable.vue`）

- **标签页**：`type="card"` 的卡片边框改为更轻的「下划线式」激活态（顶部 2px accent + 底色），去掉卡片间过重的边框与留白；关闭按钮悬停显现逻辑保留。
- **状态栏与分页**：全部文案改走 `t()`（`sql.result.*`），`rangeText` / `countText` 改用插值 key（`sql.result.summary` / `rowsTruncated` / `range`）。
- **表格列宽**：`estimateWidth` 改用显示宽度函数：
  - 半角字符记 1、全角（CJK 等 `[\u1100-\u115f\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef\u3000-\u303f]`）记 2；
  - `width = clamp(displayWidth * 8 + 28, 90, 360)`；
  - 列头类型徽标、NULL 弱化、数值右对齐保持 v1 现状不动。
- **原生控件统一**：`el-tabs`、`el-pagination`、`el-select` 的视觉收口见 §6。

### 5.5 工具函数文案（`sqlTabManager.ts` / `sqlFileTree.ts` / `sqlp.vue`）

- `sqlTabManager.ts` 的标签标题、执行前校验、导出、复制相关 message 改走 `t("sql.message.*")`；
- `sqlFileTree.ts` 的 schema 加载失败、刷新成功/失败、删除成功 message 改走 `t("sql.message.*")`；
- `sqlp.vue` 的 `Copied error message` / `Failed to copy` 改走 `t("sql.message.copiedError")` / `t("sql.message.copyFailed")`。

> 这些文件当前是纯 TS 工具函数，不能直接用 `useI18n()`（依赖 pinia），但可复用 `src/locales/index.ts` 导出的 `t()`（内部会读取 locale store，语言切换时 message 为新值即可，历史 toast 文案无需响应式更新）。

---

## 6. 视觉统一规范（`sql-workbench.scss`）

全部限定在 `.sql-workbench` 作用域内，沿用 v1 token，不污染全局。

### 6.1 新增/调整的 token

| Token | 取值 | 用途 |
| --- | --- | --- |
| `--sql-control-h` | `28px` | 小控件统一高度（按钮/输入/分段） |
| `--sql-focus-ring` | `0 0 0 2px var(--sql-accent-weak)` | 统一焦点环 |

### 6.2 控件收口清单

| 控件 | 调整 |
| --- | --- |
| `el-tree` | 节点行高 28px、内边距统一、`--sql-bg-hover` 悬停、选中 `--sql-bg-active`；缩进量收紧 |
| `el-tabs`（结果区） | 去掉 card 边框，激活项用顶部 2px `--sql-accent` 下划线 + `--sql-bg-active` 底色 |
| `el-pagination` | 对齐小控件高度，`background` 项圆角/间距 token 化 |
| `el-segmented` | 高度 `--sql-control-h`，选中项用 `--sql-bg-active` 底色 |
| `el-select` / `el-input` | 高度 `--sql-control-h`、圆角 `--sql-radius-control` |
| `el-button`（small） | 统一高度与 `border-radius`，focus-visible 用 `--sql-focus-ring` |
| 滚动条 | 表格、树、面板 body 使用细滚动条，颜色映射 `--sql-border` |

### 6.3 动效与无障碍

- 沿用 v1：微交互 `120ms`、曲线 `cubic-bezier(.4,0,.2,1)`；状态点动画仅用于 `running`；
- `prefers-reduced-motion: reduce` 全局关闭（v1 已含，保留）；
- 可聚焦控件统一 focus-visible 焦点环，替代 Element 默认焦点样式。

---

## 7. 实施清单（文件级）

| 类型 | 文件 | 改动 |
| --- | --- | --- |
| 文档 | `docs/design/sql-ui-v2-design.md` | 本文档（新增） |
| 工具条 | `src/views/queries/components/SqlToolbar.vue` | 挂载 `.sql-run-btn`、Run-new 降级、加分隔线、渲染状态胶囊、接入 `status` |
| 数据源 | `src/views/queries/components/DataSourcePanel.vue` | 硬编码文案 → `t()` |
| 数据源节点 | `src/views/queries/components/DataSourceNode.vue` | 字段数徽标与 title → `t()` |
| 结果区 | `src/views/queries/components/ResultPanel.vue` | 错误态/空态文案 → `t()` |
| 结果工具条 | `src/views/queries/components/ResultToolbar.vue` | 状态栏/分页/导出/复制文案 → `t()` |
| 结果表格 | `src/views/queries/components/ResultTable.vue` | 列宽估算改用显示宽度（CJK 记 2） |
| 工具函数 | `src/utils/sql/sqlTabManager.ts` | 标签标题、校验、导出、复制文案 → `t()` |
| 工具函数 | `src/utils/sql/sqlFileTree.ts` | schema 加载/刷新/删除文案 → `t()` |
| 页面 | `src/views/queries/sqlp.vue` | 复制错误文案 → `t()` |
| 样式 | `src/style/sql-workbench.scss` | §6 控件收口、状态胶囊动画、焦点环、滚动条 |

> 词典 `src/locales/en.ts` / `zh-CN.ts` 已覆盖全部所需 key，预计无需新增；若实施中发现缺失，按既有分组补齐中英两条。

---

## 8. 验证与风险

### 8.1 验证

- [ ] `vue-tsc --noEmit --skipLibCheck` 报错数量不高于改版前基线（仓库存在既有报错，只保证**不新增**）；
- [ ] `src/views/queries/` 与 `src/utils/sql/` 内无残留用户可见硬编码文案（排除注释、key 值、正则）；
- [ ] 「运行」为实心主按钮，「在新标签运行」为 ghost，二者视觉权重明显区分；
- [ ] 工具条右侧状态胶囊随 `idle / running / error` 正确切换（运行中圆点有脉冲动画）；
- [ ] 中文字段名列宽完整可读，不再被 `…` 截断；
- [ ] 中英切换后，数据源面板、结果区、状态栏、toast 文案全部切换。

### 8.2 风险

1. **本地 `pnpm dev` / `pnpm build` 无法运行**：`@pureadmin/theme` 构建时清理 `node_modules/sass/LICENSE` 被安全删除层拦截（v1 已验证，与本次改动无关）。因此 v2 以 `vue-tsc` 与代码复核为主要验证手段，不依赖 dev server 目验。
2. **Ace 主题不认 CSS 变量**：编辑器视觉对齐只能靠 `::v-deep` 少量覆盖，需与主题切换同步维护（沿用 v1 结论）。
3. **工具函数里用 `t()`**：`t()` 读取 pinia locale store，语言切换后新弹出的 message 即时生效，历史 toast 不更新属可接受范围。

---

## 9. 与 v1 的差异速查

| 项 | v1 落地现状 | v2 后 |
| --- | --- | --- |
| 运行按钮 | ghost，与其它按钮同级 | 实心主按钮，唯一主操作 |
| 新标签运行 | 与运行同级 | ghost，明确降级 |
| 全局状态 | `status` 传入但未渲染 | 工具条右侧常驻状态胶囊 |
| 按钮分组 | 无分隔 | 分隔线明确分组 |
| 文案 | 中英混杂、多处硬编码 | 全部走 `t()`，单一来源 |
| 中文列宽 | 按 `length` 估算，中文截断 | 显示宽度（CJK=2）估算 |
| 原生控件 | Element 默认视觉 | `.sql-workbench` 内统一收口 |
