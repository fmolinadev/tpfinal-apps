import { StyleSheet, Text, type ColorValue } from "react-native";

export type RoleTabIconName =
  | "home"
  | "courts"
  | "calendar"
  | "profile"
  | "scan"
  | "attendance"
  | "block"
  | "recurring"
  | "price"
  | "map"
  | "maintenance";

const GLYPHS: Record<RoleTabIconName, string> = {
  home: "⌂",
  courts: "▦",
  calendar: "◷",
  profile: "♙",
  scan: "◎",
  attendance: "✓",
  block: "⊘",
  recurring: "↻",
  price: "$",
  map: "⌖",
  maintenance: "⚒",
};

type RoleTabIconProps = {
  name: RoleTabIconName;
  color: ColorValue;
  size: number;
  focused: boolean;
};

export function RoleTabIcon({
  name,
  color,
  size,
  focused,
}: RoleTabIconProps) {
  return (
    <Text
      accessible={false}
      style={[
        styles.icon,
        { color, fontSize: size, opacity: focused ? 1 : 0.78 },
      ]}
    >
      {GLYPHS[name]}
    </Text>
  );
}

const styles = StyleSheet.create({
  icon: {
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 25,
  },
});
