# SQL 工作台 UI 改版设计

> 版本：v1（设计稿阶段，未实施）
> 范围：`/queries` 页面（`src/views/queries/sqlp.vue`）
> 目标：把当前的「Element Plus 默认控件堆砌」改造成信息密度合理、层级清晰、明暗双主题一致的现代数据工作台。

---

## 1. 背景与目标

SQL 页面是 insight-x 的主页（`/` 重定向到 `/queries`），也是用户停留时间最长的界面。当前实现功能完整但视觉停留在「把官方组件拼起来」的阶段，主要问题是**信息层级缺失**和**语义靠猜**。

本次改版不改变后端能力，只重构前端表达，具体目标：

| 目标 | 现状 | 改版后 |
| --- | --- | --- |
| 语义清晰 | `View/Hide`、`Smoking/NoSmoking` 图标表达 limit / dtype，用户无法理解 | 带文字标签的开关与分段控件 |
| 层级分明 | 4 个等权重圆形图标按钮平铺 | 主操作（Run）/ 次操作 / 设置项三级区分 |
| 状态可见 | 执行中只有按钮 loading，无耗时、无行数、无截断提示 | 状态栏常驻：行数 / 耗时 / 列数 / 截断警示 / 错误 |
| 数据可信 | 结果表格固定 150px 列宽，无类型区分，NULL 与空串不可辨 | 列头类型徽标、数值右对齐、NULL 弱化、行号列 |
| 空态友好 | 空树、空结果都是一片空白 | 空态引导：拖文件 + 示例 SQL + 快捷操作 |
| 主题一致 | 依赖 Element 默认样式，暗色下对比度不稳 | 统一 design token，明暗两套，全部走 CSS 变量 |

非目标（本次不做）：SQL 语法解析/格式化引擎、查询计划可视化、多数据源连接管理。

---

## 2. 现状代码地图

```
src/views/queries/sqlp.vue          页面容器：el-splitter 三区布局 + 右键菜单（385 行，全部逻辑内联）
src/utils/sql/sqlTabManager.ts      结果标签页的增删与查询执行（invoke("query")）
src/utils/sql/sqlFileTree.ts        数据源树的数据组装、schema 拉取、右键菜单动作
src/utils/sql/aceConfig.ts          Ace 编辑器主题与语言包注册
src/store/modules/sqlHistory.ts     path（多文件用 | 分隔）与 dtypesByFile 缓存，持久化
src-tauri/src/insight/sql/sqlp.rs   query 命令
```

后端契约（`QueryResult`，序列化为 JSON 字符串返回）：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `columns` | `Vec<String>` | 列名（全量，不受 limit 影响） |
| `schema` | `HashMap<String, String>` | 列名 → Polars dtype 字符串 |
| `data` | `String` | 行数据的 JSON 字符串；`limit=true` 时**仅前 500 行** |

调用参数：`path`、`sqlQuery`、`varchar`、`limit`、`write`、`writeFormat`、`outputPath`、`skiprows`。
`write=true` 时走导出分支，返回 `"[]"`。

### 现状问题清单

1. **左栏**：固定 `size="150"`，无标题、无搜索、无折叠；文件节点只有图标 + 文件名，看不到格式与规模；`empty-text=""` 导致空态完全空白。
2. **工具条**：`ArrowRight / DArrowRight / View|Hide / NoSmoking|Smoking` 四个等大圆形按钮，Run 无主次，两个开关的图标隐喻与功能毫无关联。
3. **编辑器**：Ace 默认配置，无表名/字段名自动补全（schema 已在前端缓存却没用上），无执行状态与耗时反馈。
4. **结果区**：`el-tabs` + 固定 150px 列宽表格；无行数/耗时/列数；导出只有一个下载图标，格式靠**保存对话框的扩展名**隐式决定，用户不知道支持哪些格式；分页器 `simplified` 一页页点。
5. **整体**：无统一圆角/间距/字号规范；`.page-container` 是全局硬编码色（`#fdfdfe` / `rgb(36 37 37)`）而非 CSS 变量。

---

## 3. 设计原则

1. **信息优先，装饰其次**：这是一个数据工具，密度可以高，但每一像素都要有信息或呼吸感，不加无意义渐变。
2. **状态常驻**：执行状态、耗时、行数、截断、错误，永远在用户视线内，不依赖 toast 一闪而过。
3. **语义外显**：任何开关都带文字，图标只做辅助，不承载唯一语义。
4. **明暗同源**：所有颜色走 token，暗色不是「反色」而是同一套语义的第二组取值。
5. **渐进增强**：先保证小屏/窄栏可用，宽屏再展现更多信息列。

---

## 4. 信息架构与布局

保持「左侧数据源 + 右侧编辑/结果」的两栏骨架（用户对当前心智模型已熟悉），只重排内部层级。

### 4.1 桌面宽屏（≥ 1100px）

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ① 顶部工具条  h=44                                                            │
│  [▶ 运行 ⌘⏎] [⧉ 新标签] │  [格式 ▾] [保存片段]   ...   [限制500 ⌄] [字段类型 ⌄]│
├───────────────┬──────────────────────────────────────────────────────────────┤
│ ② 数据源      │ ③ SQL 编辑器                                                  │
│ ┌ 数据源  [+] │  ┌────────────────────────────────────────────────────────┐   │
│ │ 🔍 搜索    │  │ 1  select                                    ● 就绪 0.42s│   │
│ │ ▾ sales.csv│  │ 2    *                                                  │   │
│ │   ├ id  #  │  │ 3  from "sales.csv"                                     │   │
│ │   ├ name T │  │ 4  limit 100                                            │   │
│ │   └ amt  # │  └────────────────────────────────────────────────────────┘   │
│ │ ▾ user.xlsx│  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ 可拖拽分隔 ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │
│ └────────────┤  ④ 结果区                                                     │
│   w:220~480  │  ┌ Query 1 ✕ ┊ Query 2 ✕ ┊ + ─────────────────────────────┐   │
│   可折叠      │  │ ⑤ 1,024 行 · 8 列 · 0.42s · ⚠ 已截断至 500 行  [导出 ▾] [复制 ▾]│
│              │  ├────────────────────────────────────────────────────────┤   │
│              │  │ ⑥ # │ id ▾ # │ name T │ amount # │ created 🕘 │ ...       │   │
│              │  │   1 │   1001 │ Alice  │   12,340 │ 2026-08-01 │           │   │
│              │  │   2 │   1002 │ (null) │      890 │ 2026-08-02 │           │   │
│              │  ├────────────────────────────────────────────────────────┤   │
│              │  │ ⑦ 每页 [50 ▾]  ‹ 1 2 3 … 21 ›   跳至 [__] 页             │   │
│              │  └────────────────────────────────────────────────────────┘   │
└───────────────┴──────────────────────────────────────────────────────────────┘
```

### 4.2 窄栏（< 1100px）

- 左栏自动折叠为 44px 图标条，悬浮展开为浮层（保留搜索框与树）。
- 结果区与编辑器由上下分割改为**结果区底部 Tab**：`结果 / 字段 / 消息`，节省垂直空间。
- 顶部工具条主操作保持常驻，次要操作收进 `⋯` 溢出菜单。

### 4.3 区域职责

| # | 区域 | 职责 | 组件 |
| --- | --- | --- | --- |
| ① | 顶部工具条 | 执行类主操作、编辑器辅助、查询设置 | `SqlToolbar.vue` |
| ② | 数据源面板 | 文件与字段浏览、搜索、上下文操作、拖拽导入 | `DataSourcePanel.vue` |
| ③ | SQL 编辑器 | 编写 / 选中执行 / 自动补全 / 状态显示 | `SqlEditor.vue` |
| ④ | 结果标签页 | 多结果集并存、状态点指示 | `ResultPanel.vue` |
| ⑤ | 结果状态栏 | 行数 / 列数 / 耗时 / 截断警示 / 导出 / 复制 | `ResultToolbar.vue` |
| ⑥ | 结果表格 | 虚拟滚动、类型对齐、NULL 弱化、列操作 | `ResultTable.vue` |
| ⑦ | 分页控制 | 每页条数、跳转、总览 | `ResultToolbar.vue` |

---

## 5. 设计语言（Design Tokens）

新增 `src/style/sql-workbench.scss`，只定义 token 与局部组件类，不覆盖全局 Element 样式。所有取值映射到 Element CSS 变量，保证跟随主题切换。

### 5.1 颜色与层级

| Token | 亮色取值 | 暗色取值 | 用途 |
| --- | --- | --- | --- |
| `--sql-bg-canvas` | `var(--el-bg-color-page)` | 同 | 最底层画布 |
| `--sql-bg-surface` | `var(--el-bg-color)` | 同 | 卡片/面板背景 |
| `--sql-bg-subtle` | `var(--el-fill-color-lighter)` | 同 | 表头、行号列、次要块 |
| `--sql-bg-hover` | `var(--el-fill-color-light)` | 同 | 行/节点悬停 |
| `--sql-bg-active` | `var(--el-color-primary-light-9)` | `rgba(64,158,255,.16)` | 选中行/激活 Tab |
| `--sql-border` | `var(--el-border-color-lighter)` | 同 | 分隔线、卡片描边 |
| `--sql-border-strong` | `var(--el-border-color)` | 同 | 聚焦态描边 |
| `--sql-text-1` | `var(--el-text-color-primary)` | 同 | 主文本 |
| `--sql-text-2` | `var(--el-text-color-regular)` | 同 | 次要文本（字段名、单位） |
| `--sql-text-3` | `var(--el-text-color-placeholder)` | 同 | 占位、NULL |
| `--sql-accent` | `var(--el-color-primary)` | 同 | 主操作、聚焦、激活 |
| `--sql-success` | `var(--el-color-success)` | 同 | 执行成功状态点 |
| `--sql-warning` | `var(--el-color-warning)` | 同 | 截断警示 |
| `--sql-danger` | `var(--el-color-danger)` | 同 | 执行失败、删除 |

> 要点：暗色不是简单反色。`--sql-bg-active` 在暗色下必须换成半透明叠加（`rgba`），否则 `primary-light-9` 在暗色下会是突兀的浅蓝块。

### 5.2 间距与圆角

- 8px 基础网格：`4 / 8 / 12 / 16 / 24`；控件内边距一律 `6px 12px`。
- 圆角：面板 `10px`、按钮/输入框 `6px`、标签徽标 `4px`、标签页 `6px 6px 0 0`。
- 分隔：区域之间用 `1px solid var(--sql-border)`，**不用阴影分割**；浮层（右键菜单、下拉）才用阴影 `0 6px 24px rgba(0,0,0,.12)`。

### 5.3 字号与字重

| 用途 | 字号 / 行高 | 字重 |
| --- | --- | --- |
| 面板标题 | 13px / 20px | 600 |
| 正文、字段名 | 13px / 20px | 400 |
| 次要说明、状态栏 | 12px / 18px | 400 |
| SQL 编辑器 | 13.5px / 21px（等宽） | 400 |
| 表格单元格 | 13px / 20px | 400 |
| 数值列 | 13px（等宽数字 `font-variant-numeric: tabular-nums`） | 400 |

### 5.4 动效

- 时长：`120ms` 微交互（hover、选中）、`180ms` 展开/收起、`240ms` 面板浮出。
- 曲线：`cubic-bezier(.4,0,.2,1)`。
- 原则：只动 `opacity` / `transform`；执行中只允许**状态点与按钮**动，表格不做骨架屏（数据量小且查询快，骨架屏反而制造焦虑）。
- `prefers-reduced-motion: reduce` 时全部关闭过渡。

### 5.5 图标

统一用 `@iconify/vue`（已在用），一套语义一个图标，禁止用无关图标隐喻：

| 语义 | 图标 |
| --- | --- |
| 运行 | `mdi:play` / 运行中 `mdi:loading`（旋转） |
| 新标签运行 | `mdi:play-box-outline` |
| 添加数据源 | `mdi:database-plus-outline` |
| 限制行数 | `mdi:filter-variant` + 文字 |
| 字段类型推断 | `mdi:text-recognition` + 文字 |
| 导出 | `mdi:tray-arrow-down` |
| 复制 | `mdi:content-copy` |
| 文件类型 | 沿用现有 `ri/file-*-line` 系列 |
| 字段类型 | `#` 数值 / `T` 文本 / `🕘` 时间 / `☑` 布尔 / `[]` 列表 / `?` 未知（沿用 `sqlFileTree.ts` 的 `getFieldIcon` 映射） |

---

## 6. 分区详细设计

### 6.1 顶部工具条（①）

**结构**：左侧主操作组 → 中间辅助组 → 右侧设置组（`ml-auto`）。

| 控件 | 类型 | 行为 | 视觉等级 |
| --- | --- | --- | --- |
| 运行 | 主按钮（filled） | 执行当前标签页；`⌘/Ctrl + Enter`；选中文本时只执行选中部分 | 主 |
| 新标签运行 | 次按钮（ghost + 边框） | 新建结果标签页执行 | 次 |
| 格式化 | 下拉 | `关键字大写` / `紧凑` / `展开`（基于轻量规则，不引入解析器） | 三 |
| 保存片段 | 图标按钮 | 把当前 SQL 存入本地片段库（pinia 持久化） | 三 |
| 限制行数 | 分段控件 | `不限 / 500 / 1000 / 5000`，当前值高亮 | 设置 |
| 字段类型 | 分段控件 | `自动推断 / 全部字符串` | 设置 |

**关键改动**：把 `View|Hide`、`Smoking|NoSmoking` 换成带文字的分段控件。`limit` 从布尔升级为数量选择（前端传参仍为布尔 + 后端 500，若需变数量需后端联动，见 §9）。

**状态联动**：运行期间主按钮进入 loading 且**禁用**其它执行入口，避免并发查询；工具条右侧显示全局状态胶囊：`● 就绪` / `◍ 运行中` / `● 失败`。

### 6.2 数据源面板（②）

**面板头**：标题「数据源」+ 文件数徽标 + 添加按钮（`mdi:database-plus-outline`）+ 搜索框（过滤文件与字段，命中词高亮）。

**文件节点**：
```
▾ [csv图标] sales.csv            ⌄ 12 字段
   ├ id        #
   ├ name      T
   └ amount    #
```
- 默认展开最近添加的文件，其余折叠（当前是全部平铺，文件一多就失控）。
- 文件行右侧用轻量徽标显示格式（`CSV` / `XLSX` / `PARQUET`）与字段数。
- 悬停行右侧浮出「移除」图标按钮，不必右键。

**字段节点**：类型图标 + 字段名；悬停浮出「插入」按钮，点击把 `"字段名"` 插入编辑器光标处（这是最高频的痛点，当前只能右键复制再粘贴）。

**空态**：
```
        ╭──────────────────────────╮
        │   [database-plus 图标]    │
        │   还没有数据源            │
        │   拖入文件，或点击下方按钮 │
        │   [ 添加数据文件 ]        │
        │   支持 CSV / Excel / JSON │
        │   / Parquet              │
        ╰──────────────────────────╯
```
整块区域作为放置目标（Tauri 的 `onDragDropEvent` 或先降级为点击添加）。

**右键菜单**：保留现有的复制文件名 / 复制路径 / 删除 / 复制字段名，新增「插入到编辑器」「复制为 `"name"`（带引号）」。菜单项补图标、快捷键提示与分隔线，禁用态用 `--sql-text-3`。

### 6.3 SQL 编辑器（③）

- **状态角标**：右上角常驻 `● 就绪 / ◍ 运行中 / ● 失败 · 0.42s`，失败时角标可点击展开错误详情浮层（当前错误只在 toast 停留 5s）。
- **自动补全**：新建 `src/utils/sql/aceCompleter.ts`，用 `sqlHistory.dtypesByFile` 的数据注册 Ace completer：
  - 输入 `from "` 后补全文件名（含类型图标与 meta 提示）；
  - 输入 `select ` 或表别名后补全该表字段（meta 显示 dtype）；
  - 补全 SQL 关键字与常用片段（`sel` → `select * from "" limit 100`）。
  - 文件增删时调用 `completer.update()` 刷新。
- **执行**：`⌘/Ctrl+Enter` 执行全部；`⌘/Ctrl+Shift+Enter` 或选中文本时执行选中片段（按钮 tooltip 同步提示）。
- **视觉**：保留 Ace 主题跟随明暗（`chrome` / `monokai`），但把 gutter 背景改为 `--sql-bg-subtle`、当前行高亮改为 `--sql-bg-active`、字号统一到 token，使编辑器与外围视觉连成一体。
- **默认内容**：保留现有示例，但改成可直接运行的模板注释，如 `-- 表名需与右侧文件名一致（含扩展名）`。

### 6.4 结果区（④⑤⑥⑦）

**标签页（④）**
- 每个标签显示：`状态点 + Query N + 行数徽标`，关闭按钮悬停才出现（减少视觉噪音）。
- 激活态用 `--sql-bg-active` + 顶部 2px `--sql-accent` 下划线。
- 标签右侧 `+` 新建空白查询标签。
- 标签上 hover 显示该标签对应的 SQL 前 40 字（tooltip）。

**状态栏（⑤）**

左：`1,024 行 · 8 列 · 0.42s`（数字用 tabular-nums）
中：`⚠ 已截断至 500 行，导出可获取完整结果`（仅 `limit` 生效且命中上限时显示，warning 色）
右：
- `导出 ▾`：下拉显式列出 `CSV / Excel / Parquet / JSON / NDJSON`，选中后弹保存对话框（**当前是让用户猜扩展名**，必须改）。
- `复制 ▾`：`复制为 CSV` / `复制为 JSON` / `复制表头`。
- `⤢` 最大化结果区（临时把编辑器压到最小，看完再还原）。

**表格（⑥）**
- 新增 `#` 行号列（粘性左侧，宽 56px，背景 `--sql-bg-subtle`）。
- 列头：`类型图标 + 列名`；数值列右对齐，文本列左对齐；列宽按内容自适应并记忆，可拖拽调整，双击列头分隔线自动适配。
- 单元格：`null` → `(null)` 斜体 `--sql-text-3`；空串 → 淡灰 `—`；数值列 `tabular-nums` 对齐。
- 行悬停 `--sql-bg-hover`，选中行 `--sql-bg-active`（点击选中，支持 `⌘/Ctrl+C` 复制整行为 TSV）。
- 大数据：行数 > 2000 时切换到 `el-table-v2`（element-plus 2.13 已含虚拟化表格），保持列头/对齐/弱化样式一致；`data` 继续保持 `markRaw`。

**分页（⑦）**
- `每页 [20/50/100/200 ▾]` + `‹ 1 2 … 21 ›` + `跳至 [__] 页` + 右侧 `显示第 1–50 条，共 1,024 条`。
- 当前 `simplified` 模式信息太少，仅在窄栏降级使用。

### 6.5 空态与错误态

| 场景 | 呈现 |
| --- | --- |
| 无数据源 | §6.2 空态（拖拽 + 添加按钮 + 支持格式说明） |
| 有数据源未执行 | 结果区中央：`还未执行查询 · ⌘⏎ 运行` + 示例语句按钮 |
| 执行中 | 标签状态点旋转 + 状态栏 `◍ 运行中`；表格保留上一次结果并降低透明度到 0.5（避免闪烁） |
| 查询成功但 0 行 | `查询成功，没有匹配的行`，并展示返回列 |
| 执行失败 | 结果区切换为错误视图：错误摘要 + 「查看详情」折叠原文 + 「复制错误」按钮；状态点红色，状态栏显示失败原因首行 |
| 导出中 | 状态栏 `◍ 导出中…`，完成后 toast + 状态栏短暂高亮 |

### 6.6 右键菜单

统一为 `ContextMenu.vue` 组件（数据驱动渲染），复用 `sqlFileTree.ts` 现有的 `contextMenuVisible / Position / Item` 状态与 `copyPath / copyFileName / copyFieldName / deleteFile` 动作。样式升级：圆角 8px、图标 + 文本 + 快捷键右对齐、分隔线、hover 用 `--sql-bg-active`、超屏时自动翻转方向（当前固定 `left/top` 会在右下角溢出屏幕）。

---

## 7. 交互规范

| 操作 | 快捷键 / 手势 | 说明 |
| --- | --- | --- |
| 执行 | `⌘/Ctrl + Enter` | 编辑器内；有选中文本时只执行选中部分 |
| 新标签执行 | `⌘/Ctrl + Shift + Enter` | |
| 切换结果标签 | `⌘/Ctrl + Alt + ←/→` | |
| 关闭结果标签 | `⌘/Ctrl + W`（标签聚焦时） | |
| 搜索数据源 | `⌘/Ctrl + K` | 聚焦左栏搜索框 |
| 折叠/展开左栏 | `⌘/Ctrl + B` | |
| 插入字段名 | 双击字段节点 / 悬停「插入」按钮 | 插入到编辑器光标处 |
| 复制单元格 | 单击选中行 → `⌘/Ctrl + C` | 复制为 TSV |
| 添加数据源 | 拖拽文件到面板 | |
| 调整列宽 | 拖拽列头分隔线 / 双击自适应 | |

- 所有快捷键在 tooltip 中标注，桌面端（Windows）显示 `Ctrl`，macOS 显示 `⌘`（用 `@tauri-apps/plugin-os` 判断平台）。
- 焦点管理：执行完成后焦点回到编辑器；标签切换焦点跟随。

---

## 8. 组件拆分与文件结构

当前 `sqlp.vue` 385 行内联全部逻辑，改版后拆分为：

```
src/views/queries/
├── sqlp.vue                        # 布局编排（el-splitter）+ 全局状态/快捷键
└── components/
    ├── SqlToolbar.vue              # ① 顶部工具条
    ├── DataSourcePanel.vue         # ② 面板头 + 搜索 + 树 + 空态
    ├── DataSourceNode.vue          # 文件/字段节点渲染（图标、徽标、悬停操作）
    ├── SqlEditor.vue               # ③ Ace 封装 + 状态角标 + 选中执行
    ├── ResultPanel.vue             # ④ 标签页 + ⑤ 状态栏 + ⑥ 表格 + ⑦ 分页
    ├── ResultToolbar.vue           # ⑤ ⑦ 状态栏与分页
    ├── ResultTable.vue             # ⑥ 表格（普通/虚拟滚动两套渲染）
    ├── EmptyState.vue              # 通用空态（图标/标题/描述/操作插槽）
    └── ContextMenu.vue             # 数据驱动右键菜单
src/utils/sql/
├── aceConfig.ts                    # 保留，补充主题 token 化
├── aceCompleter.ts                 # 新增：表名/字段名/关键字补全
├── sqlTabManager.ts                # 扩展 ResultTab 模型（见下）
└── sqlFileTree.ts                  # 保留，新增 insertField / 搜索过滤
src/style/sql-workbench.scss        # 新增：token 与局部样式
```

### `ResultTab` 模型扩展

```ts
export interface ResultTab {
  id: string;
  title: string;
  sql: string;                              // 新增：该标签执行的 SQL
  status: "idle" | "running" | "success" | "error";  // 新增
  elapsedMs: number | null;                 // 新增：前端计时
  truncated: boolean;                       // 新增：返回行数 === 限制值时为 true
  error: string | null;                     // 新增
  columns: { prop: string; label: string; dtype?: string }[];  // 新增 dtype
  data: any[];
  currentPage: number;
  pageSize: number;
  total: number;
}
```

`sqlTabManager.ts` 需要相应扩展：`executeQuery` 内记录 `performance.now()` 起止、捕获错误写入 `tab.error`、从 `result.schema` 把 dtype 合并进 `columns`、根据 `limit` 与返回行数设置 `truncated`。

---

## 9. 后端联动建议（可选，收益明确）

| 建议 | 现状 | 收益 |
| --- | --- | --- |
| `QueryResult` 增加 `total_rows: usize` | 只有截断后的 `data` | 可精确提示「共 12,480 行，仅展示前 500 行」，而不是靠「等于 500 就猜截断」 |
| `limit` 参数由 `bool` 改为 `Option<usize>` | 硬编码 500 | 支持工具条上的 500/1000/5000 选择，前端改造才有意义 |
| `QueryResult` 增加 `elapsed_ms: u128` | 无 | 后端真实耗时（含 Polars 执行与 JSON 序列化），比前端计时更准 |
| 增加 `query_df_to_json` 的行数上限保护 | 不限 | 避免 `limit=false` 时大结果集撑爆内存与前端渲染 |

> 后端改动非必须：前三项都有前端降级方案（前端计时、布尔 limit、按 500 判定截断）。建议 Phase 3 之后视情况推进。

---

## 10. 实施路线

| 阶段 | 内容 | 涉及文件 | 验收标准 |
| --- | --- | --- | --- |
| **P0 地基** | 新建 `sql-workbench.scss` 定义 token；页面容器改用 token；抽出 `EmptyState.vue` | `src/style/`、新增样式文件 | 明暗两主题下页面背景/边框/文本层级一致，无硬编码色 |
| **P1 工具条与状态** | `SqlToolbar.vue`；开关改为带文字分段控件；`ResultTab` 模型扩展（status/elapsed/error/truncated）；`ResultToolbar.vue` 状态栏 | `sqlp.vue`、`sqlTabManager.ts`、新增 2 个组件 | 运行/新标签/失败/截断四种状态都能在界面上稳定看到；无隐喻图标残留 |
| **P2 数据源面板** | `DataSourcePanel.vue` + `DataSourceNode.vue`；搜索、折叠记忆、类型徽标、悬停操作、空态、插入字段名；`ContextMenu.vue` | `sqlFileTree.ts`、新增 3 个组件 | 10+ 文件时面板仍可读；双击字段可插入编辑器；空态有明确引导 |
| **P3 编辑器与结果** | `SqlEditor.vue`（状态角标、选中执行、快捷键）；`aceCompleter.ts`；`ResultTable.vue`（行号列、类型对齐、NULL 弱化、列宽记忆、>2000 行切虚拟滚动）；`ResultPanel.vue` 标签改造 | `aceConfig.ts`、新增 4 个文件 | `⌘⏎` 执行；输入 `from "` 能补全表名；NULL 可辨；1 万行滚动流畅 |
| **P4 打磨** | 动效、焦点管理、窄栏折叠、导出格式下拉、复制为 CSV/JSON、最大化结果区、快捷键 tooltip | 全部 | 在 1280×800 与 1920×1080 下均无溢出/截断；暗色模式无对比度问题 |

每阶段结束跑一次 `pnpm typecheck`（注意：仓库当前存在既有的类型检查报错，只需保证**不新增**）与 `cargo check`。

---

## 11. 风险与注意事项

1. **窗口拖拽冲突（必看）**：`src/layout/index.vue` 的 `handleMouseDown` 会对**白名单之外**的元素触发 `appWindow.startDragging()`。新增的面板头、工具条空白处、状态栏等自定义区域若不在白名单内，鼠标按下会拖动整个窗口。解决：给这些容器加上白名单里已有的类名（如 `container`、`el-form`、`el-card__body`），或在 `sql-workbench.scss` 里统一加一个 `.no-drag` 类并把它补进 `handleMouseDown` 白名单。
2. **`el-table-v2` 差异**：虚拟表格的 API 与 `el-table` 不兼容（列定义、单元格插槽、样式类都不同），需要两套模板。`ResultTable.vue` 内部用 `v-if` 切换，对外保持同一 props 契约。
3. **Ace 主题与 token 对齐**：Ace 用自带主题 CSS，不认 CSS 变量。需要少量 `::v-deep` 覆盖（gutter、当前行、选区），且改主题时要同步。
4. **schema 补全的时效**：`dtypesByFile` 在添加文件时拉取（`SELECT * FROM "file" LIMIT 10`）。若用户替换了文件内容，schema 缓存会过期。建议文件节点增加「刷新 schema」动作。
5. **暗色对比度**：`--el-color-primary-light-9` 等浅色变量在暗色下表现差，凡是用作**背景**的地方都要换成半透明 `rgba`（见 §5.1）。
6. **不要引入重型依赖**：格式化、虚拟滚动、快捷键尽量用现有能力（`@vueuse/core` 的 `useMagicKeys`、`element-plus` 自带 `el-table-v2`），避免为 UI 改版增加包体积。
7. **结果数据保持 `markRaw`**：大数据集被 Vue 深度响应式化会造成明显卡顿，`sqlTabManager.ts` 现有写法要保留。

---

## 12. 验收清单

- [ ] 明暗两主题下，所有颜色走 token，无硬编码色值
- [ ] 工具条上不存在需要猜的图标，每个开关都有文字
- [ ] 执行状态、耗时、行数、列数、截断提示常驻可见
- [ ] `⌘/Ctrl + Enter` 可执行；选中文本时只执行选中部分
- [ ] 输入 `from "` 能补全已加载的文件名；输入字段名前缀能补全字段
- [ ] 双击字段名可插入编辑器光标处
- [ ] 结果表格有行号列、列头类型标识、数值右对齐、NULL 可辨
- [ ] 10,000 行结果滚动不卡顿（虚拟滚动生效）
- [ ] 导出时显式列出 5 种格式，不再依赖文件扩展名猜测
- [ ] 执行失败的完整错误信息可在界面上查看与复制
- [ ] 无数据源、未执行、0 行、失败四种空/错误态都有明确引导
- [ ] 左栏可折叠、可搜索，20 个文件时依然可读
- [ ] 所有自定义面板区域不会误触发窗口拖拽
- [ ] 1280×800 与 1920×1080 下布局无溢出
- [ ] 未新增类型检查报错

---

## 13. 实施状态（v1 已落地）

按本文档 P0–P4 全量实现，涉及文件：

| 类型 | 文件 |
| --- | --- |
| 新增样式 | `src/style/sql-workbench.scss`（token + 局部组件样式，`main.ts` 引入） |
| 新增页面组件 | `src/views/queries/components/`：SqlToolbar、DataSourcePanel、DataSourceNode、SqlEditor、ResultPanel、ResultToolbar、ResultTable、EmptyState、ContextMenu |
| 新增工具 | `src/utils/sql/aceCompleter.ts`（表名/字段名/关键字/片段补全）、`formatSql.ts`（三种格式化模式）、`dtype.ts`（类型徽标与数值判定） |
| 重写 | `src/views/queries/sqlp.vue`（从 385 行内联拆成布局编排 + 快捷键） |
| 扩展 | `sqlTabManager.ts`（ResultTab 增加 status/sql/elapsedMs/totalRows/truncated/error/dtype；新增复制为 CSV/JSON/列名） |
| 扩展 | `sqlFileTree.ts`（搜索过滤、刷新 schema、按节点移除、复制带引号字段名） |
| 扩展 | `sqlHistory.ts`（新增持久化的 snippets） |
| 后端 | `sqlp.rs`：`limit` 由 `bool` 改为 `Option<usize>`，`QueryResult` 增加 `total_rows` 与 `elapsed_ms` |
| 其他 | `src/layout/index.vue` 的窗口拖拽白名单加入 `.no-drag` |

### 两处有意偏离文档

1. **没有引入 `el-table-v2` 虚拟滚动**。文档 P3 原文是「>2000 行切换虚拟表格」，但结果区始终分页（默认每页 50 条），单页渲染行数与总量无关，虚拟化没有收益；而 `el-table-v2` 与 `el-table` 的 API 不兼容（列定义、插槽、样式类都不同），会额外背上两套模板的维护成本。真正的性能瓶颈是 `data` 被响应式化，这一点已由 `markRaw` 解决。
2. **片段库复用了现有 store**。文档原计划新建 pinia 片段库，实际把 `snippets` 加进已有的 `sqlHistory`（本身已持久化），少一个 store。

### 验证

- `cargo check` 通过
- `vue-tsc --noEmit --skipLibCheck` 与改版前的既有报错完全一致（18 条，均为仓库既有问题），无新增
- 用 vite 的构建 API 单独编译 `sqlp.vue`（绕过沙箱里会失败的 `@pureadmin/theme` 插件），8 个 SFC 全部转换成功
- 注：仓库的 `pnpm build` / `pnpm dev` 在本机环境会失败，原因是 `@pureadmin/theme` 在构建时清理 `node_modules/sass/LICENSE` 被安全删除层拦截，与本次改动无关

---

## 附：与现有实现的差异速查

| 项 | 现在 | 改版后 |
| --- | --- | --- |
| 左栏宽度 | 固定 `150` | `220` 起，可拖拽 220–480，可折叠为 44px 图标条 |
| 左栏空态 | `empty-text=""` 空白 | 插画 + 引导 + 添加按钮 + 支持格式 |
| limit 控件 | `View/Hide` 图标 | 分段控件 `不限 / 500 / 1000 / 5000` |
| dtype 控件 | `Smoking/NoSmoking` 图标 | 分段控件 `自动推断 / 全部字符串` |
| Run | 与其余图标等权 | 主按钮 + 快捷键提示 |
| 编辑器补全 | 仅关键字 | 关键字 + 文件名 + 字段名（带 dtype） |
| 结果 Tab | 只有标题 | 状态点 + 标题 + 行数徽标 + SQL 预览 |
| 结果元信息 | 无 | 行数 / 列数 / 耗时 / 截断警示 |
| 导出 | 单个图标，格式靠扩展名 | 下拉显式列出 5 种格式 |
| 表格列宽 | 全部固定 150px | 内容自适应 + 可拖拽 + 记忆 |
| NULL | 与空串无区别 | 斜体弱化 `(null)` |
| 分页 | `simplified` | 每页选择 + 跳转 + 区间说明 |
| 错误 | toast 5s | 错误视图 + 详情折叠 + 复制 |
