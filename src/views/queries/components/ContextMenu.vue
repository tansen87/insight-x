<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { Icon } from "@iconify/vue";
import type { ContextMenuItem } from "@/views/queries/types";

const props = defineProps<{
  visible: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
}>();

const emit = defineEmits<{
  (e: "select", key: string): void;
  (e: "close"): void;
}>();

const menuRef = ref<HTMLElement | null>(null);
const box = ref({ w: 180, h: 0 });

async function measure() {
  await nextTick();
  const el = menuRef.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  box.value = { w: rect.width, h: rect.height };
}

watch(
  () => [props.visible, props.x, props.y, props.items],
  () => {
    if (props.visible) measure();
  },
  { deep: true }
);

const style = computed(() => {
  const { w, h } = box.value;
  const margin = 8;
  // 贴近屏幕右/下边缘时翻转，避免菜单被裁掉
  let left = props.x;
  let top = props.y;
  if (left + w > window.innerWidth - margin)
    left = Math.max(margin, props.x - w);
  if (top + h > window.innerHeight - margin)
    top = Math.max(margin, props.y - h);
  return { left: `${left}px`, top: `${top}px` };
});

function pick(item: ContextMenuItem) {
  if (item.separator || item.disabled || !item.key) return;
  emit("select", item.key);
}

function onDocClick(event: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    emit("close");
  }
}

function onEsc(event: KeyboardEvent) {
  if (event.key === "Escape") emit("close");
}

watch(
  () => props.visible,
  visible => {
    if (visible) {
      document.addEventListener("click", onDocClick);
      document.addEventListener("keydown", onEsc);
    } else {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEsc);
    }
  }
);

onBeforeUnmount(() => {
  document.removeEventListener("click", onDocClick);
  document.removeEventListener("keydown", onEsc);
});
</script>

<template>
  <div
    v-show="visible"
    ref="menuRef"
    class="sql-context-menu"
    :style="style"
    @click.stop
    @contextmenu.prevent
  >
    <template v-for="(item, index) in items" :key="index">
      <div v-if="item.separator" class="sql-context-menu__sep" />
      <button
        v-else
        type="button"
        class="sql-context-menu__item"
        :class="{ 'sql-context-menu__item--danger': item.danger }"
        :disabled="item.disabled"
        @click="pick(item)"
      >
        <Icon v-if="item.icon" :icon="item.icon" width="14" height="14" />
        <span>{{ item.label }}</span>
        <span v-if="item.hint" class="sql-context-menu__hint">
          {{ item.hint }}
        </span>
      </button>
    </template>
  </div>
</template>
