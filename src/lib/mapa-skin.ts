import L from 'leaflet'

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
const VOYAGER = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager'

/**
 * La clave de CARTO, si la hay.
 *
 * CARTO dejo de servir sus basemaps sin clave: sin ella devuelve una tesela gris
 * que pone "API KEY REQUIRED" —con 200 y todo, asi que ni siquiera falla de
 * forma visible en la consola—. Con clave se usa Voyager; sin ella se cae al
 * estilo estandar de OpenStreetMap, que es feo para esto pero funciona y no le
 * debe nada a nadie.
 *
 * Se pide en https://carto.com/basemaps/ ("Request a key") y se pone en el
 * `.env` del despliegue como `VITE_CARTO_API_KEY`. El parametro de la URL se
 * llama `key`, no `api_key`.
 *
 * El plan gratuito de uso COMERCIAL —que es el nuestro— son un millon de
 * peticiones al mes. Conviene restringir la clave por dominio desde el panel de
 * CARTO: la clave viaja en la URL de cada tesela, o sea que es publica por
 * definicion, y sin restriccion cualquiera puede gastar la cuota.
 */
const CLAVE_CARTO = import.meta.env.VITE_CARTO_API_KEY as string | undefined

/** Densidad de pantalla, leida una vez: no cambia sin recargar. */
const DENSA =
  typeof window !== 'undefined' && window.devicePixelRatio > 1.25 ? '@2x' : ''

const FUENTE = CLAVE_CARTO
  ? {
      url: `${VOYAGER}/{z}/{x}/{y}${DENSA}.png?key=${CLAVE_CARTO}`,
      atribucion:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      /*
        `@2x` EN VEZ DE `detectRetina`. Leaflet, con `detectRetina`, pide teselas
        de un zoom MAS y las dibuja a la mitad: cuatro peticiones donde cabia
        una. CARTO sirve la version `@2x` de cada tesela, que es la misma imagen
        al doble de resolucion: una peticion, el mismo resultado y la cuarta
        parte del trafico contra un servicio ajeno.
      */
      retina: false,
    }
  : {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      atribucion:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      // OSM no publica teselas @2x, asi que aqui si toca el truco de Leaflet.
      retina: true,
    }

export const ATRIBUCION = FUENTE.atribucion

/** La capa base, igual en los tres mapas. */
export function capaBase(): L.TileLayer {
  return L.tileLayer(FUENTE.url, {
    attribution: FUENTE.atribucion,
    detectRetina: FUENTE.retina,
    maxZoom: 19,
    /*
      Dos anillos de teselas de mas alrededor de lo que se ve, en vez de uno.
      El mapa del buscador se mueve mucho —el raton lo hace volar de una tarjeta
      a otra— y con el margen de serie cada salto corto descubria un borde gris.
    */
    keepBuffer: 4,
  })
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
