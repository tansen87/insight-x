import { computed } from "vue";
import { useLocaleStore } from "@/store/modules/locale";
import en from "./en";
import zhCN from "./zh-CN";
import type { LocaleKey, LocaleOption, MessageDictionary } from "./types";

export type { LocaleKey, LocaleOption } from "./types";

export const LOCALES: LocaleOption[] = [
  { key: "en", label: "English" },
  { key: "zh-CN", label: "简体中文" }
];

const dictionaries: Record<LocaleKey, MessageDictionary> = {
  en,
  "zh-CN": zhCN
};

/** Intl 使用的 BCP-47 标签 */
const intlTags: Record<LocaleKey, string> = {
  en: "en-US",
  "zh-CN": "zh-CN"
};

function lookup(dict: MessageDictionary, path: string): string | undefined {
  const value = path
    .split(".")
    .reduce<any>(
      (acc, key) => (acc === null || acc === undefined ? undefined : acc[key]),
      dict
    );
  return typeof value === "string" ? value : undefined;
}

/** 读取当前语言；pinia 尚未安装时回退到英文 */
function currentLocale(): LocaleKey {
  try {
    return useLocaleStore().locale ?? "en";
  } catch {
    return "en";
  }
}

/**
 * 按点号路径取文案，缺失时逐级回退到英文，最后回退到 key 本身。
 * 在模板中调用时会读取 pinia 状态，因此语言切换会自动触发重渲染。
 */
export function t(
  key: string,
  params?: Record<string, string | number>
): string {
  const locale = currentLocale();
  let text =
    lookup(dictionaries[locale] ?? dictionaries.en, key) ??
    lookup(dictionaries.en, key) ??
    key;

  if (params) {
    text = text.replace(/\{(\w+)\}/g, (_, name: string) =>
      params[name] === undefined ? `{${name}}` : String(params[name])
    );
  }
  return text;
}

export function useI18n() {
  const store = useLocaleStore();
  const locale = computed(() => store.locale);
  const intlLocale = computed(() => intlTags[store.locale] ?? intlTags.en);

  function setLocale(next: LocaleKey) {
    store.setLocale(next);
  }

  return { t, locale, intlLocale, setLocale, locales: LOCALES };
}
