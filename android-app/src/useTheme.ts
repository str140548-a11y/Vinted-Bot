import { useColorScheme } from "react-native";
import { dark, light, type Theme } from "./theme";

/** Resolve the active theme object from the OS color scheme. */
export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === "light" ? light : dark;
}
