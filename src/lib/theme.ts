import {
    type DynamicColor,
    type DynamicScheme,
    Hct,
    hexFromArgb,
    MaterialDynamicColors as M,
    SchemeExpressive,
    TonalPalette,
} from "@material/material-color-utilities";
import { useLayoutEffect, useSyncExternalStore } from "react";

// Cobalt: the home page seed. Games get their own hue from the game code.
export const HOME_HUE = 265;

const ROLES: Record<string, DynamicColor> = {
    primary: M.primary,
    "on-primary": M.onPrimary,
    "primary-container": M.primaryContainer,
    "on-primary-container": M.onPrimaryContainer,
    secondary: M.secondary,
    "on-secondary": M.onSecondary,
    "secondary-container": M.secondaryContainer,
    "on-secondary-container": M.onSecondaryContainer,
    tertiary: M.tertiary,
    "on-tertiary": M.onTertiary,
    "tertiary-container": M.tertiaryContainer,
    "on-tertiary-container": M.onTertiaryContainer,
    error: M.error,
    "on-error": M.onError,
    "error-container": M.errorContainer,
    "on-error-container": M.onErrorContainer,
    surface: M.surface,
    "surface-dim": M.surfaceDim,
    "surface-bright": M.surfaceBright,
    "surface-container-lowest": M.surfaceContainerLowest,
    "surface-container-low": M.surfaceContainerLow,
    "surface-container": M.surfaceContainer,
    "surface-container-high": M.surfaceContainerHigh,
    "surface-container-highest": M.surfaceContainerHighest,
    "on-surface": M.onSurface,
    "on-surface-variant": M.onSurfaceVariant,
    outline: M.outline,
    "outline-variant": M.outlineVariant,
    "inverse-surface": M.inverseSurface,
    "inverse-on-surface": M.inverseOnSurface,
    "inverse-primary": M.inversePrimary,
    // "Fixed" roles are identical in light and dark
    "primary-fixed": M.primaryFixed,
    "on-primary-fixed": M.onPrimaryFixed,
    "on-primary-fixed-variant": M.onPrimaryFixedVariant,
    "primary-fixed-dim": M.primaryFixedDim,
    "tertiary-fixed": M.tertiaryFixed,
    "tertiary-fixed-dim": M.tertiaryFixedDim,
    "on-tertiary-fixed-variant": M.onTertiaryFixedVariant,
};

function scheme(hue: number, dark: boolean): DynamicScheme {
    return new SchemeExpressive(Hct.from(hue, 64, 60), dark, 0, "2025");
}

function declarations(s: DynamicScheme) {
    return Object.entries(ROLES)
        .map(([name, role]) => `--${name}:${hexFromArgb(role.getArgb(s))};`)
        .join("");
}

const cache = new Map<number, string>();

function themeCss(hue: number) {
    let css = cache.get(hue);
    if (!css) {
        css =
            `:root{${declarations(scheme(hue, false))}}` +
            `@media (prefers-color-scheme: dark){:root{${declarations(scheme(hue, true))}}}`;
        cache.set(hue, css);
    }
    return css;
}

export function applyTheme(hue: number) {
    let el = document.getElementById("m3-theme");
    if (!el) {
        el = document.createElement("style");
        el.id = "m3-theme";
        document.head.append(el);
    }
    el.textContent = themeCss(Math.round(hue) % 360);
}

/** Re-seeds the whole color system while a page is mounted. */
export function useThemeHue(hue: number) {
    useLayoutEffect(() => {
        applyTheme(hue);
    }, [hue]);
}

export function hashString(s: string) {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = (h * 31 + s.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
}

export function hueForCode(code: string) {
    return hashString(code) % 360;
}

// Golden angle spacing so neighbouring players never share a color
export function playerHue(baseHue: number, index: number) {
    return (baseHue + 40 + index * 137.508) % 360;
}

export function playerColors(hue: number, dark: boolean) {
    // Calmer cards, vivid shapes. High chroma at light tones gets neon fast.
    const soft = TonalPalette.fromHueAndChroma(hue, 36);
    const vivid = TonalPalette.fromHueAndChroma(hue, 64);
    const t = (p: TonalPalette, tone: number) => hexFromArgb(p.tone(tone));
    return dark
        ? {
              container: t(vivid, 30),
              onContainer: t(vivid, 92),
              accent: t(vivid, 80),
              onAccent: t(vivid, 20),
          }
        : {
              container: t(soft, 92),
              onContainer: t(soft, 15),
              accent: t(vivid, 70),
              onAccent: t(vivid, 10),
          };
}

const darkQuery = "(prefers-color-scheme: dark)";

export function useDarkMode() {
    return useSyncExternalStore(
        (cb) => {
            const mq = window.matchMedia(darkQuery);
            mq.addEventListener("change", cb);
            return () => mq.removeEventListener("change", cb);
        },
        () => window.matchMedia(darkQuery).matches,
    );
}
