export const MAPA_LEAFLET_HTML = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' https://unpkg.com blob:; style-src 'unsafe-inline' https://unpkg.com; img-src https://tiles.openfreemap.org data: blob:; connect-src https://tiles.openfreemap.org; worker-src blob:;">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha384-sHL9NAb7lN7rfvG5lfHpm643Xkcjzp4jFvuavGOndn6pjVqS6ny56CAt3nsEVT4H" crossorigin="anonymous">
  <link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" integrity="sha384-MinO0mNliZ3vwppuPOUnGa+iq619pfMhLVUXfC4LHwSCvF9H+6P/KO4Q7qBOYV5V" crossorigin="anonymous">
  <style>html,body,#mapa{height:100%;width:100%;margin:0} .leaflet-container{background:#eee} .leaflet-control-attribution{font-size:10px}</style>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha384-cxOPjt7s7Iz04uaHJceBmS+qpjv2JkIHNVcuOrM+YHwZOmJGBXI00mdUXEq65HTH" crossorigin="anonymous"></script>
  <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js" integrity="sha384-SYKAG6cglRMN0RVvhNeBY0r3FYKNOJtznwA0v7B5Vp9tr31xAHsZC0DqkQ/pZDmj" crossorigin="anonymous"></script>
  <script src="https://unpkg.com/@maplibre/maplibre-gl-leaflet@0.0.22/leaflet-maplibre-gl.js" integrity="sha384-4CB9Vtol9LN6lGgBCvmPLbUEZwilrqIvPieSRurgAXAB7FVJaLS9n8WyAIA5wjQ+" crossorigin="anonymous"></script>
</head>
<body>
<div id="mapa"></div>
<script>
  function enviar(mensaje) {
    window.ReactNativeWebView.postMessage(JSON.stringify(mensaje));
  }
  if (!window.L || !window.maplibregl || !L.maplibreGL) {
    enviar({ tipo: "error", mensaje: "No se pudieron cargar las bibliotecas del mapa. Comprobá tu conexión." });
  } else {
    let mapa;
    let marcadores;
    let ultimoCentro;
    window.actualizarMapa = function(datos) {
      try {
        const centro = [datos.centro.latitude, datos.centro.longitude];
        const centroActual = JSON.stringify(datos.centro);
        if (!mapa) {
          mapa = L.map("mapa", { minZoom: 1 }).setView(centro, datos.centro.zoom);
          const capa = L.maplibreGL({ style: "https://tiles.openfreemap.org/styles/liberty" }).addTo(mapa);
          capa.getMaplibreMap().on("error", function(error) {
            console.error("Error del mapa:", error.error);
            enviar({ tipo: "error", mensaje: "No se pudo cargar el mapa. Comprobá tu conexión." });
          });
          mapa.attributionControl.addAttribution(
            '<a href="https://openfreemap.org/">OpenFreeMap</a> | &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> | Datos &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          );
          marcadores = L.layerGroup().addTo(mapa);
        } else if (centroActual !== ultimoCentro) {
          mapa.setView(centro, datos.centro.zoom, { animate: true });
        }
        ultimoCentro = centroActual;
        marcadores.clearLayers();
        datos.marcadores.forEach(function(marcador) {
          const etiqueta = document.createElement("span");
          etiqueta.textContent = marcador.titulo;
          const punto = L.circleMarker([marcador.latitude, marcador.longitude], {
            radius: marcador.esUsuario ? 7 : 10,
            color: "#ffffff",
            weight: 2,
            fillColor: marcador.esUsuario ? "#2563eb" : "#a55890",
            fillOpacity: 1
          }).addTo(marcadores).bindTooltip(etiqueta);
          if (!marcador.esUsuario) {
            punto.on("click", function() { enviar({ tipo: "marcador", id: marcador.id }); });
          }
        });
      } catch (error) {
        console.error("Error al mostrar el mapa:", error);
        enviar({ tipo: "error", mensaje: "No se pudo mostrar el mapa." });
      }
    };
    enviar({ tipo: "listo" });
  }
</script>
</body>
</html>`;
