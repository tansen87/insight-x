<script setup lang="ts">
import { computed } from "vue";
import { Icon } from "@iconify/vue";
import tableIcon from "@iconify-icons/ri/table-line";
import errorIcon from "@iconify-icons/ri/error-warning-line";
import copyIcon from "@iconify-icons/ri/file-copy-line";
import EmptyState from "./EmptyState.vue";
import ResultToolbar from "./ResultToolbar.vue";
import ResultTable from "./ResultTable.vue";
import type { ResultTab } from "@/utils/sql/sqlTabManager";
import { useI18n } from "@/locales";

const props = defineProps<{
  tabs: ResultTab[];
  activeTabId: string | null;
  pagedTableData: any[];
  maximized: boolean;
}>();

const emit = defineEmits<{
  (e: "update:activeTabId", id: string): void;
  (e: "remove", id: string): void;
  (e: "add"): void;
  (e: "export", format: string): void;
  (e: "copy", kind: "csv" | "json" | "headers"): void;
  (e: "toggle-maximize"): void;
  (e: "size-change", size: number): void;
  (e: "current-change", page: number): void;
  (e: "retry"): void;
  (e: "copy-error"): void;
}>();

const { t } = useI18n();

const modKey = computed(() =>
  /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
    ? "⌘"
    : "Ctrl"
);

const activeTab = computed(
  () => props.tabs.find(t => t.id === props.activeTabId) || null
);

const rowOffset = computed(() => {
  const tab = activeTab.value;
  if (!tab) return 0;
  return (tab.currentPage - 1) * tab.pageSize;
});

const activeId = computed({
  get: () => props.activeTabId,
  set: (id: string) => emit("update:activeTabId", id)
});
</script>

<template>
  <div class="sql-result">
    <el-tabs
      v-model="activeId"
      class="sql-tabs no-drag"
      type="card"
      closable
      addable
      @tab-remove="id => emit('remove', id as string)"
      @tab-add="emit('add')"
    >
      <el-tab-pane
        v-for="tab in tabs"
        :key="tab.id"
        :name="tab.id"
        :label="tab.title"
      >
        <template #label>
          <span class="sql-tab-label">
            <span
              class="sql-tab-dot"
              :class="{
                'sql-tab-dot--running': tab.status === 'running',
                'sql-tab-dot--success': tab.status === 'success',
                'sql-tab-dot--error': tab.status === 'error'
              }"
            />
            <span>{{ tab.title }}</span>
          </span>
        </template>
      </el-tab-pane>
    </el-tabs>

    <div v-if="activeTab?.status === 'error'" class="sql-error">
      <div class="sql-error__title">
        <Icon :icon="errorIcon" width="15" height="15" />
        {{ t("sql.result.errorTitle") }}
      </div>
      <div class="sql-error__detail">{{ activeTab.error }}</div>
      <div class="flex gap-2 mt-2">
        <el-button size="small" @click="emit('retry')">
          {{ t("sql.result.retry") }}
        </el-button>
        <el-button size="small" @click="emit('copy-error')">
          <template #icon>
            <Icon :icon="copyIcon" />
          </template>
          {{ t("sql.result.copyError") }}
        </el-button>
      </div>
    </div>

    <EmptyState
      v-else-if="!activeTab"
      :title="t('sql.result.emptyTitle')"
      :description="t('sql.result.emptyDesc', { mod: modKey })"
    >
      <template #icon>
        <Icon :icon="tableIcon" />
      </template>
    </EmptyState>

    <EmptyState
      v-else-if="activeTab.status === 'success' && activeTab.data.length === 0"
      :title="t('sql.result.noRowsTitle')"
      :description="t('sql.result.noRowsDesc')"
    >
      <template #icon>
        <Icon :icon="tableIcon" />
      </template>
    </EmptyState>

    <template v-else-if="activeTab">
      <ResultToolbar
        :tab="activeTab"
        :maximized="maximized"
        @export="f => emit('export', f)"
        @copy="k => emit('copy', k)"
        @toggle-maximize="emit('toggle-maximize')"
        @size-change="s => emit('size-change', s)"
        @current-change="p => emit('current-change', p)"
      />
      <ResultTable
        v-if="activeTab.data.length > 0"
        :columns="activeTab.columns"
        :data="pagedTableData"
        :start-index="rowOffset"
        :tab-id="activeTab.id"
      />
    </template>
  </div>
</template>
