export type LocaleKey = "en" | "zh-CN";

export interface LocaleOption {
  key: LocaleKey;
  label: string;
}

export type MessageDictionary = { [key: string]: any };
