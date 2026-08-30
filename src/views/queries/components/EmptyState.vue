<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
}>();
</script>

<template>
  <div class="sql-empty">
    <div class="sql-empty__icon">
      <slot name="icon" />
    </div>
    <div class="sql-empty__title">{{ title }}</div>
    <p v-if="description" class="sql-empty__desc">{{ description }}</p>
    <slot />
  </div>
</template>
