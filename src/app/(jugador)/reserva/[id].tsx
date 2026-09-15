import { StyleSheet, Text, View } from "react-native";

export default function ReservaDetalleScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Detalle de reserva</Text>
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
