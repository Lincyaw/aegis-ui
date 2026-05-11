/**
 * Ant Design 5 ConfigProvider theme — Rosetta lab-instrument language.
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
import { type ThemeConfig, theme as antdTokens } from 'antd';

const FONT_UI =
  "'Inter Variable', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', " +
  "'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif";

type Scheme = 'light' | 'dark';

interface Palette {
  text: string;
  textSecondary: string;
  textTertiary: string;
  textQuaternary: string;
  bgPage: string;
  bgPanel: string;
  bgMuted: string;
  border: string;
  borderSecondary: string;
  primary: string;
  inverted: string;
  textOnInverted: string;
  shadow: string;
}

const LIGHT: Palette = {
  text: '#000000',
  textSecondary: '#555555',
  textTertiary: 'rgba(0, 0, 0, 0.55)',
  textQuaternary: 'rgba(0, 0, 0, 0.35)',
  bgPage: '#f5f5f7',
  bgPanel: '#ffffff',
  bgMuted: 'rgba(0, 0, 0, 0.04)',
  border: 'rgba(0, 0, 0, 0.08)',
  borderSecondary: 'rgba(0, 0, 0, 0.04)',
  primary: '#000000',
  inverted: '#000000',
  textOnInverted: '#ffffff',
  shadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
};

const DARK: Palette = {
  text: '#f5f5f7',
  textSecondary: '#a1a1aa',
  textTertiary: 'rgba(255, 255, 255, 0.55)',
  textQuaternary: 'rgba(255, 255, 255, 0.35)',
  bgPage: '#0d0d10',
  bgPanel: '#18181b',
  bgMuted: 'rgba(255, 255, 255, 0.06)',
  border: 'rgba(255, 255, 255, 0.1)',
  borderSecondary: 'rgba(255, 255, 255, 0.04)',
  primary: '#f5f5f7',
  inverted: '#f5f5f7',
  textOnInverted: '#0d0d10',
  shadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
};

function buildTheme(p: Palette, scheme: Scheme): ThemeConfig {
  return {
    cssVar: true,
    hashed: false,
    algorithm:
      scheme === 'dark'
        ? antdTokens.darkAlgorithm
        : antdTokens.defaultAlgorithm,
    token: {
      colorPrimary: p.primary,
      colorInfo: p.primary,
      colorSuccess: p.primary,
      colorWarning: '#e11d48',
      colorError: '#e11d48',

      colorBgLayout: p.bgPage,
      colorBgContainer: p.bgPanel,
      colorBgElevated: p.bgPanel,
      colorBgSpotlight: p.inverted,

      colorText: p.text,
      colorTextSecondary: p.textSecondary,
      colorTextTertiary: p.textTertiary,
      colorTextQuaternary: p.textQuaternary,

      colorBorder: p.border,
      colorBorderSecondary: p.borderSecondary,

      borderRadius: 8,
      borderRadiusLG: 16,
      borderRadiusSM: 4,
      borderRadiusXS: 2,

      fontFamily: FONT_UI,
      fontSize: 13,
      fontSizeLG: 14,
      fontSizeSM: 11,

      lineHeight: 1.5,

      controlHeight: 32,
      controlHeightSM: 24,

      boxShadow: p.shadow,
      boxShadowSecondary: p.shadow,

      motionDurationMid: '0.2s',
      motionDurationFast: '0.15s',
      motionDurationSlow: '0.25s',
    },
    components: {
      Button: {
        borderRadius: 20,
        borderRadiusLG: 24,
        borderRadiusSM: 16,
        controlHeight: 32,
        paddingInline: 16,
        fontWeight: 500,
        defaultBg: 'transparent',
        defaultColor: p.text,
        defaultBorderColor: p.text,
        primaryShadow: 'none',
        defaultShadow: 'none',
        dangerShadow: 'none',
        textHoverBg: p.bgMuted,
      },
      Card: {
        borderRadiusLG: 16,
        headerBg: 'transparent',
        headerFontSize: 16,
        headerHeight: 52,
        paddingLG: 20,
        colorBgContainer: p.bgPanel,
      },
      Table: {
        headerBg: 'transparent',
        headerSplitColor: 'transparent',
        headerColor: p.text,
        borderColor: p.border,
        cellPaddingBlock: 8,
        colorBgContainer: p.bgPanel,
      },
      Input: {
        borderRadius: 8,
        activeBorderColor: p.text,
        hoverBorderColor: p.text,
      },
      InputNumber: {
        borderRadius: 8,
      },
      Select: {
        borderRadius: 8,
      },
      Tag: {
        borderRadiusSM: 4,
      },
      Modal: {
        borderRadiusLG: 16,
        contentBg: p.bgPanel,
        headerBg: p.bgPanel,
        footerBg: p.bgPanel,
      },
      Drawer: {
        colorBgElevated: p.bgPanel,
      },
      Menu: {
        itemBg: 'transparent',
        itemSelectedBg: p.inverted,
        itemSelectedColor: p.textOnInverted,
        itemHoverBg: p.bgMuted,
        itemBorderRadius: 8,
      },
      Tabs: {
        inkBarColor: p.text,
        itemSelectedColor: p.text,
        itemHoverColor: p.text,
      },
      Switch: {
        colorPrimary: p.text,
        colorPrimaryHover: p.text,
      },
      Tooltip: {
        colorBgSpotlight: p.inverted,
        colorTextLightSolid: p.textOnInverted,
      },
      Progress: {
        defaultColor: p.text,
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

/**
 * Returns the antd ThemeConfig for the given scheme. Pair with `useTheme().resolved`.
 */
export function getAegisTheme(scheme: Scheme): ThemeConfig {
  return scheme === 'dark'
    ? buildTheme(DARK, 'dark')
    : buildTheme(LIGHT, 'light');
}

/** Light palette — back-compat export. Prefer `getAegisTheme(resolved)`. */
export const aegisTheme: ThemeConfig = buildTheme(LIGHT, 'light');

export default aegisTheme;
