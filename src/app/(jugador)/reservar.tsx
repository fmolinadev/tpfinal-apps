import { StyleSheet, Text, View } from "react-native";

export default function ReservarScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reservar</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  title: { fontSize: 24, fontWeight: "700", color: "#0f172a" },
});
