import { computed, reactive, ref } from "vue";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { message } from "@/utils/message";
import { t } from "@/locales";
import { useSqlHistory } from "@/store/modules/sqlHistory";
import fileIcon from "@iconify-icons/ri/file-line";
import fileTextIcon from "@iconify-icons/ri/file-text-line";
import fileExcelIcon from "@iconify-icons/ri/file-excel-2-line";
import fileJsonIcon from "@iconify-icons/ri/file-code-line";
import fileParquetIcon from "@iconify-icons/ri/database-2-line";
import textIcon from "@iconify-icons/ri/text";
import intIcon from "@iconify-icons/ri/number-1";
import floatIcon from "@iconify-icons/ri/hashtag";
import boolIcon from "@iconify-icons/ri/checkbox-circle-line";
import dateIcon from "@iconify-icons/ri/calendar-event-line";
import listIcon from "@iconify-icons/ri/list-unordered";
import unknowIcon from "@iconify-icons/ri/question-mark";
import { useSkiprows } from "@/store/modules/options";

const skiprows = useSkiprows();

export interface FileTreeNode {
  label: string;
  key: string;
  type: "file" | "field";
  ext?: string;
  dtype?: string;
  fullPath?: string;
  fullFileName?: string;
  children?: FileTreeNode[];
}

export function useSqlFileTree() {
  const sqlHistory = useSqlHistory();
  const contextMenuVisible = ref(false);
  const contextMenuPosition = reactive({ x: 0, y: 0 });
  const contextMenuItem = ref<any>(null);
  const searchTerm = ref("");

  const viewFileMeta = computed(() => {
    if (!sqlHistory.path) return [];
    return sqlHistory.path.split("|").map(path => {
      const fullFileName = path.split(/[/\\]/).pop() || path;
      const ext = fullFileName.includes(".")
        ? fullFileName.slice(fullFileName.lastIndexOf(".") + 1).toLowerCase()
        : "";
      return { fullPath: path, fullFileName, ext };
    });
  });

  const allFileTreeData = computed<FileTreeNode[]>(() => {
    return viewFileMeta.value
      .map(fileMeta => {
        const schema = sqlHistory.dtypesByFile[fileMeta.fullFileName];
        if (!schema || Object.keys(schema).length === 0) return null;

        const children = Object.entries(schema).map(([field, dtype]) => ({
          label: field,
          dtype,
          key: `${fileMeta.fullFileName}-${field}`,
          type: "field" as const
        }));

        return {
          label: fileMeta.fullFileName,
          ext: fileMeta.ext,
          children,
          key: fileMeta.fullFileName,
          type: "file" as const,
          fullPath: fileMeta.fullPath,
          fullFileName: fileMeta.fullFileName
        };
      })
      .filter(Boolean) as FileTreeNode[];
  });

  /** 按搜索词过滤：命中文件名保留整表，否则只保留命中的字段 */
  const fileTreeData = computed<FileTreeNode[]>(() => {
    const term = searchTerm.value.trim().toLowerCase();
    if (!term) return allFileTreeData.value;

    return allFileTreeData.value
      .map(node => {
        const nameHit = node.label.toLowerCase().includes(term);
        if (nameHit) return node;

        const children = (node.children || []).filter(child =>
          child.label.toLowerCase().includes(term)
        );
        if (children.length === 0) return null;
        return { ...node, children };
      })
      .filter(Boolean) as FileTreeNode[];
  });

  const expandedKeys = computed(() =>
    searchTerm.value.trim() ? fileTreeData.value.map(n => n.key) : []
  );

  const fileCount = computed(() => allFileTreeData.value.length);

  const getFileIcon = (ext: string) => {
    switch (ext) {
      case "csv":
      case "tsv":
      case "txt":
      case "dat":
        return fileTextIcon;
      case "xlsx":
      case "xls":
      case "xlsb":
      case "xlsm":
      case "ods":
        return fileExcelIcon;
      case "json":
      case "jsonl":
      case "ndjson":
        return fileJsonIcon;
      case "parquet":
        return fileParquetIcon;
      default:
        return fileIcon;
    }
  };

  const getFieldIcon = (dtype: string) => {
    const d = dtype.toLowerCase();
    if (d.includes("str") || d.includes("utf8")) return textIcon;
    if (d.includes("i64")) return intIcon;
    if (d.includes("f64")) return floatIcon;
    if (d.includes("bool")) return boolIcon;
    if (d.includes("date") || d.includes("time")) return dateIcon;
    if (d.includes("list") || d.includes("struct")) return listIcon;
    return unknowIcon;
  };

  const getNodeIcon = (node: any) => {
    return node.type === "file"
      ? getFileIcon(node.ext || "")
      : getFieldIcon(node.dtype || "");
  };

  /** 拉取单个文件的 schema */
  async function loadSchema(path: string) {
    const fullFileName = path.split(/[/\\]/).pop() || path;
    const rawResult = await invoke("query", {
      path,
      sqlQuery: `SELECT * FROM "${fullFileName}" LIMIT 10`,
      varchar: false,
      limit: 10,
      write: false,
      writeFormat: "csv",
      outputPath: "",
      skiprows: skiprows.skiprows
    });
    const result =
      typeof rawResult === "string" ? JSON.parse(rawResult) : rawResult;
    sqlHistory.dtypesByFile[fullFileName] = result.schema;
  }

  async function selectFile() {
    const selected = await open({
      multiple: true,
      filters: [
        { name: "All", extensions: ["*"] },
        { name: "csv", extensions: ["csv", "tsv", "psv", "txt", "dat"] },
        { name: "excel", extensions: ["xls", "xlsx", "xlsb", "xlsm", "ods"] },
        { name: "json", extensions: ["json"] },
        { name: "jsonl", extensions: ["jsonl", "ndjson"] },
        { name: "parquet", extensions: ["parquet"] }
      ]
    });

    if (!selected) return;

    const newPaths = Array.isArray(selected) ? selected : [selected];
    const existingPaths = sqlHistory.path ? sqlHistory.path.split("|") : [];
    const allPathsSet = new Set([...existingPaths, ...newPaths]);
    sqlHistory.path = Array.from(allPathsSet).join("|");

    await Promise.all(
      newPaths.map(async path => {
        const fullFileName = path.split(/[/\\]/).pop() || path;
        if (sqlHistory.dtypesByFile[fullFileName]) return;

        try {
          await loadSchema(path);
        } catch (err) {
          message(
            t("sql.message.loadSchemaFailed", {
              file: fullFileName,
              error: String(err)
            }),
            { type: "error" }
          );
        }
      })
    );
  }

  /** 文件被替换后 schema 可能过期，手动刷新 */
  async function refreshSchema(item: any) {
    const path = item?.fullPath;
    if (!path) return;
    try {
      await loadSchema(path);
      message(
        t("sql.message.refreshed", { file: item.fullFileName || item.label }),
        {
          type: "success"
        }
      );
    } catch (err) {
      message(t("sql.message.refreshFailed", { error: String(err) }), {
        type: "error"
      });
    }
    closeContextMenu();
  }

  function closeContextMenu() {
    contextMenuVisible.value = false;
    contextMenuItem.value = null;
  }

  function openContextMenu(event: MouseEvent, nodeData: any) {
    event.preventDefault();
    contextMenuItem.value = nodeData;
    contextMenuPosition.x = event.clientX;
    contextMenuPosition.y = event.clientY;
    contextMenuVisible.value = true;
  }

  async function copyPath() {
    if (!contextMenuItem.value?.fullPath) return;
    try {
      await navigator.clipboard.writeText(contextMenuItem.value.fullPath);
      message(t("sql.message.copiedPath"), { type: "success" });
      closeContextMenu();
    } catch (err) {
      message(t("sql.message.copyFailed"), { type: "error" });
    }
  }

  async function copyFileName() {
    const item = contextMenuItem.value;
    if (!item) return;
    const textToCopy =
      item.type === "file" ? item.fullFileName || item.label : item.label;
    try {
      await navigator.clipboard.writeText(textToCopy);
      message(t("sql.message.copiedFileName"), { type: "success" });
      closeContextMenu();
    } catch (err) {
      message(t("sql.message.copyFailed"), { type: "error" });
    }
  }

  async function copyFieldName() {
    if (!contextMenuItem.value?.label) return;
    try {
      await navigator.clipboard.writeText(contextMenuItem.value.label);
      message(t("sql.message.copiedFieldName"), { type: "success" });
      closeContextMenu();
    } catch (err) {
      message(t("sql.message.copyFailed"), { type: "error" });
    }
  }

  /** 复制带引号的字段名，可直接粘贴进 SQL */
  async function copyQuotedFieldName() {
    if (!contextMenuItem.value?.label) return;
    try {
      await navigator.clipboard.writeText(`"${contextMenuItem.value.label}"`);
      message(t("sql.message.copiedQuoted"), { type: "success" });
      closeContextMenu();
    } catch (err) {
      message(t("sql.message.copyFailed"), { type: "error" });
    }
  }

  /** 按节点移除数据源，不依赖右键菜单状态（供节点上的移除按钮使用） */
  function removeFile(item: any) {
    if (!item || item.type !== "file") return;

    const fullFileName = item.fullFileName || item.label;
    const fullPath = item.fullPath;

    const paths = sqlHistory.path.split("|").filter(p => p !== fullPath);
    sqlHistory.path = paths.join("|");

    delete sqlHistory.dtypesByFile[fullFileName];

    message(t("sql.message.deleted", { file: fullFileName }), {
      type: "success"
    });
  }

  function deleteFile() {
    removeFile(contextMenuItem.value);
    closeContextMenu();
  }

  function rightClick(event: MouseEvent, nodeData: any) {
    const dataForMenu = { ...nodeData };
    if (nodeData.type === "file" && !dataForMenu.fullPath) {
      const meta = viewFileMeta.value.find(
        m => m.fullFileName === nodeData.label
      );
      if (meta) {
        dataForMenu.fullPath = meta.fullPath;
        dataForMenu.fullFileName = meta.fullFileName;
      }
    }
    openContextMenu(event, dataForMenu);
  }

  return {
    // 数据
    viewFileMeta,
    fileTreeData,
    fileCount,
    searchTerm,
    expandedKeys,
    getNodeIcon,

    // 文件操作
    selectFile,
    refreshSchema,

    // 右键菜单状态
    contextMenuVisible,
    contextMenuPosition,
    contextMenuItem,
    closeContextMenu,

    // 右键菜单操作
    rightClick,
    copyPath,
    copyFileName,
    copyFieldName,
    copyQuotedFieldName,
    removeFile,
    deleteFile
  };
}
