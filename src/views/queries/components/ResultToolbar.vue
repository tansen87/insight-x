<script setup lang="ts">
import { computed } from "vue";
import { Icon } from "@iconify/vue";
import downloadIcon from "@iconify-icons/ri/download-2-line";
import copyIcon from "@iconify-icons/ri/file-copy-line";
import fullscreenIcon from "@iconify-icons/ri/fullscreen-line";
import warnIcon from "@iconify-icons/ri/error-warning-line";
import arrowDownIcon from "@iconify-icons/ri/arrow-down-s-line";
import type { ResultTab } from "@/utils/sql/sqlTabManager";
import { formatCount, formatElapsed } from "@/utils/sql/sqlTabManager";
import { useI18n } from "@/locales";

const props = defineProps<{
  tab: ResultTab | null;
  maximized: boolean;
}>();

const emit = defineEmits<{
  (e: "export", format: string): void;
  (e: "copy", kind: "csv" | "json" | "headers"): void;
  (e: "toggle-maximize"): void;
  (e: "size-change", size: number): void;
  (e: "current-change", page: number): void;
}>();

const { t } = useI18n();

const pageSizeOptions = [20, 50, 100, 200];

const hasData = computed(() => !!props.tab && props.tab.data.length > 0);

const rangeText = computed(() => {
  const tab = props.tab;
  if (!tab || tab.total === 0) return "";
  const start = (tab.currentPage - 1) * tab.pageSize + 1;
  const end = Math.min(tab.currentPage * tab.pageSize, tab.total);
  return t("sql.result.range", {
    from: formatCount(start),
    to: formatCount(end),
    total: formatCount(tab.total)
  });
});

const rowsText = computed(() => {
  const tab = props.tab;
  if (!tab) return "";
  if (tab.truncated) {
    return t("sql.result.rowsTruncated", {
      loaded: formatCount(tab.total),
      total: formatCount(tab.totalRows)
    });
  }
  return t("sql.result.rows", { count: formatCount(tab.total) });
});

const columnsText = computed(() =>
  t("sql.result.columns", { count: props.tab?.columns.length ?? 0 })
);
</script>

<template>
  <div v-if="tab" class="sql-statusbar no-drag">
    <span>
      <span class="sql-statusbar__num">{{ rowsText }}</span>
      · {{ columnsText }} ·
      <span class="sql-statusbar__num">{{ formatElapsed(tab.elapsedMs) }}</span>
    </span>

    <el-tooltip
      v-if="tab.truncated"
      :content="t('sql.result.truncatedTip')"
      effect="light"
      placement="bottom"
    >
      <span class="sql-warn-chip">
        <Icon :icon="warnIcon" width="13" height="13" />
        {{ t("sql.result.truncated") }}
      </span>
    </el-tooltip>

    <div class="sql-statusbar__spacer" />

    <el-dropdown
      trigger="click"
      placement="bottom-end"
      :disabled="!hasData"
      @command="format => emit('export', format as string)"
    >
      <el-button size="small" :disabled="!hasData">
        <template #icon>
          <Icon :icon="downloadIcon" width="14" height="14" />
        </template>
        {{ t("sql.result.export")
        }}<Icon :icon="arrowDownIcon" width="14" height="14" />
      </el-button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="csv">
            {{ t("sql.result.exportCsv") }}
          </el-dropdown-item>
          <el-dropdown-item command="xlsx">
            {{ t("sql.result.exportExcel") }}
          </el-dropdown-item>
          <el-dropdown-item command="parquet">
            {{ t("sql.result.exportParquet") }}
          </el-dropdown-item>
          <el-dropdown-item command="json">
            {{ t("sql.result.exportJson") }}
          </el-dropdown-item>
          <el-dropdown-item command="jsonl">
            {{ t("sql.result.exportNdjson") }}
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <el-dropdown
      trigger="click"
      placement="bottom-end"
      :disabled="!hasData"
      @command="kind => emit('copy', kind as 'csv' | 'json' | 'headers')"
    >
      <el-button size="small" :disabled="!hasData">
        <template #icon>
          <Icon :icon="copyIcon" width="14" height="14" />
        </template>
        {{ t("sql.result.copy")
        }}<Icon :icon="arrowDownIcon" width="14" height="14" />
      </el-button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="csv">
            {{ t("sql.result.copyCsv") }}
          </el-dropdown-item>
          <el-dropdown-item command="json">
            {{ t("sql.result.copyJson") }}
          </el-dropdown-item>
          <el-dropdown-item command="headers">
            {{ t("sql.result.copyHeaders") }}
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <el-tooltip
      :content="maximized ? t('sql.result.restore') : t('sql.result.maximize')"
      effect="light"
      placement="bottom"
    >
      <el-button size="small" @click="emit('toggle-maximize')">
        <template #icon>
          <Icon :icon="fullscreenIcon" width="14" height="14" />
        </template>
      </el-button>
    </el-tooltip>
  </div>

  <div v-if="tab && tab.total > 0" class="sql-pager no-drag">
    <span>{{ t("sql.result.perPage") }}</span>
    <el-select
      :model-value="tab.pageSize"
      size="small"
      style="width: 80px"
      @update:model-value="size => emit('size-change', size as number)"
    >
      <el-option
        v-for="size in pageSizeOptions"
        :key="size"
        :label="String(size)"
        :value="size"
      />
    </el-select>

    <el-pagination
      :current-page="tab.currentPage"
      :page-size="tab.pageSize"
      :total="tab.total"
      layout="prev, pager, next"
      :pager-count="7"
      size="small"
      background
      @current-change="page => emit('current-change', page)"
    />

    <div class="sql-pager__spacer" />
    <span>{{ rangeText }}</span>
  </div>
</template>
