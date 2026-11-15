import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { MAPA_LEAFLET_HTML } from "@/components/mapa-leaflet-html";
import { useTheme, useThemeStyles } from "@/hooks/use-theme";

export type CentroMapa = {
  latitude: number;
  longitude: number;
  zoom: number;
  secuencia?: number;
};

export type MarcadorMapa = {
  id: string;
  latitude: number;
  longitude: number;
  titulo: string;
  esUsuario?: boolean;
};

type Props = {
  centro: CentroMapa;
  marcadores: MarcadorMapa[];
  onSeleccionarMarcador?: (id: string) => void;
  style: StyleProp<ViewStyle>;
};

const source = { html: MAPA_LEAFLET_HTML };
const enlacesAtribucion = new Set([
  "https://openfreemap.org/",
  "https://openmaptiles.org/",
  "https://www.openstreetmap.org/copyright",
  "https://leafletjs.com/",
]);

export function MapaLeaflet({ centro, marcadores, onSeleccionarMarcador, style }: Props) {
  const palette = useTheme();
  const styles = useThemeStyles(createStyles, palette);
  const webview = useRef<WebView<unknown>>(null);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const datos = JSON.stringify({ centro, marcadores }).replace(/</g, "\\u003c");

  useEffect(() => {
    if (listo) {
      webview.current?.injectJavaScript(`window.actualizarMapa(${datos}); true;`);
    }
  }, [datos, listo]);

  useEffect(() => {
    if (listo || error) return;
    const timer = setTimeout(() => {
      setError("El mapa tardó demasiado en cargar. Comprobá tu conexión e intentá nuevamente.");
    }, 20000);
    return () => clearTimeout(timer);
  }, [error, intento, listo]);

  function recibirMensaje(event: WebViewMessageEvent) {
    let mensaje: unknown;
    try {
      mensaje = JSON.parse(event.nativeEvent.data);
    } catch (error) {
      console.warn("Mensaje inválido del mapa.", error);
      return;
    }
    if (!mensaje || typeof mensaje !== "object" || !("tipo" in mensaje)) return;
    if (mensaje.tipo === "listo") {
      setListo(true);
    } else if (mensaje.tipo === "error") {
      setError("No se pudo cargar el mapa. Comprobá tu conexión e intentá nuevamente.");
    } else if (
      mensaje.tipo === "marcador" &&
      "id" in mensaje &&
      typeof mensaje.id === "string" &&
      marcadores.some((marcador) => !marcador.esUsuario && marcador.id === mensaje.id)
    ) {
      onSeleccionarMarcador?.(mensaje.id);
    }
  }

  function reintentar() {
    setListo(false);
    setError(null);
    setIntento((actual) => actual + 1);
  }

  return (
    <View style={[style, styles.contenedor]}>
      {error ? (
        <View style={styles.estado}>
          <Text style={styles.mensaje}>{error}</Text>
          <Pressable accessibilityRole="button" onPress={reintentar} style={styles.boton}>
            <Text style={styles.botonTexto}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <WebView<unknown>
          key={intento}
          ref={webview}
          source={source}
          originWhitelist={["*"]}
          onMessage={recibirMensaje}
          onError={(event) => {
            console.warn("Error del WebView del mapa.", event.nativeEvent);
            setError("No se pudo cargar el mapa. Comprobá tu conexión e intentá nuevamente.");
          }}
          onRenderProcessGone={() => {
            setError("El mapa dejó de funcionar. Intentá nuevamente.");
          }}
          onContentProcessDidTerminate={() => {
            setError("El mapa dejó de funcionar. Intentá nuevamente.");
          }}
          onShouldStartLoadWithRequest={(request) => {
            if (request.url === "about:blank") return true;
            if (enlacesAtribucion.has(request.url)) {
              void Linking.openURL(request.url).catch((err: unknown) => {
                console.warn("No se pudo abrir la atribución del mapa.", err);
                Alert.alert("No se pudo abrir el enlace", "Intentá nuevamente.");
              });
            }
            return false;
          }}
          accessibilityLabel="Mapa de espacios deportivos"
          style={styles.webview}
        />
      )}
    </View>
  );
}

function createStyles(palette: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    contenedor: { overflow: "hidden" },
    webview: { flex: 1, backgroundColor: palette.background },
    estado: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 12,
      gap: 8,
      backgroundColor: palette.background,
    },
    mensaje: { color: palette.text, textAlign: "center" },
    boton: { padding: 8, backgroundColor: palette.backgroundSelected, borderRadius: 8 },
    botonTexto: { color: palette.textOnSelected, fontWeight: "800" },
  });
}
