<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  toRef,
  watch
} from "vue";
import { useDynamicHeight } from "@/utils/utils";
import { useSqlHistory } from "@/store/modules/sqlHistory";
import { useSqlTabManager } from "@/utils/sql/sqlTabManager";
import { formatSql, type SqlFormatMode } from "@/utils/sql/formatSql";
import type { SqlCompletionSource } from "@/utils/sql/aceCompleter";
import { message } from "@/utils/message";
import { t } from "@/locales";
import SqlToolbar from "./components/SqlToolbar.vue";
import DataSourcePanel from "./components/DataSourcePanel.vue";
import SqlEditor from "./components/SqlEditor.vue";
import ResultPanel from "./components/ResultPanel.vue";

const DEFAULT_SQL =
  '-- The table name must match the file name (including the extension) in the data source panel \nselect\n*\nfrom "filename"\nlimit 100';

const sqlQuery = ref(DEFAULT_SQL);
const queryOptions = reactive({
  varchar: true,
  limitRows: 500
});
const collapsed = ref(false);
const maximized = ref(false);

const { dynamicHeight } = useDynamicHeight(36);
const sqlHistory = useSqlHistory();
const hasData = computed(() => sqlHistory.path !== "");

const editorRef = ref<any>(null);
const panelRef = ref<any>(null);

/** 补全数据源：直接复用已缓存的 schema */
const sources = computed<SqlCompletionSource[]>(() =>
  Object.entries(sqlHistory.dtypesByFile).map(([name, schema]) => ({
    name,
    fields: Object.entries(schema).map(([field, dtype]) => ({
      name: field,
      dtype
    }))
  }))
);

const {
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
} = useSqlTabManager({
  sqlQuery,
  path: computed(() => sqlHistory.path),
  varchar: toRef(queryOptions, "varchar"),
  limitRows: toRef(queryOptions, "limitRows")
});

const sideWidth = ref(240);

watch(collapsed, value => {
  sideWidth.value = value ? 44 : 240;
});

async function handleRun(sql?: string) {
  if (isBusy.value) return;
  await runCurrentTab(sql);
}

async function handleRunNew(sql?: string) {
  if (isBusy.value) return;
  await runNewTab(sql);
}

function handleFormat(mode: SqlFormatMode) {
  sqlQuery.value = formatSql(sqlQuery.value, mode);
}

async function handleExport(format: string) {
  await exportActiveTab(format);
}

function handleCopy(kind: "csv" | "json" | "headers") {
  if (kind === "csv") copyAsCsv();
  else if (kind === "json") copyAsJson();
  else copyHeaders();
}

async function handleCopyError() {
  const text = activeTab.value?.error;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    message(t("sql.message.copiedError"), { type: "success" });
  } catch {
    message(t("sql.message.copyFailed"), { type: "error" });
  }
}

async function handleRetry() {
  if (!activeTab.value) return;
  await runCurrentTab(activeTab.value.sql);
}

function insertText(text: string) {
  editorRef.value?.insertText(text);
}

function onKeydown(event: KeyboardEvent) {
  const mod = event.ctrlKey || event.metaKey;
  if (!mod) return;
  const key = event.key.toLowerCase();

  if (key === "b") {
    event.preventDefault();
    collapsed.value = !collapsed.value;
    return;
  }

  if (key === "k") {
    event.preventDefault();
    if (collapsed.value) collapsed.value = false;
    nextTick(() => panelRef.value?.focusSearch());
    return;
  }

  if (key === "enter") {
    const target = event.target as HTMLElement | null;
    if (target?.closest(".sql-editor")) return;
    event.preventDefault();
    if (event.shiftKey) handleRunNew();
    else handleRun();
  }
}

onMounted(() => {
  document.addEventListener("keydown", onKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <div
    class="sql-workbench flex flex-col"
    :style="{ height: dynamicHeight + 'px' }"
  >
    <SqlToolbar
      :busy="isBusy"
      :has-data="hasData"
      v-model:limit-rows="queryOptions.limitRows"
      v-model:varchar="queryOptions.varchar"
      @run="handleRun()"
      @run-new="handleRunNew()"
      @format="handleFormat"
    />

    <el-splitter class="flex-1 min-h-0">
      <el-splitter-panel
        v-model:size="sideWidth"
        :min="collapsed ? 44 : 180"
        :max="480"
        :resizable="!collapsed"
      >
        <DataSourcePanel
          ref="panelRef"
          :collapsed="collapsed"
          @toggle-collapse="collapsed = !collapsed"
          @insert="insertText"
        />
      </el-splitter-panel>

      <el-splitter-panel>
        <el-splitter layout="vertical">
          <el-splitter-panel
            v-if="!maximized"
            :size="tabs.length > 0 ? '45%' : '70%'"
            min="15"
          >
            <SqlEditor
              ref="editorRef"
              v-model="sqlQuery"
              :status="activeTab?.status ?? 'idle'"
              :elapsed-ms="activeTab?.elapsedMs ?? null"
              :sources="sources"
              @run="handleRun"
              @run-new="handleRunNew"
            />
          </el-splitter-panel>

          <el-splitter-panel min="20">
            <div class="sql-panel">
              <ResultPanel
                :tabs="tabs"
                :active-tab-id="activeTabId"
                :paged-table-data="pagedTableData"
                :maximized="maximized"
                @update:active-tab-id="id => (activeTabId = id)"
                @remove="removeTab"
                @add="addEmptyTab"
                @export="handleExport"
                @copy="handleCopy"
                @toggle-maximize="maximized = !maximized"
                @size-change="sizeChange"
                @current-change="currentChange"
                @retry="handleRetry"
                @copy-error="handleCopyError"
              />
            </div>
          </el-splitter-panel>
        </el-splitter>
      </el-splitter-panel>
    </el-splitter>
  </div>
</template>
