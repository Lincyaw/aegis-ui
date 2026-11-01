import type { ThemePreference } from './themeContext';

export const STORAGE_KEY = 'aegis-ui:theme';
export const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * An inline script for the document `<head>` that sets `data-theme` from
 * the stored preference before the first paint, so a prerendered page
 * opens in the visitor's theme instead of flashing light. Pass the same
 * `defaultPreference` as `ThemeProvider`.
 */
export function themeInitScript(
  defaultPreference: ThemePreference = 'system',
): string {
  return `(function(){try{var p=null;try{p=localStorage.getItem(${JSON.stringify(
    STORAGE_KEY,
  )})}catch(e){}if(p!=='light'&&p!=='dark'&&p!=='system')p=${JSON.stringify(
    defaultPreference,
  )};var t=p==='system'?(matchMedia(${JSON.stringify(
    DARK_QUERY,
  )}).matches?'dark':'light'):p;var r=document.documentElement;r.setAttribute('data-theme',t);r.style.colorScheme=t}catch(e){}})();`;
}
