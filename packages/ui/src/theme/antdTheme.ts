/**
 * Ant Design 5 ConfigProvider theme mapped onto the aegis tokens in
 * `styles/theme.css`.
 *
 * Two palettes are exposed (`light` / `dark`) so that consumers can mirror
 * the `data-theme` attribute set by `ThemeProvider`. Values are duplicated
 * here (not `var(...)`) because AntD theme tokens are computed in JS — they
 * cannot resolve CSS custom properties.
 *
 * Usage:
 *   const { resolved } = useTheme();
 *   <ConfigProvider theme={getAegisTheme(resolved)}>…</ConfigProvider>
 *
 * `aegisTheme` is the light palette, kept as a back-compat export.
 */
import {
  type MappingAlgorithm,
  type ThemeConfig,
  theme as antdTokens,
} from 'antd';

import type { ThemeMode } from './themeContext';

// antd's dark algorithm re-derives the seed colours toward the background
// (and seed tokens cannot be overridden afterwards); pin them back to the
// token values so antd controls match the primitives.
const darkWithTokenSeeds: MappingAlgorithm = (seed) => ({
  ...antdTokens.darkAlgorithm(seed),
  colorPrimary: seed.colorPrimary,
  colorInfo: seed.colorInfo,
  colorLink: seed.colorLink,
  colorSuccess: seed.colorSuccess,
  colorWarning: seed.colorWarning,
  colorError: seed.colorError,
});

const FONT_UI =
  "'Hanken Grotesk Variable', 'Hanken Grotesk', 'PingFang SC', " +
  "'Noto Sans SC Variable', 'Noto Sans SC', 'Microsoft YaHei', sans-serif";

const FONT_MONO = "'Google Sans Code', 'PingFang SC', monospace";

const RADIUS = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 20,
  pill: 999,
};

interface Palette {
  bgPage: string;
  bgPanel: string;
  bgMuted: string;
  bgInverted: string;
  bgBrandSoft: string;
  bgBackdrop: string;
  textMain: string;
  textMuted: string;
  textFaint: string;
  textOnInverted: string;
  borderHairline: string;
  borderEmphasis: string;
  accentBrand: string;
  accentInfo: string;
  accentSuccess: string;
  accentWarning: string;
  inkWarn: string;
  shadowRest: string;
  shadowOverlay: string;
}

const LIGHT: Palette = {
  bgPage: '#f7f8fa',
  bgPanel: '#ffffff',
  bgMuted: '#f1f3f5',
  bgInverted: '#1f2328',
  bgBrandSoft: '#eef1fe',
  bgBackdrop: 'rgba(31, 35, 40, 0.28)',
  textMain: '#1f2328',
  textMuted: '#5f6368',
  textFaint: '#9aa0a6',
  textOnInverted: '#ffffff',
  borderHairline: 'rgba(31, 35, 40, 0.08)',
  borderEmphasis: 'rgba(31, 35, 40, 0.16)',
  accentBrand: '#3c56f4',
  accentInfo: '#3c56f4',
  accentSuccess: '#167a62',
  accentWarning: '#e11d48',
  inkWarn: '#d97706',
  shadowRest:
    '0 1px 2px rgba(31, 35, 40, 0.04), 0 6px 20px -6px rgba(31, 35, 40, 0.08)',
  shadowOverlay:
    '0 8px 24px -6px rgba(31, 35, 40, 0.12), ' +
    '0 28px 64px -16px rgba(31, 35, 40, 0.2)',
};

const DARK: Palette = {
  bgPage: '#0b0d12',
  bgPanel: '#15181e',
  bgMuted: '#1e222a',
  bgInverted: '#eef0f3',
  bgBrandSoft: '#1a2140',
  bgBackdrop: 'rgba(0, 0, 0, 0.55)',
  textMain: '#eef0f3',
  textMuted: '#9aa0a6',
  textFaint: '#6b7280',
  textOnInverted: '#0b0d12',
  borderHairline: 'rgba(255, 255, 255, 0.08)',
  borderEmphasis: 'rgba(255, 255, 255, 0.18)',
  accentBrand: '#8ea0ff',
  accentInfo: '#8ea0ff',
  accentSuccess: '#4ade80',
  accentWarning: '#fb7185',
  inkWarn: '#fbbf24',
  shadowRest:
    '0 1px 2px rgba(0, 0, 0, 0.3), 0 6px 20px -6px rgba(0, 0, 0, 0.4)',
  shadowOverlay:
    '0 8px 24px -6px rgba(0, 0, 0, 0.45), 0 28px 64px -16px rgba(0, 0, 0, 0.6)',
};

function buildTheme(p: Palette, scheme: ThemeMode): ThemeConfig {
  // Text fields, selects and pickers: hairline at rest, emphasis on hover,
  // a brand border plus the brand-soft halo (controlOutline) on focus.
  const field = {
    hoverBorderColor: p.borderEmphasis,
    activeBorderColor: p.accentBrand,
  };
  return {
    cssVar: true,
    hashed: false,
    algorithm:
      scheme === 'dark' ? darkWithTokenSeeds : antdTokens.defaultAlgorithm,
    token: {
      // Activation is surface inversion, so antd's "primary" is the ink.
      colorPrimary: p.bgInverted,
      colorInfo: p.accentInfo,
      colorLink: p.accentInfo,
      colorSuccess: p.accentSuccess,
      colorWarning: p.inkWarn,
      colorError: p.accentWarning,

      colorBgLayout: p.bgPage,
      colorBgContainer: p.bgPanel,
      colorBgElevated: p.bgPanel,
      colorBgSpotlight: p.bgInverted,
      colorBgMask: p.bgBackdrop,

      colorText: p.textMain,
      colorTextSecondary: p.textMuted,
      colorTextTertiary: p.textMuted,
      colorTextQuaternary: p.textFaint,
      colorTextPlaceholder: p.textMuted,
      colorTextLightSolid: p.textOnInverted,

      colorBorder: p.borderHairline,
      colorBorderSecondary: p.borderHairline,
      colorSplit: p.borderHairline,

      controlOutline: p.bgBrandSoft,
      controlOutlineWidth: 3,
      lineWidthFocus: 2,

      borderRadius: RADIUS.md,
      borderRadiusLG: RADIUS.lg,
      borderRadiusSM: RADIUS.sm,
      borderRadiusXS: RADIUS.xs,

      fontFamily: FONT_UI,
      fontFamilyCode: FONT_MONO,
      fontSize: 13,
      fontSizeLG: 14,
      fontSizeSM: 12,

      lineHeight: 22 / 13,

      controlHeight: 32,
      controlHeightSM: 24,

      boxShadow: p.shadowOverlay,
      boxShadowSecondary: p.shadowOverlay,
      boxShadowTertiary: p.shadowRest,

      motionDurationMid: '0.2s',
      motionDurationFast: '0.15s',
      motionDurationSlow: '0.25s',
    },
    components: {
      Tree: {
        nodeHoverBg: p.bgMuted,
        nodeSelectedBg: p.bgInverted,
        nodeSelectedColor: p.textOnInverted,
        directoryNodeSelectedBg: p.bgInverted,
        directoryNodeSelectedColor: p.textOnInverted,
      },
      Button: {
        borderRadius: RADIUS.pill,
        borderRadiusLG: RADIUS.pill,
        borderRadiusSM: RADIUS.pill,
        controlHeight: 32,
        paddingInline: 16,
        fontWeight: 500,
        primaryColor: p.textOnInverted,
        defaultBg: p.bgPanel,
        defaultColor: p.textMain,
        defaultBorderColor: p.borderHairline,
        defaultHoverBg: p.bgPanel,
        defaultHoverColor: p.textMain,
        defaultHoverBorderColor: p.borderEmphasis,
        defaultActiveBg: p.bgPanel,
        defaultActiveColor: p.textMain,
        defaultActiveBorderColor: p.borderEmphasis,
        primaryShadow: 'none',
        defaultShadow: p.shadowRest,
        dangerShadow: 'none',
        textHoverBg: p.bgMuted,
      },
      Card: {
        borderRadiusLG: RADIUS.lg,
        headerBg: 'transparent',
        headerFontSize: 16,
        headerHeight: 52,
        paddingLG: 20,
        colorBgContainer: p.bgPanel,
      },
      Table: {
        headerBg: p.bgMuted,
        headerSplitColor: 'transparent',
        headerColor: p.textMuted,
        borderColor: p.borderHairline,
        cellPaddingBlock: 8,
        colorBgContainer: p.bgPanel,
      },
      Input: field,
      InputNumber: field,
      Select: field,
      DatePicker: field,
      Checkbox: {
        borderRadiusSM: RADIUS.xs,
        colorBorder: p.borderEmphasis,
        // The tick is drawn in colorWhite; on the dark scheme's light ink it
        // must be the inverted text colour to stay visible.
        colorWhite: p.textOnInverted,
      },
      Tag: {
        borderRadiusSM: RADIUS.pill,
      },
      Modal: {
        borderRadiusLG: RADIUS.lg,
        contentBg: p.bgPanel,
        headerBg: p.bgPanel,
        footerBg: p.bgPanel,
      },
      Drawer: {
        colorBgElevated: p.bgPanel,
      },
      Menu: {
        itemBg: 'transparent',
        itemSelectedBg: p.bgInverted,
        itemSelectedColor: p.textOnInverted,
        itemHoverBg: p.bgMuted,
        itemBorderRadius: RADIUS.md,
      },
      Tabs: {
        inkBarColor: p.textMain,
        itemSelectedColor: p.textMain,
        itemHoverColor: p.textMain,
      },
      Switch: {
        colorPrimary: p.bgInverted,
        colorPrimaryHover: p.bgInverted,
      },
      Tooltip: {
        colorBgSpotlight: p.bgInverted,
        colorTextLightSolid: p.textOnInverted,
      },
      Progress: {
        defaultColor: p.textMain,
        remainingColor: p.bgMuted,
      },
      Dropdown: {
        colorBgElevated: p.bgPanel,
      },
      Popover: {
        colorBgElevated: p.bgPanel,
      },
      Notification: {
        colorBgElevated: p.bgPanel,
      },
      Message: {
        colorBgElevated: p.bgPanel,
      },
    },
  };
}

// Built once so callers that pass getAegisTheme(resolved) every render hand
// antd a stable object.
const THEMES: Record<ThemeMode, ThemeConfig> = {
  light: buildTheme(LIGHT, 'light'),
  dark: buildTheme(DARK, 'dark'),
};

/**
 * Returns the antd ThemeConfig for the given scheme. Pair with `useTheme().resolved`.
 */
export function getAegisTheme(scheme: ThemeMode): ThemeConfig {
  return THEMES[scheme];
}

/** Light palette — back-compat export. Prefer `getAegisTheme(resolved)`. */
export const aegisTheme: ThemeConfig = THEMES.light;
