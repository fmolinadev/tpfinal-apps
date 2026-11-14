import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Network from "expo-network";

type EstadoConexion = boolean | null;

type ContextoConectividad = {
  isOnline: EstadoConexion;
};

const ConectividadContext = createContext<ContextoConectividad>({
  isOnline: null,
});

type Props = {
  children: ReactNode;
};

function obtenerEstadoConexion(state: Network.NetworkState): EstadoConexion {
  if (
    state.isConnected === false ||
    state.isInternetReachable === false
  ) {
    return false;
  }

  if (state.isConnected === true) {
    return true;
  }

  return null;
}

export function useConectividad() {
  return useContext(ConectividadContext);
}

export function ConectividadProvider({ children }: Props) {
  const [isOnline, setIsOnline] = useState<EstadoConexion>(null);
  const [mostrarRestablecida, setMostrarRestablecida] = useState(false);

  const estadoAnterior = useRef<EstadoConexion>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let activo = true;

    function actualizarConexion(state: Network.NetworkState) {
      if (!activo) {
        return;
      }

      const nuevoEstado = obtenerEstadoConexion(state);
      const estadoPrevio = estadoAnterior.current;

      estadoAnterior.current = nuevoEstado;
      setIsOnline(nuevoEstado);

      if (nuevoEstado === false) {
        setMostrarRestablecida(false);

        if (temporizador.current) {
          clearTimeout(temporizador.current);
          temporizador.current = null;
        }
      }

      if (estadoPrevio === false && nuevoEstado === true) {
        setMostrarRestablecida(true);

        if (temporizador.current) {
          clearTimeout(temporizador.current);
        }

        temporizador.current = setTimeout(() => {
          if (activo) {
            setMostrarRestablecida(false);
          }
          temporizador.current = null;
        }, 3500);
      }
    }

    const suscripcion = Network.addNetworkStateListener(
      actualizarConexion,
    );

    void Network.getNetworkStateAsync()
      .then(actualizarConexion)
      .catch(() => {
        if (activo) {
          setIsOnline(null);
        }
      });

    return () => {
      activo = false;
      suscripcion.remove();

      if (temporizador.current) {
        clearTimeout(temporizador.current);
        temporizador.current = null;
      }
    };
  }, []);

  return (
    <ConectividadContext.Provider value={{ isOnline }}>
      <View style={styles.contenedor}>
        {children}

        <AvisoConexion
          isOnline={isOnline}
          mostrarRestablecida={mostrarRestablecida}
        />
      </View>
    </ConectividadContext.Provider>
  );
}

function AvisoConexion({
  isOnline,
  mostrarRestablecida,
}: {
  isOnline: EstadoConexion;
  mostrarRestablecida: boolean;
}) {
  if (isOnline === false) {
    return (
      <View style={[styles.aviso, styles.avisoOffline]}>
        <Text style={styles.texto}>
          Sin conexión a internet. Algunas funciones no estarán disponibles.
        </Text>
      </View>
    );
  }

  if (isOnline === true && mostrarRestablecida) {
    return (
      <View style={[styles.aviso, styles.avisoOnline]}>
        <Text style={styles.texto}>
          Conexión restablecida.
        </Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
  },
  aviso: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  avisoOffline: {
    backgroundColor: "#92400e",
  },
  avisoOnline: {
    backgroundColor: "#166534",
  },
  texto: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
});