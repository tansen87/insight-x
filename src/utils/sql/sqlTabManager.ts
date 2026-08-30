import type { Ref } from "vue";
import { ref, computed, triggerRef, markRaw } from "vue";
import { v4 as uuidv4 } from "uuid";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { message } from "@/utils/message";
import { t } from "@/locales";
import { useSkiprows } from "@/store/modules/options";

export type TabStatus = "idle" | "running" | "success" | "error";

export interface ResultColumn {
  prop: string;
  label: string;
  /** Polars dtype，来自后端 schema */
  dtype?: string;
}

export interface ResultTab {
  id: string;
  title: string;
  /** 该标签实际执行的 SQL */
  sql: string;
  status: TabStatus;
  /** 后端返回的查询耗时（毫秒） */
  elapsedMs: number | null;
  /** 结果集总行数（后端全量，不受 limit 影响） */
  totalRows: number;
  /** 当前已加载到前端的行数，分页基于此值 */
  total: number;
  /** 结果被 limit 截断 */
  truncated: boolean;
  error: string | null;
  columns: ResultColumn[];
  data: any[];
  currentPage: number;
  pageSize: number;
}

interface QueryResponse {
  data: string;
  schema: Record<string, string>;
  columns: string[];
  total_rows: number;
  elapsed_ms: number;
}

interface ResultTabOptions {
  sqlQuery: Ref<string>;
  path: Ref<string>;
  varchar: Ref<boolean>;
  /** 0 表示不限行数 */
  limitRows: Ref<number>;
}

const skiprows = useSkiprows();

/** 把毫秒格式化成易读的耗时文本；超过 1 分钟时同时显示分和秒 */
export function formatElapsed(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;

  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - minutes * 60;

  if (minutes === 0) return `${formatSeconds(seconds)} s`;
  return `${minutes} min ${formatSeconds(seconds)} s`;
}

/** 秒数最多保留 2 位小数，整数时不带小数 */
function formatSeconds(seconds: number): string {
  const rounded = Math.round(seconds * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

/** 按千分位格式化数字，用于状态栏展示 */
export function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

/** CSV 单元格转义 */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(tab: ResultTab): string {
  const header = tab.columns.map(c => csvCell(c.label)).join(",");
  const body = tab.data
    .map(row => tab.columns.map(c => csvCell(row[c.prop])).join(","))
    .join("\n");
  return body ? `${header}\n${body}` : header;
}

async function writeClipboard(text: string, okMsg: string) {
  try {
    await navigator.clipboard.writeText(text);
    message(okMsg, { type: "success" });
  } catch (err) {
    message(t("sql.message.copyFailedDetail", { error: String(err) }), {
      type: "error"
    });
  }
}

export function useSqlTabManager(options: ResultTabOptions) {
  const tabs = ref<ResultTab[]>([]);
  const activeTabId = ref<string | null>(null);

  const activeTab = computed(() => {
    return tabs.value.find(t => t.id === activeTabId.value) || null;
  });

  const pagedTableData = computed(() => {
    if (!activeTab.value) return [];
    const start = (activeTab.value.currentPage - 1) * activeTab.value.pageSize;
    return activeTab.value.data.slice(start, start + activeTab.value.pageSize);
  });

  /** 是否存在正在执行的查询，用于禁用并发执行入口 */
  const isBusy = computed(() => tabs.value.some(t => t.status === "running"));

  function createEmptyTab(): ResultTab {
    const count = tabs.value.length + 1;
    return {
      id: uuidv4(),
      title: t("sql.result.tabTitle", { index: count }),
      sql: "",
      status: "idle",
      elapsedMs: null,
      totalRows: 0,
      total: 0,
      truncated: false,
      error: null,
      columns: [],
      data: [],
      currentPage: 1,
      pageSize: 50
    };
  }

  async function executeQuery(
    tab: ResultTab,
    write: boolean,
    writeOptions?: {
      outputPath?: string;
      writeFormat?: string;
    },
    /** 传入时执行该语句（用于「只运行选中部分」），否则执行编辑器内容 */
    sqlOverride?: string
  ): Promise<boolean> {
    const { sqlQuery, path, varchar, limitRows } = options;
    const script = sqlOverride ?? sqlQuery.value;

    // 对齐到响应式代理：runCurrentTab/runNewTab 首次运行时会传入
    // createEmptyTab 返回的「原始对象」，而 tabs 数组内实际存储的是它的
    // 响应式代理。若直接改原始对象，不经过 proxy 的 set 拦截，视图不会更新，
    // 表现为「查询结果要切一下 tab 才显示」。这里统一换成数组内的代理引用。
    tab = tabs.value.find(t => t.id === tab.id) ?? tab;

    if (path.value === "") {
      message(t("sql.message.noDataSource"), { type: "warning" });
      return false;
    }

    if (script.trim() === "") {
      message(t("sql.message.emptySql"), { type: "warning" });
      return false;
    }

    // 记录本次执行的 SQL，便于标签页回显
    tab.sql = script;
    tab.status = "running";
    tab.error = null;
    if (!write) {
      tab.columns = [];
      tab.data = [];
      tab.total = 0;
      tab.totalRows = 0;
      tab.truncated = false;
    }
    triggerRef(tabs);

    try {
      const rawResult = await invoke("query", {
        path: path.value,
        sqlQuery: script,
        varchar: varchar.value,
        limit: limitRows.value > 0 ? limitRows.value : null,
        write,
        writeFormat: writeOptions?.writeFormat || "csv",
        outputPath: writeOptions?.outputPath || "",
        skiprows: skiprows.skiprows
      });

      if (!write) {
        const result: QueryResponse =
          typeof rawResult === "string" ? JSON.parse(rawResult) : rawResult;
        const jsonData = JSON.parse(result.data || "[]");
        const arrayData = Array.isArray(jsonData) ? jsonData : [jsonData];
        const schema = result.schema || {};

        tab.columns = (result.columns || []).map(key => ({
          prop: key,
          label: key,
          dtype: schema[key]
        }));
        tab.data = markRaw(arrayData);
        tab.total = arrayData.length;
        tab.totalRows = result.total_rows ?? arrayData.length;
        tab.truncated = tab.totalRows > tab.total;
        tab.elapsedMs = result.elapsed_ms ?? null;
        tab.currentPage = 1;
        tab.status = "success";
        triggerRef(tabs);
      } else {
        tab.status = "success";
        message(t("sql.message.exportDone"), { type: "success" });
      }
      return true;
    } catch (err) {
      const text = err?.toString?.() ?? String(err);
      tab.status = "error";
      tab.error = text;
      if (write) message(text, { type: "error", duration: 5000 });
      triggerRef(tabs);
      return false;
    }
  }

  async function runCurrentTab(sqlOverride?: string) {
    if (!activeTab.value) {
      const newTab = createEmptyTab();
      tabs.value.push(newTab);
      activeTabId.value = newTab.id;
      await executeQuery(newTab, false, undefined, sqlOverride);
      return;
    }
    await executeQuery(activeTab.value, false, undefined, sqlOverride);
  }

  async function runNewTab(sqlOverride?: string) {
    const newTab = createEmptyTab();
    tabs.value.push(newTab);
    activeTabId.value = newTab.id;
    await executeQuery(newTab, false, undefined, sqlOverride);
  }

  function sizeChange(newSize: number) {
    if (activeTab.value) {
      activeTab.value.pageSize = newSize;
      activeTab.value.currentPage = 1;
    }
  }

  function currentChange(newPage: number) {
    if (activeTab.value) {
      activeTab.value.currentPage = newPage;
    }
  }

  async function exportActiveTab(writeFormat?: string) {
    if (!activeTab.value) return;

    const outputPath = await save({
      title: "Export Data",
      defaultPath: `export_${new Date().getTime()}`,
      filters: [
        { name: "CSV", extensions: ["csv"] },
        { name: "Excel", extensions: ["xlsx"] },
        { name: "Parquet", extensions: ["parquet"] },
        { name: "Json", extensions: ["json"] },
        { name: "NdJson", extensions: ["jsonl"] }
      ]
    });

    if (!outputPath) return;

    // 显式选择了格式就以选择为准，否则沿用保存对话框的扩展名
    let format = writeFormat || "csv";
    if (!writeFormat) {
      if (outputPath.endsWith(".xlsx")) format = "xlsx";
      else if (outputPath.endsWith(".parquet")) format = "parquet";
      else if (outputPath.endsWith(".json")) format = "json";
      else if (outputPath.endsWith(".jsonl")) format = "jsonl";
    }

    await executeQuery(activeTab.value, true, {
      outputPath,
      writeFormat: format
    });
  }

  function removeTab(targetId: string) {
    const index = tabs.value.findIndex(t => t.id === targetId);
    if (index !== -1) {
      tabs.value.splice(index, 1);
      if (activeTabId.value === targetId) {
        activeTabId.value = tabs.value.length > 0 ? tabs.value[0].id : null;
      }
    }
  }

  function addEmptyTab() {
    const newTab = createEmptyTab();
    tabs.value.push(newTab);
    activeTabId.value = newTab.id;
  }

  function copyAsCsv() {
    if (!activeTab.value || activeTab.value.data.length === 0) return;
    writeClipboard(toCsv(activeTab.value), t("sql.message.copiedAsCsv"));
  }

  function copyAsJson() {
    if (!activeTab.value || activeTab.value.data.length === 0) return;
    writeClipboard(
      JSON.stringify(activeTab.value.data, null, 2),
      t("sql.message.copiedAsJson")
    );
  }

  function copyHeaders() {
    if (!activeTab.value || activeTab.value.columns.length === 0) return;
    writeClipboard(
      activeTab.value.columns.map(c => c.label).join("\n"),
      t("sql.message.copiedHeaders")
    );
  }

  return {
    tabs,
    activeTabId,
    activeTab,
    pagedTableData,
    isBusy,
    runCurrentTab,
    runNewTab,
    sizeChange,
    currentChange,
    exportActiveTab,
    removeTab,
    addEmptyTab,
    copyAsCsv,
    copyAsJson,
    copyHeaders
  };
}
