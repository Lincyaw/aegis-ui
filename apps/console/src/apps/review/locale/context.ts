import { createContext, useContext } from 'react';

import {
  REVIEW_CATALOGUES,
  reviewEn,
  type ReviewLocale,
  type ReviewStrings,
} from './strings';

const LOCALE_KEY = 'aegis.review.locale';

/** The stored choice, else Chinese for a browser set to Chinese, else English. */
export function loadLocale(): ReviewLocale {
  try {
    const stored = window.localStorage.getItem(LOCALE_KEY);
    if (stored === 'en' || stored === 'zh-CN') {
      return stored;
    }
  } catch {
    // Storage blocked: fall back to the browser's language.
  }
  return window.navigator.language.toLowerCase().startsWith('zh')
    ? 'zh-CN'
    : 'en';
}

export function saveLocale(locale: ReviewLocale): void {
  try {
    window.localStorage.setItem(LOCALE_KEY, locale);
  } catch {
    // Storage blocked: the choice lasts until the page reloads.
  }
}

export interface ReviewLocaleValue {
  locale: ReviewLocale;
  setLocale: (locale: ReviewLocale) => void;
  s: ReviewStrings;
}

export const ReviewLocaleContext = createContext<ReviewLocaleValue>({
  locale: 'en',
  setLocale: () => undefined,
  s: REVIEW_CATALOGUES.en,
});

/** The review app's strings in the reviewer's language. */
export function useReviewStrings(): ReviewStrings {
  return useContext(ReviewLocaleContext).s;
}

export function useReviewLocale(): ReviewLocaleValue {
  return useContext(ReviewLocaleContext);
}

export { reviewEn };
export type { ReviewLocale, ReviewStrings };
