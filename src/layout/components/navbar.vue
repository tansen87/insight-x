<script setup lang="ts">
import { getCurrentWindow } from "@tauri-apps/api/window";
import Setting from "@iconify-icons/ri/settings-3-line";
import Sun from "@iconify-icons/ri/sun-line";
import Moon from "@iconify-icons/ri/moon-line";
import Subtract from "@iconify-icons/ri/subtract-line";
import Fullscreen from "@iconify-icons/ri/fullscreen-line";
import Close from "@iconify-icons/ri/close-line";
import Translate from "@iconify-icons/ri/translate-2";
import CheckLine from "@iconify-icons/ri/check-line";
import { useNav } from "@/layout/hooks/useNav";
import { useDataThemeChange } from "@/layout/hooks/useDataThemeChange";
import { useI18n } from "@/locales";

const { onPanel } = useNav();
const { dataTheme, dataThemeChange } = useDataThemeChange();
const { locale, setLocale, locales } = useI18n();
const appWindow = getCurrentWindow();

function themeChange() {
  dataTheme.value = !dataTheme.value;
  dataThemeChange();
}
</script>

<template>
  <div
    class="navbar bg-[#fff] shadow-sm shadow-[rgba(0, 21, 41, 0.08)] dark:shadow-[#0d0d0d]"
  >
    <div class="vertical-header-right">
      <el-dropdown
        trigger="click"
        placement="bottom-end"
        @command="key => setLocale(key as 'en' | 'zh-CN')"
      >
        <span class="set-icon navbar-bg-hover">
          <IconifyIconOffline :icon="Translate" />
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item
              v-for="item in locales"
              :key="item.key"
              :command="item.key"
            >
              <span class="flex items-center justify-between w-full">
                <span>{{ item.label }}</span>
                <IconifyIconOffline
                  v-if="item.key === locale"
                  :icon="CheckLine"
                />
              </span>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <span @click="themeChange" class="set-icon navbar-bg-hover">
        <IconifyIconOffline v-if="dataTheme" :icon="Moon" />
        <IconifyIconOffline v-else :icon="Sun" />
      </span>
      <span class="set-icon navbar-bg-hover" @click="onPanel">
        <IconifyIconOffline :icon="Setting" />
      </span>
      <span class="set-icon navbar-bg-hover" @click="appWindow.minimize">
        <IconifyIconOffline :icon="Subtract" />
      </span>
      <span class="set-icon navbar-bg-hover" @click="appWindow.toggleMaximize">
        <IconifyIconOffline :icon="Fullscreen" />
      </span>
      <span class="set-icon navbar-bg-hover" @click="appWindow.close">
        <IconifyIconOffline :icon="Close" />
      </span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.navbar {
  width: 100%;
  height: 36px;

  .vertical-header-right {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    min-width: 280px;
    height: 36px;
  }
}
</style>
