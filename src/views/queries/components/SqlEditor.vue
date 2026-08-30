<script setup lang="ts">
import { computed, ref } from "vue";
import { VAceEditor } from "vue3-ace-editor";
import { useDark } from "@pureadmin/utils";
import ace from "ace-builds";
import "@/utils/sql/aceConfig";
import {
  createSqlCompleter,
  type SqlCompletionSource
} from "@/utils/sql/aceCompleter";
import type { TabStatus } from "@/utils/sql/sqlTabManager";
import { formatElapsed } from "@/utils/sql/sqlTabManager";
import { useI18n } from "@/locales";

const props = defineProps<{
  modelValue: string;
  status: TabStatus;
  elapsedMs: number | null;
  sources: SqlCompletionSource[];
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
  (e: "run", sql: string): void;
  (e: "run-new", sql: string): void;
}>();

const editorRef = ref<any>(null);
const { isDark } = useDark();

const theme = computed(() => (isDark.value ? "monokai" : "chrome"));

const options = {
  useWorker: false,
  enableBasicAutocompletion: true,
  enableSnippets: true,
  enableLiveAutocompletion: true,
  customScrollbar: true,
  showPrintMargin: false,
  fontSize: "13.5px",
  highlightActiveLine: true,
  tabSize: 2
};

const { t } = useI18n();

const statusText = computed(() => {
  switch (props.status) {
    case "running":
      return t("sql.editor.statusRunning");
    case "success":
      return t("sql.editor.statusSuccess");
    case "error":
      return t("sql.editor.statusError");
    default:
      return t("sql.editor.statusIdle");
  }
});

const statusClass = computed(() => `sql-editor__dot--${props.status}`);

/** 优先执行选中的片段，没有选区就执行整段 */
function currentSql(editor: any): string {
  const selected = editor?.getSelectedText?.();
  return selected && selected.trim() ? selected : props.modelValue;
}

function onInit(editor: any) {
  const langTools = ace.require("ace/ext/language_tools");
  langTools.addCompleter(createSqlCompleter(() => props.sources));

  editor.commands.addCommand({
    name: "runSql",
    bindKey: { win: "Ctrl-Enter", mac: "Command-Enter" },
    exec: () => emit("run", currentSql(editor))
  });

  editor.commands.addCommand({
    name: "runSqlInNewTab",
    bindKey: { win: "Ctrl-Shift-Enter", mac: "Command-Shift-Enter" },
    exec: () => emit("run-new", currentSql(editor))
  });
}

const model = computed({
  get: () => props.modelValue,
  set: value => emit("update:modelValue", value)
});

function insertText(text: string) {
  const editor = editorRef.value?.getAceInstance?.();
  if (!editor) return;
  editor.insert(text);
  editor.focus();
}

defineExpose({ insertText });
</script>

<template>
  <div class="sql-panel sql-editor">
    <VAceEditor
      ref="editorRef"
      v-model:value="model"
      lang="sql"
      :options="options"
      :theme="theme"
      style="height: 100%"
      @init="onInit"
    />
    <div class="sql-editor__status no-drag">
      <span class="sql-editor__dot" :class="statusClass" />
      <span>{{ statusText }}</span>
      <span v-if="elapsedMs !== null" class="sql-editor__num">
        {{ formatElapsed(elapsedMs) }}
      </span>
    </div>
  </div>
</template>
