<script setup lang="ts">
import { computed } from "vue";
import { Icon } from "@iconify/vue";
import playIcon from "@iconify-icons/ri/play-fill";
import stackIcon from "@iconify-icons/ri/stack-line";
import magicIcon from "@iconify-icons/ri/magic-line";
import arrowDownIcon from "@iconify-icons/ri/arrow-down-s-line";
import type { SqlFormatMode } from "@/utils/sql/formatSql";
import { useI18n } from "@/locales";

const props = defineProps<{
  busy: boolean;
  hasData: boolean;
  limitRows: number;
  varchar: boolean;
}>();

const emit = defineEmits<{
  (e: "run"): void;
  (e: "run-new"): void;
  (e: "format", mode: SqlFormatMode): void;
  (e: "update:limitRows", value: number): void;
  (e: "update:varchar", value: boolean): void;
}>();

const { t } = useI18n();

const modKey = computed(() =>
  /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
    ? "⌘"
    : "Ctrl"
);

const limitOptions = computed(() => [
  { label: t("sql.toolbar.limitUnlimited"), value: 0 },
  { label: "500", value: 500 },
  { label: "1000", value: 1000 }
]);

const dtypeOptions = computed(() => [
  { label: t("sql.toolbar.dtypeAuto"), value: false },
  { label: t("sql.toolbar.dtypeString"), value: true }
]);

const limitModel = computed({
  get: () => props.limitRows,
  set: value => emit("update:limitRows", value as number)
});

const dtypeModel = computed({
  get: () => props.varchar,
  set: value => emit("update:varchar", value as boolean)
});
</script>

<template>
  <div class="sql-toolbar no-drag">
    <div class="sql-toolbar__group">
      <el-button
        class="sql-run-btn"
        :loading="busy"
        :disabled="!hasData"
        size="small"
        @click="emit('run')"
      >
        <template #icon>
          <Icon :icon="playIcon" />
        </template>
        {{ t("sql.toolbar.run") }}
        <span class="sql-kbd">{{ modKey }}⏎</span>
      </el-button>

      <el-button
        :disabled="!hasData || busy"
        size="small"
        @click="emit('run-new')"
        text
      >
        <template #icon>
          <Icon :icon="stackIcon" />
        </template>
        {{ t("sql.toolbar.runNew") }}
      </el-button>
    </div>

    <div class="sql-toolbar__divider" />

    <div class="sql-toolbar__group">
      <el-dropdown
        trigger="click"
        placement="bottom-start"
        @command="mode => emit('format', mode as SqlFormatMode)"
      >
        <el-button size="small">
          <template #icon>
            <Icon :icon="magicIcon" width="14" height="14" />
          </template>
          {{ t("sql.toolbar.format")
          }}<Icon :icon="arrowDownIcon" width="14" height="14" />
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="upper">
              {{ t("sql.toolbar.formatUpper") }}
            </el-dropdown-item>
            <el-dropdown-item command="expand">
              {{ t("sql.toolbar.formatExpand") }}
            </el-dropdown-item>
            <el-dropdown-item command="compact">
              {{ t("sql.toolbar.formatCompact") }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <div class="sql-toolbar__divider" />

    <div class="sql-toolbar__group sql-toolbar__group--end">
      <el-tooltip :content="t('sql.toolbar.limitRows')" effect="light">
        <el-segmented
          v-model="limitModel"
          :options="limitOptions"
          size="small"
          class="no-drag"
        />
      </el-tooltip>

      <el-tooltip :content="t('sql.toolbar.fieldTypes')" effect="light">
        <el-segmented
          v-model="dtypeModel"
          :options="dtypeOptions"
          size="small"
          class="no-drag"
        />
      </el-tooltip>
    </div>
  </div>
</template>

<style scoped>
.sql-toolbar__label {
  font-size: 12px;
  color: var(--sql-text-2);
  white-space: nowrap;
}

.sql-toolbar__group {
  display: flex;
  align-items: center;
}

.sql-toolbar__group--end {
  margin-left: auto;
}
</style>
