import { defineStore } from "pinia";
import type { LocaleKey } from "@/locales/types";

export const useLocaleStore = defineStore("locale", {
  state: () => ({
    locale: "en" as LocaleKey
  }),
  actions: {
    setLocale(locale: LocaleKey) {
      this.locale = locale;
    }
  },
  persist: true
});
