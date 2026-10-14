import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { Colors, Fonts } from "@/constants/theme";
import { getEspacios } from "@/servicios/espacios";
import { getTurnos } from "@/servicios/reservas";
import type { Espacio, Turno } from "@/tipos";

type Vista = "espacios" | "disponibilidad";
type HorarioDisponible = { espacio: Espacio; turno: Turno };

function inicioDelDia(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

function sumarDias(fecha: Date, dias: number): Date {
  const resultado = new Date(fecha);
  resultado.setDate(resultado.getDate() + dias);
  return inicioDelDia(resultado);
}

function claveFecha(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}

function fechaIsoParaHora(fecha: Date, hora: number): string {
  return new Date(
    fecha.getFullYear(),
    fecha.getMonth(),
    fecha.getDate(),
    hora,
  ).toISOString();
}

function formatearFecha(fecha: Date): string {
  return fecha.toLocaleDateString("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function formatearHora(fechaIso: string): string {
  return new Date(fechaIso).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function EspaciosScreen() {
  const router = useRouter();
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [vista, setVista] = useState<Vista>("espacios");
  const [disciplina, setDisciplina] = useState("todas");
  const [fecha, setFecha] = useState(() => inicioDelDia(new Date()));
  const [horarios, setHorarios] = useState<HorarioDisponible[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHorarios, setLoadingHorarios] = useState(false);

  useEffect(() => {
    getEspacios().then((respuesta) => {
      if (!("error" in respuesta)) setEspacios(respuesta.datos);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (vista !== "disponibilidad" || espacios.length === 0) return;

    async function cargarHorarios() {
      setLoadingHorarios(true);
      const fechaClave = claveFecha(fecha);
      const resultados = await Promise.all(
        espacios.map(async (espacio) => {
          const respuesta = await getTurnos(
            espacio.id,
            fechaIsoParaHora(fecha, 0),
            fechaIsoParaHora(sumarDias(fecha, 1), 0),
          );
          if ("error" in respuesta) return [];

          const turnosPorHora = new Map(
            respuesta.datos
              .filter(
                (turno) =>
                  claveFecha(new Date(turno.fechaHoraInicio)) === fechaClave,
              )
              .map((turno) => [
                new Date(turno.fechaHoraInicio).getHours(),
                turno,
              ]),
          );

          return Array.from({ length: 16 }, (_, indice) => {
            const hora = indice + 8;
            const turno = turnosPorHora.get(hora) ?? {
              id: `libre-${espacio.id}-${fechaClave}-${hora}`,
              espacioId: espacio.id,
              fechaHoraInicio: fechaIsoParaHora(fecha, hora),
              estado: "libre" as const,
              precio: espacio.precioPorHora,
            };
            return { espacio, turno };
          }).filter(
            ({ turno }) =>
              turno.estado === "libre" &&
              new Date(turno.fechaHoraInicio).getTime() > Date.now(),
          );
        }),
      );
      setHorarios(resultados.flat());
      setLoadingHorarios(false);
    }

    void cargarHorarios();
  }, [espacios, fecha, vista]);

  const disciplinas = useMemo(
    () => [
      "todas",
      ...Array.from(new Set(espacios.map((espacio) => espacio.deporte))),
    ],
    [espacios],
  );
  const horariosFiltrados = horarios.filter(
    ({ espacio }) => disciplina === "todas" || espacio.deporte === disciplina,
  );

  if (loading)
    return (
      <ActivityIndicator
        style={styles.loader}
        color={Colors.light.backgroundSelected}
      />
    );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {vista === "espacios" ? "Elegí tu espacio" : "Buscá un horario"}
        </Text>
        <Text style={styles.subtitle}>
          {vista === "espacios"
            ? "Elegí una cancha para ver sus horarios y reservar."
            : "Filtrá por disciplina y encontrá un turno libre."}
        </Text>
      </View>

      <View style={styles.segmentedControl}>
        <Pressable
          style={[styles.segment, vista === "espacios" && styles.segmentActive]}
          onPress={() => setVista("espacios")}
        >
          <Text
            style={[
              styles.segmentText,
              vista === "espacios" && styles.segmentTextActive,
            ]}
          >
            Ver por espacio
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.segment,
            vista === "disponibilidad" && styles.segmentActive,
          ]}
          onPress={() => setVista("disponibilidad")}
        >
          <Text
            style={[
              styles.segmentText,
              vista === "disponibilidad" && styles.segmentTextActive,
            ]}
          >
            Ver por disponibilidad
          </Text>
        </Pressable>
      </View>

      {vista === "espacios" ? (
        espacios.map((espacio) => (
          <Pressable
            key={espacio.id}
            style={styles.card}
            onPress={() =>
              router.push({
                pathname: "/espacio/[id]/disponibilidad",
                params: { id: espacio.id },
              })
            }
          >
            <Image source={{ uri: espacio.fotosUrl[0] }} style={styles.image} />
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{espacio.nombre}</Text>
              <Text style={styles.meta}>
                {espacio.deporte} · {espacio.superficie}
              </Text>
              <Text style={styles.price}>
                $ {espacio.precioPorHora.toLocaleString("es-AR")} / hora
              </Text>
              <Text style={styles.action}>Ver disponibilidad →</Text>
            </View>
          </Pressable>
        ))
      ) : (
        <>
          <Text style={styles.filterLabel}>Disciplina</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {disciplinas.map((opcion) => (
              <Pressable
                key={opcion}
                style={[
                  styles.filterChip,
                  disciplina === opcion && styles.filterChipActive,
                ]}
                onPress={() => setDisciplina(opcion)}
              >
                <Text
                  style={[
                    styles.filterText,
                    disciplina === opcion && styles.filterTextActive,
                  ]}
                >
                  {opcion === "todas" ? "Todas" : opcion}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <Text style={styles.filterLabel}>Fecha</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {Array.from({ length: 7 }, (_, indice) =>
              sumarDias(inicioDelDia(new Date()), indice),
            ).map((dia) => {
              const activa = claveFecha(dia) === claveFecha(fecha);
              return (
                <Pressable
                  key={claveFecha(dia)}
                  style={[styles.dateChip, activa && styles.filterChipActive]}
                  onPress={() => setFecha(dia)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      activa && styles.filterTextActive,
                    ]}
                  >
                    {formatearFecha(dia)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {loadingHorarios ? (
            <ActivityIndicator
              style={styles.loadingInline}
              color={Colors.light.backgroundSelected}
            />
          ) : horariosFiltrados.length === 0 ? (
            <Text style={styles.empty}>
              No hay horarios libres para estos filtros.
            </Text>
          ) : (
            horariosFiltrados.map(({ espacio, turno }) => (
              <Pressable
                key={`${espacio.id}-${turno.id}`}
                style={styles.availabilityCard}
                onPress={() =>
                  router.push({
                    pathname: "/espacio/[id]/disponibilidad",
                    params: { id: espacio.id },
                  })
                }
              >
                <View>
                  <Text style={styles.cardTitle}>
                    {formatearHora(turno.fechaHoraInicio)}
                  </Text>
                  <Text style={styles.meta}>
                    {espacio.nombre} · {espacio.deporte}
                  </Text>
                </View>
                <View style={styles.availabilityRight}>
                  <Text style={styles.price}>
                    $ {turno.precio.toLocaleString("es-AR")}
                  </Text>
                  <Text style={styles.action}>Reservar →</Text>
                </View>
              </Pressable>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.light.backgroundElement },
  container: { padding: 20, gap: 14 },
  loader: {
    flex: 1,
    backgroundColor: Colors.light.backgroundElement,
    paddingTop: 40,
  },
  header: { gap: 5, marginBottom: 4 },
  eyebrow: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.4,
    fontFamily: Fonts.sans,
  },
  title: {
    color: Colors.light.text,
    fontSize: 30,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
  subtitle: {
    color: Colors.light.text,
    fontSize: 15,
    lineHeight: 21,
    fontFamily: Fonts.sans,
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.light.backgroundElement,
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 9,
  },
  segmentActive: { backgroundColor: Colors.light.backgroundSelected },
  segmentText: {
    color: Colors.light.text,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
    fontFamily: Fonts.sans,
  },
  segmentTextActive: { color: Colors.light.background },
  card: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.light.backgroundElement,
  },
  image: {
    width: "100%",
    height: 150,
    backgroundColor: Colors.light.backgroundElement,
  },
  cardBody: { padding: 16, gap: 5 },
  cardTitle: {
    color: Colors.light.text,
    fontSize: 19,
    fontWeight: "800",
    fontFamily: Fonts.sans,
  },
  meta: {
    color: Colors.light.text,
    textTransform: "capitalize",
    fontFamily: Fonts.sans,
  },
  price: {
    color: Colors.light.textSecondary,
    fontWeight: "800",
    marginTop: 4,
    fontFamily: Fonts.sans,
  },
  action: {
    color: Colors.light.textSecondary,
    fontWeight: "800",
    marginTop: 7,
    fontFamily: Fonts.sans,
  },
  filterLabel: {
    color: Colors.light.text,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2,
    fontFamily: Fonts.sans,
  },
  filterRow: { gap: 8, paddingBottom: 2 },
  filterChip: {
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    borderRadius: 20,
    paddingVertical: 9,
    paddingHorizontal: 14,
    backgroundColor: Colors.light.background,
  },
  filterChipActive: { backgroundColor: Colors.light.backgroundSelected },
  filterText: {
    color: Colors.light.textSecondary,
    fontWeight: "800",
    textTransform: "capitalize",
    fontFamily: Fonts.sans,
  },
  filterTextActive: { color: Colors.light.background },
  dateChip: {
    borderWidth: 1,
    borderColor: Colors.light.backgroundElement,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Colors.light.background,
  },
  loadingInline: { marginTop: 20 },
  empty: {
    color: Colors.light.text,
    textAlign: "center",
    paddingVertical: 24,
    fontFamily: Fonts.sans,
  },
  availabilityCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.light.backgroundElement,
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  availabilityRight: { alignItems: "flex-end" },
});
