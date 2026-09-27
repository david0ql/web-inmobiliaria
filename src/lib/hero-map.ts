/**
 * El vuelo del mapa: de la portada al panel del buscador.
 *
 * Al buscar desde la portada, el mapa grande de arriba se convierte en el panel
 * de la derecha de `/buscar`. No es un adorno: es lo que dice que el mapa que
 * estabas usando y el que vas a usar son el MISMO mapa, mirado desde otro sitio.
 * Sin esto, la portada se apaga y medio segundo despues aparece un mapa gris que
 * hay que volver a situar desde cero.
 *
 * ¿POR QUE UN CLON Y NO EL MAPA DE VERDAD?
 *
 * Lo ideal seria llevarse la instancia de Leaflet viva de una pantalla a otra, y
 * es lo primero que se intento. No se puede sin sacar el mapa del arbol de React
 * y ponerlo en una capa fija por encima del router: a partir de ahi hay que
 * reimplementar a mano donde cae el mapa en cada pantalla —la portada lo lleva en
 * el flujo, el buscador lo tiene `sticky`— y seguir su caja en cada scroll y cada
 * cambio de tamaño. Mucha maquinaria, y dos pantallas que hoy funcionan puestas a
 * depender de ella.
 *
 * Para un vuelo de 700 ms no hace falta un mapa vivo: hace falta que se VEA el
 * mapa. Asi que se clona el nodo. Las teselas del clon son las mismas imagenes ya
 * descargadas —salen del cache del navegador, sin una peticion ni un cuadro
 * gris—, y como el clon no es interactivo no importa que Leaflet no sepa nada de
 * el. Debajo, mientras vuela, se monta el mapa de verdad del buscador.
 *
 * ¿POR QUE NO LA API DE VIEW TRANSITIONS?
 *
 * Porque el destino no es un elemento que exista todavia cuando arranca la
 * navegacion: el panel del mapa del buscador nace suspendido, detras de los
 * resultados. Una transicion de vista congela el antes y el despues en el mismo
 * cuadro, y aqui el "despues" aparece 300 ms mas tarde. Se hace a mano, que
 * ademas deja elegir la curva y el desenfoque.
 *
 * Todo lo que sigue es opcional por diseño: si el clon no se pudo hacer, si el
 * destino no llega, o si el sistema pide menos movimiento, no pasa nada y la
 * navegacion es la de siempre.
 */

/** Cuanto dura el vuelo. Mas de esto se siente lento; menos, brusco. */
const DURACION_MS = 720

/** Si el destino no aparece en este tiempo, el clon se retira solo. */
const PACIENCIA_MS = 2000

/** El atributo con el que las dos pantallas marcan su mapa. */
export const HERO_MAP_ATTR = 'data-hero-map'

interface Vuelo {
  capa: HTMLElement
  clon: HTMLElement
  desde: DOMRect
  temporizador: number
}

let vuelo: Vuelo | null = null

function menosMovimiento(): boolean {
  return (
    typeof window === 'undefined' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function mapaEnPantalla(): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[${HERO_MAP_ATTR}]`)
}

/**
 * Congela el mapa que hay en pantalla y lo deja flotando donde estaba.
 *
 * Se llama justo ANTES de navegar: en ese instante el mapa de la portada todavia
 * existe y se puede medir. Devuelve `false` si no habia nada que congelar, para
 * que quien llama no se quede esperando un vuelo que no va a pasar.
 */
export function empezarVueloMapa(): boolean {
  if (typeof document === 'undefined' || menosMovimiento()) return false

  const origen = mapaEnPantalla()
  if (!origen) return false

  const desde = origen.getBoundingClientRect()
  // Un mapa que ya esta fuera de la pantalla no tiene nada que contar: volar
  // desde arriba del documento se ve como un elemento que entra de la nada.
  if (desde.bottom < 40 || desde.top > window.innerHeight - 40) return false

  cancelarVueloMapa()

  const clon = origen.cloneNode(true) as HTMLElement
  clon.removeAttribute(HERO_MAP_ATTR)
  clon.setAttribute('aria-hidden', 'true')
  // El clon no participa de nada: ni foco, ni raton, ni lectores de pantalla.
  clon.style.pointerEvents = 'none'
  clon.style.margin = '0'
  clon.style.width = `${desde.width}px`
  clon.style.height = `${desde.height}px`

  const capa = document.createElement('div')
  capa.setAttribute('aria-hidden', 'true')
  capa.style.cssText = [
    'position:fixed',
    'z-index:60',
    'pointer-events:none',
    'overflow:hidden',
    'will-change:transform,opacity,border-radius',
    'contain:paint',
    `left:${desde.left}px`,
    `top:${desde.top}px`,
    `width:${desde.width}px`,
    `height:${desde.height}px`,
    'transform-origin:top left',
    'box-shadow:0 24px 60px -24px rgb(0 0 0 / .45)',
  ].join(';')
  capa.appendChild(clon)
  document.body.appendChild(capa)

  vuelo = {
    capa,
    clon,
    desde,
    temporizador: window.setTimeout(cancelarVueloMapa, PACIENCIA_MS),
  }
  return true
}

/**
 * Lleva el clon hasta el mapa de la pantalla nueva y lo retira.
 *
 * Se llama cuando el mapa de destino ya tiene su caja definitiva. La caja es lo
 * unico que hace falta: el clon se mueve y se escala hasta encajar en ella, y al
 * llegar se desvanece dejando debajo el mapa de verdad, que para entonces ya
 * pinto sus teselas.
 *
 * Se anima `transform` y no `width`/`height` a proposito: escalar lo hace la GPU
 * sin volver a maquetar nada, y eso es la diferencia entre 60 cuadros por segundo
 * y un salto a mitad de camino.
 */
export function terminarVueloMapa(destino: HTMLElement | null): void {
  const actual = vuelo
  if (!actual) return
  if (!destino) {
    cancelarVueloMapa()
    return
  }

  const hasta = destino.getBoundingClientRect()
  if (hasta.width < 8 || hasta.height < 8) {
    desvanecerVuelo()
    return
  }

  /*
    Un destino fuera de la pantalla no es un destino.

    En movil el panel del mapa del buscador se aparca en `left:-200vw` mientras
    se mira la lista: volar hasta ahi seria mandar el clon a un sitio que nadie
    ve, y lo que se veria es el mapa saliendo disparado hacia la izquierda. En
    ese caso el clon se queda donde esta y se apaga, que es lo que hace cualquier
    transicion cuando no tiene a donde ir.
  */
  const fuera =
    hasta.right < 0 ||
    hasta.left > window.innerWidth ||
    hasta.bottom < 0 ||
    hasta.top > window.innerHeight
  if (fuera) {
    desvanecerVuelo()
    return
  }

  window.clearTimeout(actual.temporizador)
  vuelo = null

  const { capa, clon, desde } = actual
  const escalaX = hasta.width / desde.width
  const escalaY = hasta.height / desde.height

  /*
    El clon se contra-escala.

    La capa se estira hasta la caja destino, y sin esto las teselas se estirarian
    con ella: un mapa achatado a mitad de vuelo. Contra-escalando el contenido,
    las teselas conservan su proporcion y lo que cambia es cuanto mapa se ve por
    la ventana — que es exactamente lo que hace un mapa al cambiar de tamaño.
  */
  const animacionClon = clon.animate(
    [
      { transform: 'scale(1, 1)' },
      { transform: `scale(${1 / escalaX}, ${1 / escalaY})` },
    ],
    {
      duration: DURACION_MS,
      easing: 'cubic-bezier(.22,.61,.36,1)',
      fill: 'forwards',
    },
  )
  clon.style.transformOrigin = 'top left'

  const animacionCapa = capa.animate(
    [
      {
        transform: 'translate3d(0,0,0) scale(1,1)',
        borderRadius: '0px',
        opacity: 1,
        filter: 'blur(0px)',
      },
      {
        // A mitad de camino se levanta un poco y se desenfoca lo justo: es lo
        // que hace que se lea como un objeto que viaja y no como una caja que
        // cambia de tamaño.
        offset: 0.55,
        filter: 'blur(1.5px)',
        opacity: 1,
      },
      {
        transform: `translate3d(${hasta.left - desde.left}px, ${hasta.top - desde.top}px, 0) scale(${escalaX}, ${escalaY})`,
        borderRadius: `${16 / Math.max(escalaX, escalaY)}px`,
        opacity: 0,
        filter: 'blur(0px)',
      },
    ],
    {
      duration: DURACION_MS,
      easing: 'cubic-bezier(.22,.61,.36,1)',
      fill: 'forwards',
    },
  )

  const limpiar = () => {
    animacionClon.cancel()
    animacionCapa.cancel()
    capa.remove()
  }
  animacionCapa.addEventListener('finish', limpiar, { once: true })
  animacionCapa.addEventListener('cancel', limpiar, { once: true })
}

/**
 * Apaga el clon donde esta, sin moverlo.
 *
 * Para cuando el destino existe pero no sirve —esta fuera de pantalla, o mide
 * cero—. Quitarlo de golpe deja un parpadeo; apagarlo se lee como el final de
 * algo.
 */
function desvanecerVuelo(): void {
  const actual = vuelo
  if (!actual) return
  window.clearTimeout(actual.temporizador)
  vuelo = null

  const salida = actual.capa.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: 260,
    easing: 'ease-out',
    fill: 'forwards',
  })
  const limpiar = () => actual.capa.remove()
  salida.addEventListener('finish', limpiar, { once: true })
  salida.addEventListener('cancel', limpiar, { once: true })
}

/** Retira el clon sin animar: el vuelo no llego a ninguna parte. */
export function cancelarVueloMapa(): void {
  if (!vuelo) return
  window.clearTimeout(vuelo.temporizador)
  vuelo.capa.remove()
  vuelo = null
}

/** Si ahora mismo hay un clon flotando esperando destino. */
export function vueloPendiente(): boolean {
  return vuelo !== null
}
