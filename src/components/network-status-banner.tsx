import { useEffect, useState } from "react";
import {
  addNetworkStateListener,
  getNetworkStateAsync,
} from "expo-network";
import { StyleSheet, Text, View } from "react-native";

export function NetworkStatusBanner() {
  const [sinConexion, setSinConexion] = useState(false);

  useEffect(() => {
    let activo = true;
    let estadoInicialPendiente = true;
    const subscription = addNetworkStateListener((estado) => {
      estadoInicialPendiente = false;
      setSinConexion(
        estado.isConnected === false || estado.isInternetReachable === false,
      );
    });

    void getNetworkStateAsync()
      .then((estado) => {
        if (activo && estadoInicialPendiente) {
          setSinConexion(
            estado.isConnected === false ||
              estado.isInternetReachable === false,
          );
        }
      })
      .catch((error: unknown) => {
        console.warn("No se pudo consultar el estado de la conexión.", error);
      });

    return () => {
      activo = false;
      subscription.remove();
    };
  }, []);

  if (!sinConexion) return null;

  return (
    <View
      style={styles.banner}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.text}>
        Sin conexión a internet. Se mostrarán los datos guardados cuando estén
        disponibles.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#713f12",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  text: {
    color: "#fef3c7",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
});
