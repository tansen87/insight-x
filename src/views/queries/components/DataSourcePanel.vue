<script setup lang="ts">
import { computed, ref } from "vue";
import { Icon } from "@iconify/vue";
import databaseIcon from "@iconify-icons/ri/database-2-line";
import addIcon from "@iconify-icons/ri/add-line";
import searchIcon from "@iconify-icons/ri/search-line";
import foldIcon from "@iconify-icons/ri/arrow-left-s-line";
import unfoldIcon from "@iconify-icons/ri/arrow-right-s-line";
import copyIcon from "@iconify-icons/ri/file-copy-line";
import quoteIcon from "@iconify-icons/ri/input-cursor-move";
import refreshIcon from "@iconify-icons/ri/refresh-line";
import deleteIcon from "@iconify-icons/ri/delete-bin-line";
import EmptyState from "./EmptyState.vue";
import ContextMenu from "./ContextMenu.vue";
import DataSourceNode from "./DataSourceNode.vue";
import type { ContextMenuItem } from "@/views/queries/types";
import { useSqlFileTree } from "@/utils/sql/sqlFileTree";
import { useI18n } from "@/locales";

defineProps<{
  collapsed: boolean;
}>();

const emit = defineEmits<{
  (e: "toggle-collapse"): void;
  (e: "insert", text: string): void;
}>();

const {
  fileTreeData,
  fileCount,
  searchTerm,
  expandedKeys,
  getNodeIcon,
  selectFile,
  refreshSchema,
  contextMenuVisible,
  contextMenuPosition,
  contextMenuItem,
  closeContextMenu,
  rightClick,
  copyPath,
  copyFileName,
  copyFieldName,
  copyQuotedFieldName,
  removeFile,
  deleteFile
} = useSqlFileTree();

const searchInputRef = ref<any>(null);

function focusSearch() {
  searchInputRef.value?.focus?.();
}

defineExpose({ focusSearch });

const isFileNode = computed(() => contextMenuItem.value?.type === "file");

const { t } = useI18n();

const menuItems = computed<ContextMenuItem[]>(() =>
  isFileNode.value
    ? [
        {
          key: "copy-name",
          label: t("sql.dataSource.copyName"),
          icon: copyIcon
        },
        {
          key: "copy-path",
          label: t("sql.dataSource.copyPath"),
          icon: copyIcon
        },
        {
          key: "refresh",
          label: t("sql.dataSource.refresh"),
          icon: refreshIcon
        },
        { separator: true },
        {
          key: "delete",
          label: t("sql.dataSource.remove"),
          icon: deleteIcon,
          danger: true
        }
      ]
    : [
        {
          key: "insert",
          label: t("sql.dataSource.insert"),
          icon: quoteIcon,
          hint: t("sql.dataSource.insertHint")
        },
        {
          key: "copy-name",
          label: t("sql.dataSource.copyFieldName"),
          icon: copyIcon
        },
        {
          key: "copy-quoted",
          label: t("sql.dataSource.copyQuoted"),
          icon: copyIcon
        }
      ]
);

function onMenuSelect(key: string) {
  switch (key) {
    case "copy-name":
      if (isFileNode.value) copyFileName();
      else copyFieldName();
      break;
    case "copy-path":
      copyPath();
      break;
    case "copy-quoted":
      copyQuotedFieldName();
      break;
    case "refresh":
      refreshSchema(contextMenuItem.value);
      break;
    case "delete":
      deleteFile();
      break;
    case "insert":
      if (contextMenuItem.value?.label) {
        emit("insert", `"${contextMenuItem.value.label}"`);
      }
      closeContextMenu();
      break;
    default:
      break;
  }
}
</script>

<template>
  <div class="sql-panel no-drag">
    <!-- 折叠态：只留一条操作栏 -->
    <div v-if="collapsed" class="flex flex-col items-center gap-1 py-2">
      <el-tooltip
        :content="t('sql.dataSource.expand')"
        effect="light"
        placement="right"
      >
        <el-button text size="small" @click="emit('toggle-collapse')">
          <template #icon>
            <Icon :icon="unfoldIcon" width="16" height="16" />
          </template>
        </el-button>
      </el-tooltip>
      <el-tooltip
        :content="t('sql.dataSource.add')"
        effect="light"
        placement="right"
      >
        <el-button text size="small" @click="selectFile()">
          <template #icon>
            <Icon :icon="addIcon" width="16" height="16" />
          </template>
        </el-button>
      </el-tooltip>
      <Icon :icon="databaseIcon" width="14" height="14" class="text-gray-400" />
      <span class="sql-ds-tag">{{ fileCount }}</span>
    </div>

    <template v-else>
      <div class="sql-panel__header">
        <span class="sql-panel__title">
          <Icon :icon="databaseIcon" width="14" height="14" />
          {{ t("sql.dataSource.title") }}
          <span v-if="fileCount" class="sql-ds-tag">{{ fileCount }}</span>
        </span>
        <div class="flex-1" />
        <el-tooltip
          :content="t('sql.dataSource.add')"
          effect="light"
          placement="bottom"
        >
          <el-button text size="small" @click="selectFile()">
            <template #icon>
              <Icon :icon="addIcon" width="15" height="15" />
            </template>
          </el-button>
        </el-tooltip>
        <el-tooltip
          :content="t('sql.dataSource.collapse')"
          effect="light"
          placement="bottom"
        >
          <el-button text size="small" @click="emit('toggle-collapse')">
            <template #icon>
              <Icon :icon="foldIcon" width="15" height="15" />
            </template>
          </el-button>
        </el-tooltip>
      </div>

      <el-input
        ref="searchInputRef"
        v-model="searchTerm"
        class="sql-ds-search no-drag"
        size="small"
        :placeholder="t('sql.dataSource.searchPlaceholder')"
        style="margin: 6px 8px; width: auto"
      >
        <template #prefix>
          <Icon :icon="searchIcon" />
        </template>
      </el-input>

      <div class="sql-panel__body">
        <el-tree
          v-if="fileTreeData.length > 0"
          :data="fileTreeData"
          node-key="key"
          :default-expanded-keys="expandedKeys"
          :expand-on-click-node="true"
          @node-contextmenu="rightClick"
        >
          <template #default="{ data }">
            <DataSourceNode
              :node="data"
              :icon="getNodeIcon(data)"
              @insert="text => emit('insert', text)"
              @refresh="refreshSchema(data)"
              @remove="removeFile(data)"
            />
          </template>
        </el-tree>

        <EmptyState
          v-else-if="fileCount === 0"
          :title="t('sql.dataSource.emptyTitle')"
          :description="t('sql.dataSource.emptyDesc')"
        >
          <template #icon>
            <Icon :icon="databaseIcon" width="22" height="22" />
          </template>
          <el-button size="small" type="primary" @click="selectFile()">
            <template #icon>
              <Icon :icon="addIcon" width="14" height="14" />
            </template>
            {{ t("sql.dataSource.add") }}
          </el-button>
        </EmptyState>

        <EmptyState v-else :title="t('sql.dataSource.noMatch')" />
      </div>
    </template>

    <ContextMenu
      :visible="contextMenuVisible"
      :x="contextMenuPosition.x"
      :y="contextMenuPosition.y"
      :items="menuItems"
      @select="onMenuSelect"
      @close="closeContextMenu"
    />
  </div>
</template>
