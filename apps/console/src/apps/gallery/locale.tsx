import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  type AegisStrings,
  enStrings,
  LocaleProvider,
  Tabs,
  zhCNStrings,
} from '@lincyaw/aegis-ui';

type GalleryLocale = 'en' | 'zh-CN';

const CATALOGUES: Record<GalleryLocale, AegisStrings> = {
  en: enStrings,
  'zh-CN': zhCNStrings,
};

// In the URL, so a review link opens the gallery in the language it shows.
const PARAM = 'lang';

function useGalleryLocale(): [GalleryLocale, (next: GalleryLocale) => void] {
  const [params, setParams] = useSearchParams();
  const locale: GalleryLocale = params.get(PARAM) === 'zh-CN' ? 'zh-CN' : 'en';
  const setLocale = (next: GalleryLocale): void => {
    setParams(
      (prev) => {
        const nextParams = new URLSearchParams(prev);
        if (next === 'en') {
          nextParams.delete(PARAM);
        } else {
          nextParams.set(PARAM, next);
        }
        return nextParams;
      },
      { replace: true }
    );
  };
  return [locale, setLocale];
}

/** Gives every specimen the catalogue the gallery's language switch picks. */
export function GalleryLocaleProvider({ children }: { children: ReactNode }) {
  const [locale] = useGalleryLocale();
  return (
    <LocaleProvider strings={CATALOGUES[locale]}>{children}</LocaleProvider>
  );
}

export function GalleryLocaleSwitch() {
  const [locale, setLocale] = useGalleryLocale();
  return (
    <Tabs
      listOnly
      size='sm'
      ariaLabel='Specimen language'
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
