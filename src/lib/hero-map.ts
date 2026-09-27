import type L from 'leaflet'

/**
 * El vuelo del mapa: de la portada al panel del buscador.
 *
 * Al buscar desde la portada, el mapa grande de arriba se convierte en el panel
 * de la derecha de `/buscar`. No es un adorno: es lo que dice que el mapa que
 * estabas usando y el que vas a usar son el MISMO mapa, mirado desde otro sitio.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * LAS TRES REGLAS DE LAS QUE DEPENDE QUE ESTO SE VEA CARO
 * ────────────────────────────────────────────────────────────────────────────
 *
 * 1. NO SE DEFORMA NADA, NUNCA.
 *
 *    La primera version escalaba una copia del mapa con `transform: scale`. La
 *    portada mide ~2,9:1 y el panel ~0,6:1, asi que el escalado no uniforme
 *    APLASTABA las teselas a mitad de vuelo: calles ovaladas, tipografia
 *    estirada. Se tapaba con un desenfoque, que es justo la clase de parche que
 *    delata el truco — cuando algo se desenfoca al moverse es porque debajo
 *    esta pasando algo que no aguanta que lo mires.
 *
 *    Aqui no se escala: se anima LA VENTANA por la que se ve el mapa
 *    (`clip-path: inset()`), y el mapa se desplaza para que su centro siga al
 *    centro de esa ventana. Un pixel de mapa por cada pixel de pantalla, de
 *    principio a fin. El efecto es de iris abriendose, que ademas es lo que un
 *    mapa hace de verdad: enseñar mas o menos territorio, no estirarlo.
 *
 * 2. EL MAPA QUE VUELA ES EL DE VERDAD, VIVO.
 *
 *    Lo que se mueve no es una foto: es el contenedor del mapa de destino, con
 *    Leaflet dentro, dibujando. Durante el vuelo se le fija el tamaño UNION de
 *    las dos cajas —lo mas ancho y lo mas alto de ambas— para que tenga teselas
 *    en todo lo que cualquiera de los dos encuadres va a necesitar, y ese tamaño
 *    NO cambia mientras vuela: asi no hay `invalidateSize` a media animacion ni
 *    un reflow por cuadro, y el `flyTo` simultaneo calcula bien su trayectoria
 *    (la captura una sola vez, al arrancar).
 *
 * 3. EL FUNDIDO OCURRE CUANDO LAS DOS IMAGENES SON IGUALES.
 *
 *    Antes el clon se desvanecia sobre un mapa que ya estaba en OTRO encuadre:
 *    dos imagenes distintas cruzandose, o sea un salto disimulado. Ahora el mapa
 *    de destino arranca exactamente en el centro y el zoom que tenia la portada,
 *    asi que durante ese primer instante el clon y el mapa vivo son la misma
 *    imagen y el relevo es literalmente invisible. Solo despues empieza a
 *    moverse. El clon existe unicamente para cubrir los milisegundos en los que
 *    el mapa nuevo todavia no ha pintado.
 *
 * Todo es opcional por diseño: si no hay mapa de origen, si el destino no llega,
 * o si el sistema pide menos movimiento, no pasa nada y la navegacion es la de
 * siempre.
 */

/**
 * La curva. Sale muy decidida y frena largo, casi parandose sin llegar a rebotar.
 * Es lo que hace que un movimiento se lea como algo con peso en vez de como una
 * interpolacion lineal disfrazada.
 */
const CURVA = 'cubic-bezier(0.32, 0.72, 0, 1)'

/** Por debajo de 500 ms no se lee como transformacion; por encima de 800 cansa. */
const DURACION_MS = 640

/** Si el destino no aparece en este tiempo, lo que haya montado se retira. */
const PACIENCIA_MS = 2000

/** El radio del panel de destino, para redondear la ventana al llegar. */
const RADIO_FINAL = 16

export const HERO_MAP_ATTR = 'data-hero-map'

interface Origen {
  rect: DOMRect
  /** Donde estaba mirando el mapa de la portada: el destino nace aqui. */
  centro: { lat: number; lng: number }
  zoom: number
  /** La foto de cortesia que cubre mientras el mapa nuevo pinta. */
  clon: HTMLElement
  capa: HTMLElement
  temporizador: number
}

let origen: Origen | null = null

/** El mapa que hay ahora mismo en pantalla, para poder preguntarle donde mira. */
let vivo: L.Map | null = null

export function registrarMapaVivo(map: L.Map | null): void {
  vivo = map
}

function menosMovimiento(): boolean {
  return (
    typeof window === 'undefined' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Congela lo que hay en pantalla y guarda a donde miraba.
 *
 * Se llama justo ANTES de navegar: en ese instante el mapa de la portada todavia
 * existe y se puede medir. Devuelve `false` si no habia nada que congelar.
 */
export function empezarVueloMapa(): boolean {
  if (typeof document === 'undefined' || menosMovimiento()) return false

  const nodo = document.querySelector<HTMLElement>(`[${HERO_MAP_ATTR}]`)
  if (!nodo || !vivo) return false

  const rect = nodo.getBoundingClientRect()
  // Un mapa que ya esta fuera de la pantalla no tiene nada que contar.
  if (rect.bottom < 40 || rect.top > window.innerHeight - 40) return false
  // Y en movil el panel de destino esta aparcado fuera de la pantalla.
  if (window.innerWidth < 992) return false

  cancelarVueloMapa()

  const clon = nodo.cloneNode(true) as HTMLElement
  clon.removeAttribute(HERO_MAP_ATTR)
  clon.style.cssText = `width:${rect.width}px;height:${rect.height}px;margin:0`

  const capa = document.createElement('div')
  capa.setAttribute('aria-hidden', 'true')
  capa.style.cssText = [
    'position:fixed',
    // Por debajo de la cabecera pegajosa y del boton del chat, que son z-40.
    'z-index:30',
    'pointer-events:none',
    'overflow:hidden',
    'contain:strict',
    `left:${rect.left}px`,
    `top:${rect.top}px`,
    `width:${rect.width}px`,
    `height:${rect.height}px`,
  ].join(';')
  capa.appendChild(clon)
  document.body.appendChild(capa)

  ultimoVuelo = Date.now()
  const centro = vivo.getCenter()
  origen = {
    rect,
    centro: { lat: centro.lat, lng: centro.lng },
    zoom: vivo.getZoom(),
    clon,
    capa,
    temporizador: window.setTimeout(cancelarVueloMapa, PACIENCIA_MS),
  }
  return true
}

/**
 * El zoom que haria falta para que una caja encuadre unos limites.
 *
 * Se necesita porque durante el vuelo el contenedor NO mide lo que va a medir al
 * aterrizar: mide la union. Preguntarle a Leaflet por el encuadre daria el zoom
 * de la caja equivocada y el mapa llegaria a su sitio con dos pasos de zoom de
 * mas. Se calcula proyectando los limites y comparando con la caja de verdad.
 */
function zoomParaCaja(
  map: L.Map,
  limites: L.LatLngBounds,
  caja: { ancho: number; alto: number },
  margen = 40,
): number {
  const z = map.getZoom()
  const ne = map.project(limites.getNorthEast(), z)
  const sw = map.project(limites.getSouthWest(), z)
  const necesita = {
    x: Math.abs(ne.x - sw.x) || 1,
    y: Math.abs(ne.y - sw.y) || 1,
  }
  const util = {
    x: Math.max(caja.ancho - margen * 2, 1),
    y: Math.max(caja.alto - margen * 2, 1),
  }
  const escala = Math.min(util.x / necesita.x, util.y / necesita.y)
  return Math.min(Math.floor(map.getScaleZoom(escala, z)), map.getMaxZoom())
}

/** La ventana recortada, en coordenadas del viewport. */
function ventana(r: DOMRect, radio: number) {
  return `inset(${r.top}px ${window.innerWidth - r.right}px ${window.innerHeight - r.bottom}px ${r.left}px round ${radio}px)`
}

/**
 * Trae el mapa de destino volando desde donde estaba el de la portada.
 *
 * `nodo` es el contenedor de Leaflet del buscador y `map` su instancia, ya
 * montada. `limites` es el encuadre al que tiene que llegar.
 */
export function terminarVueloMapa(
  nodo: HTMLElement | null,
  map: L.Map | null,
  limites: L.LatLngBounds | null,
): void {
  const salida = origen
  if (!salida) return
  if (!nodo || !map) {
    cancelarVueloMapa()
    return
  }

  const destino = nodo.getBoundingClientRect()
  const fuera =
    destino.width < 8 ||
    destino.height < 8 ||
    destino.right < 0 ||
    destino.left > window.innerWidth ||
    destino.bottom < 0 ||
    destino.top > window.innerHeight
  if (fuera) {
    desvanecerCobertura()
    return
  }

  window.clearTimeout(salida.temporizador)
  origen = null

  const { rect: desde, capa } = salida

  /*
    La union de las dos cajas.

    Es el tamaño que tiene el contenedor durante todo el vuelo, y la razon de
    que no haga falta escalar nada: contenga lo que contenga la ventana en cada
    instante, los pixeles ya estan ahi dibujados.
  */
  const union = {
    ancho: Math.max(desde.width, destino.width),
    alto: Math.max(desde.height, destino.height),
  }

  /*
    Lo que vuela es el propio contenedor de Leaflet, sacado del flujo con
    `position: fixed`. El panel del buscador se queda donde estaba, vacio: es el
    hueco al que el mapa aterriza. Y como el panel es `sticky` y no tiene
    `transform`, no crea bloque contenedor, asi que su `overflow: hidden` no
    recorta al que vuela.
  */
  const estiloPrevio = nodo.getAttribute('style') ?? ''
  const centrar = (r: DOMRect) => ({
    x: (r.left + r.right) / 2 - union.ancho / 2,
    y: (r.top + r.bottom) / 2 - union.alto / 2,
  })
  const a = centrar(desde)
  const b = centrar(destino)

  nodo.style.position = 'fixed'
  nodo.style.left = '0'
  nodo.style.top = '0'
  nodo.style.width = `${union.ancho}px`
  nodo.style.height = `${union.alto}px`
  nodo.style.zIndex = '31'
  nodo.style.willChange = 'transform, clip-path'
  nodo.style.transform = `translate3d(${a.x}px, ${a.y}px, 0)`
  nodo.style.clipPath = ventana(desde, 0)

  // Una sola vez, ANTES de animar: durante el vuelo el tamaño ya no cambia.
  map.invalidateSize({ animate: false, pan: false })
  // Y arranca mirando exactamente a donde miraba la portada. Este es el
  // fotograma en el que el clon y el mapa vivo son la misma imagen.
  map.setView([salida.centro.lat, salida.centro.lng], salida.zoom, {
    animate: false,
  })

  const centroFinal = limites ? limites.getCenter() : map.getCenter()
  const zoomFinal = limites
    ? zoomParaCaja(map, limites, {
        ancho: destino.width,
        alto: destino.height,
      })
    : map.getZoom()

  const animaciones = [
    nodo.animate(
      {
        transform: [
          `translate3d(${a.x}px, ${a.y}px, 0)`,
          `translate3d(${b.x}px, ${b.y}px, 0)`,
        ],
        clipPath: [ventana(desde, 0), ventana(destino, RADIO_FINAL)],
      },
      { duration: DURACION_MS, easing: CURVA, fill: 'forwards' },
    ),
  ]

  /*
    El relevo del clon.

    Corto y al principio, no al final: mientras las dos imagenes coinciden. Un
    fundido largo sobre un mapa que ya se movio es lo que se ve como un corte
    disimulado.
  */
  const relevo = capa.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: 180,
    easing: 'linear',
    fill: 'forwards',
  })
  relevo.addEventListener('finish', () => capa.remove(), { once: true })

  // El territorio se mueve a la vez que la ventana, con la misma duracion.
  map.flyTo(centroFinal, zoomFinal, {
    duration: DURACION_MS / 1000,
    easeLinearity: 0.2,
  })

  const animacion = animaciones[0]
  let aterrizado = false

  const aterrizar = () => {
    // `cancel()` vuelve a disparar el evento: sin esta guarda, aterrizar se
    // llamaria dos veces y la segunda encontraria un mapa ya recolocado.
    if (aterrizado) return
    aterrizado = true

    /*
      Cancelar la animacion ANTES de devolver el estilo.

      Va con `fill: 'forwards'`, que es lo que evita el parpadeo del ultimo
      cuadro — sin el, la caja salta a su estado sin animar justo antes de que
      el estilo se restaure—. Pero un relleno hacia delante sigue mandando sobre
      el estilo calculado aunque se borre el atributo `style`: el mapa se
      quedaba con el `transform` y el `clip-path` del vuelo pegados, aterrizando
      trescientos pixeles fuera de su panel y recortado en diagonal.
    */
    animacion.cancel()
    nodo.setAttribute('style', estiloPrevio)
    capa.remove()

    map.invalidateSize({ animate: false, pan: false })
    // Se clava el encuadre: el `flyTo` volo con la caja de la union, y al
    // volver a la caja de verdad el centro puede quedar a unos pixeles.
    map.setView(centroFinal, zoomFinal, { animate: false })
  }

  animacion.addEventListener('finish', aterrizar)
  animacion.addEventListener('cancel', aterrizar)
}

/** Apaga la cobertura donde esta: el vuelo no tenia a donde ir. */
function desvanecerCobertura(): void {
  const actual = origen
  if (!actual) return
  window.clearTimeout(actual.temporizador)
  origen = null

  const salida = actual.capa.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: 240,
    easing: 'ease-out',
    fill: 'forwards',
  })
  const limpiar = () => actual.capa.remove()
  salida.addEventListener('finish', limpiar, { once: true })
  salida.addEventListener('cancel', limpiar, { once: true })
}

/** Retira la cobertura sin animar. */
export function cancelarVueloMapa(): void {
  if (!origen) return
  window.clearTimeout(origen.temporizador)
  origen.capa.remove()
  origen = null
}

/** Si ahora mismo hay un vuelo esperando destino. */
export function vueloPendiente(): boolean {
  return origen !== null
}

/** Cuando arranco el ultimo vuelo, para coreografiar lo que llega con el. */
let ultimoVuelo = 0

/**
 * Si esta pantalla se esta abriendo a raiz de un vuelo del mapa.
 *
 * Sirve para que la lista de resultados no aparezca de golpe mientras el mapa
 * viaja. Sin esto, lo que se ve es: pagina en blanco con un mapa flotando
 * encima, y de pronto doce tarjetas. Con esto, las tarjetas suben a su sitio
 * mientras el mapa entra en el suyo, y las dos cosas se leen como una sola
 * llegada.
 *
 * La ventana es generosa porque entre el clic y el primer pintado de los
 * resultados hay una peticion de por medio.
 */
export function entradaCoreografiada(): boolean {
  return Date.now() - ultimoVuelo < 2500
}
