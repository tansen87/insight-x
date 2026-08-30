import type { MessageDictionary } from "./types";

const zhCN: MessageDictionary = {
  sql: {
    toolbar: {
      run: "运行",
      runNew: "在新标签运行",
      addDataFirst: "请先添加数据源",
      format: "格式化",
      formatUpper: "关键字大写",
      formatExpand: "按子句展开",
      formatCompact: "压缩为单行",
      limitRows: "限制行数",
      limitUnlimited: "不限",
      fieldTypes: "字段类型",
      dtypeAuto: "自动推断",
      dtypeString: "全部字符串",
      status: {
        ready: "就绪",
        running: "运行中",
        failed: "失败"
      }
    },
    dataSource: {
      title: "数据源",
      add: "添加数据文件",
      collapse: "折叠面板",
      expand: "展开面板",
      searchPlaceholder: "搜索文件与字段",
      emptyTitle: "还没有数据源",
      emptyDesc:
        "添加 CSV、Excel、JSON 或 Parquet 文件后,就可以用 SQL 查询它们",
      noMatch: "没有匹配的文件或字段",
      fieldCount: "{count} 字段",
      refresh: "刷新 schema",
      remove: "移除数据源",
      insert: "插入到编辑器",
      insertHint: "双击",
      copyName: "复制文件名",
      copyPath: "复制路径",
      copyFieldName: "复制字段名",
      copyQuoted: '复制为 "字段"'
    },
    editor: {
      statusIdle: "就绪",
      statusRunning: "运行中",
      statusSuccess: "成功",
      statusError: "失败"
    },
    result: {
      summary: "{rows} 行 · {columns} 列 · {elapsed}",
      rows: "{count} 行",
      columns: "{count} 列",
      rowsTruncated: "{loaded} / {total} 行",
      truncated: "已截断",
      truncatedTip: "结果已按限制行数截断，导出可获得完整结果",
      export: "导出",
      exportCsv: "CSV",
      exportExcel: "Excel",
      exportParquet: "Parquet",
      exportJson: "JSON",
      exportNdjson: "NDJSON",
      copy: "复制",
      copyCsv: "复制为 CSV",
      copyJson: "复制为 JSON",
      copyHeaders: "复制列名",
      maximize: "最大化结果区",
      restore: "还原结果区",
      perPage: "每页",
      range: "显示 {from}–{to}，共 {total} 条",
      emptyTitle: "还没有查询结果",
      emptyDesc: "在上方编写 SQL，按 {mod} + Enter 运行",
      noRowsTitle: "查询成功，没有匹配的行",
      noRowsDesc:
        "语句可以正常执行，但结果集为空。检查 WHERE 条件或数据文件是否正确。",
      errorTitle: "查询失败",
      retry: "重试",
      copyError: "复制错误",
      tabTitle: "查询 {index}",
      emptyTab: "空查询",
      unknownType: "未知类型"
    },
    message: {
      noDataSource: "还没有数据源，请先添加文件",
      emptySql: "SQL 语句为空",
      exportDone: "导出完成",
      copiedAsCsv: "已复制为 CSV",
      copiedAsJson: "已复制为 JSON",
      copiedHeaders: "已复制列名",
      copiedError: "已复制错误信息",
      copiedPath: "已复制文件路径",
      copiedFileName: "已复制文件名",
      copiedFieldName: "已复制字段名",
      copiedQuoted: "已复制带引号的字段名",
      copyFailed: "复制失败",
      copyFailedDetail: "复制失败：{error}",
      loadSchemaFailed: "加载 {file} 的 schema 失败：{error}",
      refreshed: "已刷新「{file}」",
      refreshFailed: "刷新失败：{error}",
      deleted: "已删除「{file}」"
    }
  }
};

export default zhCN;
