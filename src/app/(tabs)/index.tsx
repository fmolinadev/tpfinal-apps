import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { getEspacios } from "@/servicios/espacios";
import type { Espacio } from "@/tipos";

const deportesFiltro = ["todos", "futbol", "padel", "tenis", "basket"] as const;
type FiltroDeporte = (typeof deportesFiltro)[number];

const complejosFiltro = ["todos", "Cancha 1", "Cancha 2", "Cancha 3"] as const;
type FiltroComplejo = (typeof complejosFiltro)[number];

export default function EspaciosScreen() {
  const router = useRouter();
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroDeporte, setFiltroDeporte] = useState<FiltroDeporte>("todos");
  const [filtroComplejo, setFiltroComplejo] = useState<FiltroComplejo>("todos");

  useEffect(() => {
    async function loadEspacios() {
      setLoading(true);
      setError(null);

      try {
        const respuesta = await getEspacios();

        if ("error" in respuesta && respuesta.error) {
          setError(respuesta.error.mensaje);
          setEspacios([]);
          return;
        }

        setEspacios(respuesta.datos);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar los espacios.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadEspacios();
  }, []);

  const espaciosFiltrados = useMemo(() => {
    return espacios.filter((espacio) => {
      const coincideDeporte =
        filtroDeporte === "todos" || espacio.deporte === filtroDeporte;
      const coincideComplejo =
        filtroComplejo === "todos" || espacio.nombre === filtroComplejo;

      return coincideDeporte && coincideComplejo;
    });
  }, [espacios, filtroComplejo, filtroDeporte]);

  const renderItem = ({ item }: { item: Espacio }) => (
    <Pressable
      style={styles.card}
      onPress={() => {
        router.push({ pathname: "/espacio/[id]", params: { id: item.id } });
      }}
    >
      {item.fotosUrl[0] ? (
        <Image source={{ uri: item.fotosUrl[0] }} style={styles.cardImage} />
      ) : (
        <View style={styles.cardImagePlaceholder}>
          <Text style={styles.placeholderText}>Sin foto</Text>
        </View>
      )}

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{item.nombre}</Text>
        <Text style={styles.cardText}>
          {item.deporte} • {item.superficie}
        </Text>
        <Text style={styles.cardText}>
          Luz: {item.luzNocturna ? "Sí" : "No"}
        </Text>
        <Text style={styles.cardText}>Precio: ${item.precioPorHora}</Text>
        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>Ver detalle</Text>
        </Pressable>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Espacios disponibles</Text>

      <View style={styles.filterBlock}>
        <Text style={styles.filterTitle}>Filtrar por deporte</Text>
        <View style={styles.filterRow}>
          {deportesFiltro.map((deporte) => {
            const activo = filtroDeporte === deporte;
            return (
              <Pressable
                key={deporte}
                style={[
                  styles.filterButton,
                  activo && styles.filterButtonActive,
                ]}
                onPress={() => setFiltroDeporte(deporte)}
              >
                <Text
                  style={[styles.filterText, activo && styles.filterTextActive]}
                >
                  {deporte === "todos" ? "Todos" : deporte}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.filterBlock}>
        <Text style={styles.filterTitle}>Filtrar por complejo</Text>
        <View style={styles.filterRow}>
          {complejosFiltro.map((complejo) => {
            const activo = filtroComplejo === complejo;
            return (
              <Pressable
                key={complejo}
                style={[
                  styles.filterButton,
                  activo && styles.filterButtonActive,
                ]}
                onPress={() => setFiltroComplejo(complejo)}
              >
                <Text
                  style={[styles.filterText, activo && styles.filterTextActive]}
                >
                  {complejo === "todos" ? "Todos" : complejo}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {loading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color="#f4f7fb" />
          <Text style={styles.stateText}>Cargando espacios...</Text>
        </View>
      ) : error ? (
        <View style={styles.stateContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={espaciosFiltrados}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No hay espacios para este filtro.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b1120",
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#f4f7fb",
    marginBottom: 16,
  },
  filterBlock: {
    marginBottom: 14,
  },
  filterTitle: {
    color: "#dfe7f2",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterButton: {
    borderRadius: 999,
    backgroundColor: "#1d293d",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#364152",
  },
  filterButtonActive: {
    backgroundColor: "#8b5cf6",
    borderColor: "#a78bfa",
  },
  filterText: {
    color: "#edf4ff",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  filterTextActive: {
    color: "#ffffff",
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: "#111827",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#273244",
  },
  cardImage: {
    width: "100%",
    height: 180,
    backgroundColor: "#1f2937",
  },
  cardImagePlaceholder: {
    width: "100%",
    height: 180,
    backgroundColor: "#1d293d",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: "#d8e0eb",
    fontWeight: "700",
  },
  cardBody: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#f8fafc",
    marginBottom: 6,
  },
  cardText: {
    fontSize: 14,
    color: "#d4deeb",
    marginBottom: 6,
    textTransform: "capitalize",
  },
  button: {
    marginTop: 12,
    backgroundColor: "#f4f7fb",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#111827",
    fontWeight: "800",
  },
  stateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  stateText: {
    color: "#edf4ff",
    fontSize: 16,
    marginTop: 12,
  },
  errorText: {
    color: "#fecaca",
    fontSize: 15,
    textAlign: "center",
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "#dfe7f2",
    fontSize: 15,
  },
});
