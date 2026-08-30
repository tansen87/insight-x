<script setup lang="ts">
import { computed } from "vue";
import { Icon } from "@iconify/vue";
import addIcon from "@iconify-icons/ri/add-line";
import closeIcon from "@iconify-icons/ri/close-line";
import refreshIcon from "@iconify-icons/ri/refresh-line";
import type { FileTreeNode } from "@/utils/sql/sqlFileTree";
import { dtypeToken } from "@/utils/sql/dtype";
import { useI18n } from "@/locales";

const props = defineProps<{
  node: FileTreeNode;
  icon: any;
}>();

const emit = defineEmits<{
  (e: "insert", text: string): void;
  (e: "remove"): void;
  (e: "refresh"): void;
}>();

const { t } = useI18n();

const isFile = computed(() => props.node.type === "file");

const badge = computed(() =>
  isFile.value
    ? t("sql.dataSource.fieldCount", {
        count: props.node.children?.length ?? 0
      })
    : dtypeToken(props.node.dtype)
);

function onInsert() {
  emit("insert", `"${props.node.label}"`);
}
</script>

<template>
  <span
    class="sql-ds-node"
    :title="isFile ? node.fullPath || node.label : node.dtype || node.label"
    @dblclick.stop="isFile ? undefined : onInsert()"
  >
    <Icon :icon="icon" width="14" height="14" class="flex-none" />
    <span class="sql-ds-node__label">{{ node.label }}</span>
    <span class="sql-ds-tag">{{ badge }}</span>

    <span
      v-if="isFile"
      class="sql-ds-node__action"
      :title="t('sql.dataSource.refresh')"
      @click.stop="emit('refresh')"
    >
      <Icon :icon="refreshIcon" width="13" height="13" />
    </span>
    <span
      v-else
      class="sql-ds-node__action"
      :title="t('sql.dataSource.insert')"
      @click.stop="onInsert"
    >
      <Icon :icon="addIcon" width="13" height="13" />
    </span>

    <span
      v-if="isFile"
      class="sql-ds-node__action"
      :title="t('sql.dataSource.remove')"
      @click.stop="emit('remove')"
    >
      <Icon :icon="closeIcon" width="13" height="13" />
    </span>
  </span>
</template>
