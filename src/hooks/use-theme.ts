import Storage from "expo-sqlite/kv-store";
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import {
  Appearance,
  Platform,
  StyleSheet,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

const THEME_PREFERENCE_KEY = "theme-preference-v1";

export type ThemePreference = "system" | "light" | "dark";
export type ThemePalette = (typeof Colors)[keyof typeof Colors];

type ThemeContextValue = {
  preference: ThemePreference;
  palette: ThemePalette;
  setPreference: (preference: ThemePreference) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

function aplicarEsquemaNativo(preference: ThemePreference): void {
  if (Platform.OS !== "web") {
    Appearance.setColorScheme(
      preference === "system" ? "unspecified" : preference,
    );
  }
}

export function AppThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] =
    useState<ThemePreference>("light");
  const [preferenceChanged, setPreferenceChanged] = useState(false);

  useEffect(() => {
    aplicarEsquemaNativo("light");
  }, []);

  useEffect(() => {
    if (preferenceChanged) return;

    let active = true;
    void Storage.getItem(THEME_PREFERENCE_KEY)
      .then((savedPreference) => {
        if (
          active &&
          !preferenceChanged &&
          isThemePreference(savedPreference)
        ) {
          aplicarEsquemaNativo(savedPreference);
          setPreferenceState(savedPreference);
        }
      })
      .catch((error: unknown) => {
        console.error("No se pudo cargar la preferencia de tema.", error);
      });

    return () => {
      active = false;
    };
  }, [preferenceChanged]);

  const setPreference = useCallback(async (nextPreference: ThemePreference) => {
    setPreferenceChanged(true);
    try {
      await Storage.setItem(THEME_PREFERENCE_KEY, nextPreference);
    } catch (error) {
      setPreferenceChanged(false);
      throw error;
    }
    aplicarEsquemaNativo(nextPreference);
    setPreferenceState(nextPreference);
  }, []);

  const scheme =
    preference === "system"
      ? systemScheme === "dark"
        ? "dark"
        : "light"
      : preference;
  const value = useMemo(
    () => ({ preference, palette: Colors[scheme], setPreference }),
    [preference, scheme, setPreference],
  );

  return createElement(ThemeContext.Provider, { value }, children);
}

function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme debe usarse dentro de AppThemeProvider.");
  }
  return context;
}

export function useTheme() {
  return useThemeContext().palette;
}

export function useThemePreference() {
  const { preference, setPreference } = useThemeContext();
  return { preference, setPreference };
}

export function useThemeStyles<T extends { [P in keyof T]: ViewStyle | TextStyle | ImageStyle }>(
  createStyles: (palette: ThemePalette) => T,
  palette: ThemePalette,
): T {
  return useMemo(
    () => StyleSheet.create(createStyles(palette)),
    [createStyles, palette],
  );
}
