<script setup lang="ts">
import { computed } from "vue";
import type { ResultColumn } from "@/utils/sql/sqlTabManager";
import { dtypeToken, isNumericDtype } from "@/utils/sql/dtype";

const props = defineProps<{
  columns: ResultColumn[];
  data: any[];
  /** 当前页第一行的全局序号，用于行号列 */
  startIndex: number;
  /** 列宽按标签页记忆，tabId 参与缓存键 */
  tabId: string;
}>();

/** 列宽缓存：不跨会话持久化，仅在同一轮会话内保持用户拖拽过的宽度 */
const widthCache = new Map<string, number>();

function cacheKey(prop: string) {
  return `${props.tabId}:${prop}`;
}

function isNumeric(col: ResultColumn): boolean {
  if (col.dtype) return isNumericDtype(col.dtype);
  // 没有 dtype 信息时按首行值推断
  const first = props.data[0]?.[col.prop];
  return typeof first === "number";
}

/** 按「显示宽度」计算字符长度：CJK 等全角字符记 2，其余记 1 */
function displayWidth(text: string): number {
  let width = 0;
  for (const ch of text) {
    width +=
      /[\u1100-\u115f\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef\u3000-\u303f]/.test(
        ch
      )
        ? 2
        : 1;
  }
  return width;
}

function estimateWidth(col: ResultColumn): number {
  const cached = widthCache.get(cacheKey(col.prop));
  if (cached) return cached;

  const samples = props.data
    .slice(0, 30)
    .map(row => displayWidth(String(row?.[col.prop] ?? "")));
  const longest = Math.max(displayWidth(col.label), ...samples, 4);
  return Math.min(Math.max(longest * 8 + 28, 90), 360);
}

function onHeaderDragEnd(newWidth: number, _oldWidth: number, column: any) {
  if (column?.property) {
    widthCache.set(cacheKey(column.property), newWidth);
  }
}

const tableColumns = computed(() =>
  props.columns.map(col => ({
    ...col,
    numeric: isNumeric(col),
    token: dtypeToken(col.dtype),
    width: estimateWidth(col)
  }))
);

function isNull(value: unknown) {
  return value === null || value === undefined || value === "";
}
</script>

<template>
  <el-table
    class="sql-table"
    :data="data"
    height="100%"
    size="small"
    border
    highlight-current-row
    show-overflow-tooltip
    tooltip-effect="light"
    @header-dragend="onHeaderDragEnd"
  >
    <el-table-column fixed width="62" align="right" :resizable="false">
      <template #header>
        <span class="sql-rownum">#</span>
      </template>
      <template #default="{ $index }">
        <span class="sql-rownum">{{ startIndex + $index + 1 }}</span>
      </template>
    </el-table-column>

    <el-table-column
      v-for="col in tableColumns"
      :key="col.prop"
      :prop="col.prop"
      :width="col.width"
      :resizable="true"
      :show-overflow-tooltip="true"
    >
      <template #header>
        <span class="sql-th">
          <span class="sql-th__label">{{ col.label }}</span>
          <span v-if="col.token" class="sql-th__type">{{ col.token }}</span>
          <span v-if="col.dtype" class="sql-th__dtype">{{ col.dtype }}</span>
        </span>
      </template>

      <template #default="{ row }">
        <span v-if="isNull(row[col.prop])" class="sql-cell sql-cell--null">
          (null)
        </span>
        <span v-else-if="col.numeric" class="sql-cell sql-cell--num">
          {{ row[col.prop] }}
        </span>
        <span v-else class="sql-cell">{{ row[col.prop] }}</span>
      </template>
    </el-table-column>
  </el-table>
</template>
