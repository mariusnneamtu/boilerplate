import { Colors, type ColorScheme, type ThemeColorPalette } from "@/constants/theme";
import { useThemeContext } from "@/lib/theme-provider";
import { useColorScheme } from "./use-color-scheme";

export function useColors(colorSchemeOverride?: ColorScheme): ThemeColorPalette {
  const colorSchema = useColorScheme();
  const { accent } = useThemeContext();
  const scheme = (colorSchemeOverride ?? colorSchema ?? "light") as ColorScheme;
  const base = Colors[scheme];
  const accentOption = {
    violet: { light: "#5659D9", dark: "#8D90FF" },
    coral: { light: "#D85C62", dark: "#F58A8E" },
    ocean: { light: "#1976A8", dark: "#55B8E8" },
    mint: { light: "#208A72", dark: "#54D6B4" },
    gold: { light: "#B77724", dark: "#F0B85C" },
  }[accent][scheme];

  return {
    ...base,
    primary: accentOption,
    tint: accentOption,
    tabIconSelected: accentOption,
  };
}
