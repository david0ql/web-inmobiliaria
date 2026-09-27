import L from 'leaflet'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

/*
  El puente busca `maplibregl` en el objeto global, no lo importa.

  Sin esta linea coge lo que haya —o nada—, y el sintoma es que su worker no
  arranca: "Worker failed to load". Tiene que ir ANTES de importar el puente,
  porque el puente lo lee al cargarse.
*/
;(window as unknown as { maplibregl: typeof maplibregl }).maplibregl = maplibregl

/*
  El worker, servido por nosotros.

  MapLibre descarga y tesela en un worker que vive en un fichero hermano
  (`maplibre-gl-worker.mjs`). Al empaquetar, ese fichero deja de estar al lado
  del modulo principal, y lo que el navegador acaba pidiendo es una ruta que no
  existe: el servidor devuelve el index.html del sitio, el worker intenta
  ejecutar HTML y muere con "Worker failed to load. Check that the worker URL is
  correct" — un mensaje que manda a mirar la URL, que es lo unico que estaba
  bien. El mapa se queda en blanco sin mas aviso.

  `?worker&url` le pide al empaquetador que emita ese fichero como un asset con
  su propia direccion y nos la devuelva, y `setWorkerUrl` se la dice a MapLibre.
*/
import urlDelWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
maplibregl.setWorkerUrl(urlDelWorker)

await import('@maplibre/maplibre-gl-leaflet')

/**
 * La piel de los mapas del sitio: teselas, controles y chinchetas.
 *
 * Vive aparte porque hay TRES mapas —el del inventario (portada y buscador), el
 * de la ficha del inmueble y el del proyecto— y hasta ahora cada uno repetia su
 * capa de teselas, su chincheta y su circulo a mano. Estaban ya desalineados: el
 * de la ficha se habia quedado sin teselas de alta densidad y se veia borroso en
 * movil. Un sitio con tres mapas que no se parecen entre si no tiene un mapa,
 * tiene tres.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * LAS TESELAS: CARTO VOYAGER, NO EL OPENSTREETMAP DE SERIE
 * ────────────────────────────────────────────────────────────────────────────
 *
 * El estilo estandar de OSM esta pensado para editar el mapa: carreteras muy
 * saturadas, todos los comercios rotulados, bosques de un verde intenso. Sobre
 * el, una chincheta negra de inmueble compite con media docena de iconos de
 * gasolinera. Voyager es una base cartografica: bajada de saturacion, menos
 * rotulos y el color reservado para lo que orienta —agua, parques, vias
 * principales—. Lo que se tiene que ver encima es el inventario.
 *
 * CONDICIONES DE USO, que van con el servicio y no son opcionales:
 *
 *  - La atribucion a OpenStreetMap Y a CARTO se queda visible. Los datos son de
 *    OSM (ODbL) y el estilo y la entrega son de CARTO; quitar cualquiera de las
 *    dos incumple. Por eso va escrita aqui y no en cada mapa: asi no se puede
 *    olvidar en uno.
 *  - Los basemaps gratuitos de CARTO son para uso razonable de un sitio web. No
 *    se descargan teselas en lote ni se cachean en servidor propio: se piden las
 *    que el visitante mira, y ya.
 *  - Si el trafico crece, lo que toca es una cuenta con su plan, no repartir la
 *    carga entre subdominios para disimular.
 *
 * `@2x` en pantallas densas EN VEZ DE `detectRetina`. Leaflet, con
 * `detectRetina`, pide teselas de un zoom MAS y las dibuja a la mitad: cuatro
 * peticiones donde cabia una. CARTO sirve la version `@2x` de cada tesela, que
 * es la misma imagen al doble de resolucion: una sola peticion, el mismo
 * resultado y la cuarta parte del trafico contra un servicio ajeno.
 */
/**
 * El estilo: Liberty de OpenFreeMap.
 *
 * Es el aspecto que se buscaba —el de CARTO Voyager— por otro camino. Los dos
 * descienden del mismo linaje (OSM Bright sobre el esquema OpenMapTiles): misma
 * paleta apagada, el color reservado para agua, parques y vias principales, y
 * pocos rotulos. Al lado, el estilo estandar de OpenStreetMap es un mapa para
 * editar OpenStreetMap: carreteras naranja chillon y un icono por cada
 * gasolineria, compitiendo con las chinchetas del inventario.
 *
 * ¿POR QUE NO CARTO, QUE ERA LO PEDIDO?
 *
 * Porque ya no sirve sus teselas sin clave. Devuelve un PNG de 2 KB que dice
 * "API KEY REQUIRED" —con codigo 200, asi que ni siquiera se ve como un fallo—.
 * Comprobado desde Chrome en los cuatro subdominios, en dos estilos y en ambas
 * densidades. Si algun dia se contrata una clave, se pone `VITE_CARTO_API_KEY`
 * en el `.env` y esto pasa a usar Voyager sin tocar nada mas.
 *
 * ¿Y POR QUE VECTORIAL Y NO IMAGENES?
 *
 * Porque no existe ningun proveedor de teselas EN IMAGEN con este aspecto que
 * no pida clave. Vectorial resulta ademas mejor aqui: el navegador dibuja el
 * mapa a la resolucion de la pantalla, asi que se ve nitido en cualquier movil
 * y en cualquier zoom intermedio, y los rotulos se recolocan en vez de venir
 * cocidos dentro de un PNG.
 *
 * OpenFreeMap no pide clave ni registro y no impone limite de peticiones; se
 * financia con donaciones. La atribucion a OpenStreetMap y a OpenMapTiles se
 * queda puesta, que es lo que pide la licencia de los datos.
 */
const ESTILO_LIBERTY = 'https://tiles.openfreemap.org/styles/liberty'

/** El Voyager de CARTO, solo si hay clave. */
const VOYAGER = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager'

/**
 * La clave de CARTO, si la hay.
 *
 * Se pide en https://carto.com/basemaps/ ("Request a key"). El parametro de la
 * URL se llama `key`, no `api_key`. El plan gratuito de uso COMERCIAL —que es
 * el nuestro— es de un millon de peticiones al mes, y conviene restringir la
 * clave por dominio desde su panel: viaja en la URL de cada tesela, o sea que
 * es publica por definicion.
 */
const CLAVE_CARTO = import.meta.env.VITE_CARTO_API_KEY as string | undefined

/** Densidad de pantalla, leida una vez: no cambia sin recargar. */
const DENSA =
  typeof window !== 'undefined' && window.devicePixelRatio > 1.25 ? '@2x' : ''

export const ATRIBUCION = CLAVE_CARTO
  ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
  : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://openfreemap.org/">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/">OpenMapTiles</a>'

/** La capa base, igual en los tres mapas. */
export function capaBase(): L.Layer {
  if (CLAVE_CARTO) {
    return L.tileLayer(`${VOYAGER}/{z}/{x}/{y}${DENSA}.png?key=${CLAVE_CARTO}`, {
      attribution: ATRIBUCION,
      maxZoom: 19,
      keepBuffer: 4,
    })
  }

  /*
    La capa vectorial vive dentro de Leaflet como una capa mas.

    Leaflet sigue mandando en todo lo demas —chinchetas, agrupacion, el globo de
    la ficha, el vuelo de la portada al buscador—; MapLibre solo dibuja el fondo
    sobre un lienzo. Es lo que permite cambiar el aspecto del mapa sin tocar una
    linea del resto.
  */
  const capa = L.maplibreGL({
    style: ESTILO_LIBERTY,
    // El lienzo no atiende gestos: los sigue gobernando Leaflet, que es quien
    // sabe de chinchetas y de popups.
    interactive: false,
  })
  /*
    La atribucion se pone a mano porque el puente no la acepta como opcion, y no
    es opcional: la licencia de los datos de OpenStreetMap la exige.
  */
  capa.getAttribution = () => ATRIBUCION
  return capa
}

/**
 * El control de zoom, abajo a la derecha y con aspecto de mapa moderno.
 *
 * Arriba a la izquierda, que es donde lo pone Leaflet, se comia justo la esquina
 * donde caen las chinchetas del centro de Bucaramanga. Abajo a la derecha es
 * ademas donde lo espera cualquiera que haya usado un mapa en los ultimos diez
 * años.
 */
export function controlZoom(): L.Control.Zoom {
  return L.control.zoom({ position: 'bottomright' })
}

/**
 * La chincheta: gota con punta, anclada al suelo.
 *
 * Antes era un circulo centrado en la coordenada, y un circulo no tiene punta:
 * no se sabe si el inmueble esta en su centro o en su borde, que sobre una
 * manzana son cincuenta metros. La gota apunta al punto exacto y por eso se
 * ancla abajo del todo.
 *
 * En la tinta del sitio y no en el rojo de Google: el mapa es una pantalla mas
 * del sitio, no una captura de otra aplicacion.
 */
export function chincheta(destacada = false): L.DivIcon {
  const tinta = destacada ? '#c8102e' : '#0d0d0d'
  return L.divIcon({
    className: '',
    iconSize: [26, 34],
    iconAnchor: [13, 34],
    popupAnchor: [0, -30],
    html: `
      <div style="width:26px;height:34px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.35));transform-origin:50% 100%;transition:transform .25s cubic-bezier(.2,.8,.2,1)">
        <svg viewBox="0 0 26 34" width="26" height="34" xmlns="http://www.w3.org/2000/svg">
          <path d="M13 0C5.82 0 0 5.82 0 13c0 9.75 13 21 13 21s13-11.25 13-21C26 5.82 20.18 0 13 0z" fill="${tinta}"/>
          <circle cx="13" cy="13" r="5" fill="#fff"/>
        </svg>
      </div>
    `,
  })
}

/** El circulo de los inmuebles con direccion aproximada. */
export function cercoAproximado(
  posicion: L.LatLngExpression,
  radio = 400,
): L.Circle {
  return L.circle(posicion, {
    radius: radio,
    color: '#0d0d0d',
    weight: 1,
    fillOpacity: 0.12,
  })
}
