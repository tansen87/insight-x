import type { MessageDictionary } from "./types";

const en: MessageDictionary = {
  sql: {
    toolbar: {
      run: "Run",
      runNew: "Run in new tab",
      addDataFirst: "Add a data source first",
      format: "Format",
      formatUpper: "Uppercase keywords",
      formatExpand: "Expand clauses",
      formatCompact: "Compact to one line",
      limitRows: "Row limit",
      limitUnlimited: "Unlimited",
      fieldTypes: "Field types",
      dtypeAuto: "Auto infer",
      dtypeString: "All strings",
      status: {
        ready: "Ready",
        running: "Running",
        failed: "Failed"
      }
    },
    dataSource: {
      title: "Data",
      add: "Add data file",
      collapse: "Collapse panel",
      expand: "Expand panel",
      searchPlaceholder: "Search files and fields",
      emptyTitle: "No data sources yet",
      emptyDesc:
        "Add CSV, Excel, JSON or Parquet files, then you can query them with SQL",
      noMatch: "No matching file or field",
      fieldCount: "{count} fields",
      refresh: "Refresh schema",
      remove: "Remove data source",
      insert: "Insert into editor",
      insertHint: "Double-click",
      copyName: "Copy file name",
      copyPath: "Copy path",
      copyFieldName: "Copy field name",
      copyQuoted: 'Copy as "field"'
    },
    editor: {
      statusIdle: "Ready",
      statusRunning: "Running",
      statusSuccess: "Succeeded",
      statusError: "Failed"
    },
    result: {
      summary: "{rows} rows · {columns} columns · {elapsed}",
      rows: "{count} rows",
      columns: "{count} columns",
      rowsTruncated: "{loaded} / {total} rows",
      truncated: "Truncated",
      truncatedTip:
        "Result was truncated by the row limit. Export to get the full result.",
      export: "Export",
      exportCsv: "CSV",
      exportExcel: "Excel",
      exportParquet: "Parquet",
      exportJson: "JSON",
      exportNdjson: "NDJSON",
      copy: "Copy",
      copyCsv: "Copy as CSV",
      copyJson: "Copy as JSON",
      copyHeaders: "Copy column names",
      maximize: "Maximize results",
      restore: "Restore results",
      perPage: "Per page",
      range: "Showing {from}–{to} of {total}",
      emptyTitle: "No query results yet",
      emptyDesc: "Write SQL above, then press {mod} + Enter to run",
      noRowsTitle: "Query succeeded, no matching rows",
      noRowsDesc:
        "The statement ran fine but returned nothing. Check the WHERE clause or the data file.",
      errorTitle: "Query failed",
      retry: "Retry",
      copyError: "Copy error",
      tabTitle: "Query {index}",
      emptyTab: "Empty query",
      unknownType: "unknown"
    },
    message: {
      noDataSource: "No data source. Add a file first.",
      emptySql: "SQL script is empty.",
      exportDone: "Export done",
      copiedAsCsv: "Copied as CSV",
      copiedAsJson: "Copied as JSON",
      copiedHeaders: "Copied column names",
      copiedError: "Copied error message",
      copiedPath: "Copied file path",
      copiedFileName: "Copied file name",
      copiedFieldName: "Copied field name",
      copiedQuoted: "Copied quoted field name",
      copyFailed: "Copy failed",
      copyFailedDetail: "Copy failed: {error}",
      loadSchemaFailed: "Failed to load schema for {file}: {error}",
      refreshed: 'Refreshed "{file}"',
      refreshFailed: "Refresh failed: {error}",
      deleted: 'Deleted "{file}"'
    }
  }
};

export default en;
