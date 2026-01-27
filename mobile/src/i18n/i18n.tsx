import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { I18nKey, Locale } from "./translations";
import { translations } from "./translations";
import { StorageKeys } from "../storage/keys";
import { getJson, setJson } from "../storage/storage";

type I18nContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: I18nKey) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider(props: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ko");

  useEffect(() => {
    (async () => {
      const saved = await getJson<Locale>(StorageKeys.locale);
      if (saved === "ko" || saved === "en" || saved === "ja") setLocaleState(saved);
    })();
  }, []);

  const value = useMemo<I18nContextValue>(() => {
    const dict = translations[locale];
    return {
      locale,
      setLocale: (l) => {
        setLocaleState(l);
        setJson(StorageKeys.locale, l);
      },
      t: (key) => dict[key] ?? translations.ko[key],
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{props.children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

