import { type ReactNode, useMemo, useState } from 'react';

import {
  enStrings,
  LocaleProvider,
  Tabs,
  zhCNStrings,
} from '@lincyaw/aegis-ui';

import {
  loadLocale,
  ReviewLocaleContext,
  saveLocale,
  useReviewLocale,
} from './context';
import { REVIEW_CATALOGUES, type ReviewLocale } from './strings';

/**
 * Gives the review app, and the aegis-ui primitives inside it, the
 * reviewer's language. Mounted through the app's `wrap`, so the header's
 * switch and the pages share it.
 */
export function ReviewLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<ReviewLocale>(loadLocale);
  const value = useMemo(
    () => ({
      locale,
      setLocale: (next: ReviewLocale) => {
        saveLocale(next);
        setLocaleState(next);
      },
      s: REVIEW_CATALOGUES[locale],
    }),
    [locale]
  );
  return (
    <ReviewLocaleContext.Provider value={value}>
      <LocaleProvider strings={locale === 'zh-CN' ? zhCNStrings : enStrings}>
        {children}
      </LocaleProvider>
    </ReviewLocaleContext.Provider>
  );
}

/** English or Chinese, kept in this browser. */
export function ReviewLocaleSwitch() {
  const { locale, setLocale, s } = useReviewLocale();
  return (
    <Tabs
      listOnly
      size='sm'
      ariaLabel={s.languageSwitch}
      items={[
        { key: 'en', label: 'English' },
        { key: 'zh-CN', label: '中文' },
      ]}
      activeKey={locale}
      onChange={(key) => {
        setLocale(key === 'zh-CN' ? 'zh-CN' : 'en');
      }}
    />
  );
}
