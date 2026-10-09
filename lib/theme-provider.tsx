import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, View, useColorScheme as useSystemColorScheme } from "react-native";
import { colorScheme as nativewindColorScheme, vars } from "nativewind";

import { SchemeColors, type ColorScheme } from "@/constants/theme";

export type AccentName = "violet" | "coral" | "ocean" | "mint" | "gold";

export type AccentOption = {
  name: AccentName;
  label: string;
  light: string;
  dark: string;
};

export const ACCENT_OPTIONS: AccentOption[] = [
  { name: "violet", label: "Violet", light: "#5659D9", dark: "#8D90FF" },
  { name: "coral", label: "Coral", light: "#D85C62", dark: "#F58A8E" },
  { name: "ocean", label: "Ocean", light: "#1976A8", dark: "#55B8E8" },
  { name: "mint", label: "Mentă", light: "#208A72", dark: "#54D6B4" },
  { name: "gold", label: "Auriu", light: "#B77724", dark: "#F0B85C" },
];

const ACCENT_STORAGE_KEY = "minimal2fa.accent";

type ThemeContextValue = {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
  accent: AccentName;
  setAccent: (accent: AccentName) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme() ?? "light";
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(systemScheme);
  const [accent, setAccentState] = useState<AccentName>("violet");

  useEffect(() => {
    AsyncStorage.getItem(ACCENT_STORAGE_KEY).then((stored) => {
      if (ACCENT_OPTIONS.some((option) => option.name === stored)) {
        setAccentState(stored as AccentName);
      }
    });
  }, []);

  const selectedAccent = ACCENT_OPTIONS.find((option) => option.name === accent) ?? ACCENT_OPTIONS[0];

  const applyScheme = useCallback((scheme: ColorScheme) => {
    nativewindColorScheme.set(scheme);
    Appearance.setColorScheme?.(scheme);
  }, []);

  const setColorScheme = useCallback((scheme: ColorScheme) => {
    setColorSchemeState(scheme);
    applyScheme(scheme);
  }, [applyScheme]);

  const setAccent = useCallback((nextAccent: AccentName) => {
    setAccentState(nextAccent);
    void AsyncStorage.setItem(ACCENT_STORAGE_KEY, nextAccent);
  }, []);

  useEffect(() => {
    applyScheme(colorScheme);
  }, [applyScheme, colorScheme]);

  const palette = useMemo(() => {
    const base = SchemeColors[colorScheme];
    return { ...base, primary: selectedAccent[colorScheme] };
  }, [colorScheme, selectedAccent]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.dataset.theme = colorScheme;
    root.classList.toggle("dark", colorScheme === "dark");
    Object.entries(palette).forEach(([token, value]) => {
      root.style.setProperty(`--color-${token}`, value);
    });
  }, [colorScheme, palette]);

  const themeVariables = useMemo(
    () =>
      vars({
        "color-primary": palette.primary,
        "color-background": palette.background,
        "color-surface": palette.surface,
        "color-foreground": palette.foreground,
        "color-muted": palette.muted,
        "color-border": palette.border,
        "color-success": palette.success,
        "color-warning": palette.warning,
        "color-error": palette.error,
      }),
    [palette],
  );

  const value = useMemo(
    () => ({ colorScheme, setColorScheme, accent, setAccent }),
    [accent, colorScheme, setAccent, setColorScheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1 }, themeVariables]}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeContext must be used within ThemeProvider");
  return ctx;
}
