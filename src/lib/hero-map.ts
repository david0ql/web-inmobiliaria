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
    /*
      Encima del mapa que vuela (31) y por debajo de la cabecera pegajosa y del
      boton del chat, que son z-40.

      Estaba en 30, o sea DEBAJO del mapa vivo, y era un error de bulto: en
      cuanto la ventana del vuelo se apartaba de su posicion de partida, la copia
      asomaba por detras como un segundo mapa quieto, con otro encuadre. Dos
      mapas a la vez es justo lo contrario de lo que esta transicion existe para
      contar.
    */
    'z-index:32',
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
 * Un muelle, muestreado a cuadros.
 *
 * Se abandonó la bezier. `cubic-bezier(.32,.72,0,1)` gasta el ochenta por
 * ciento del recorrido en los primeros cien milisegundos y despues deriva: se
 * siente como un tiron seguido de una espera, no como un objeto con peso. Un
 * muelle amortiguado reparte el movimiento como lo hace algo material —arranca
 * rapido, llega y se asienta con un rebote minimo— y es lo que distingue una
 * transicion de sistema operativo de una animacion de pagina web.
 *
 * Oscilador armonico amortiguado integrado por Euler semi-implicito, que para
 * estos valores es de sobra estable. No hace falta una libreria: son quince
 * lineas y asi la curva es exactamente la misma para la caja, para el recorte y
 * para el scroll, que es lo unico que importa aqui.
 */
function muelle({
  rigidez = 190,
  amortiguacion = 26,
  masa = 1,
  paso = 1 / 60,
} = {}): number[] {
  const valores: number[] = []
  let x = 0
  let v = 0
  for (let i = 0; i < 180; i++) {
    const fuerza = -rigidez * (x - 1) - amortiguacion * v
    v += (fuerza / masa) * paso
    x += v * paso
    valores.push(x)
    // Quieto y en su sitio: no hace falta seguir muestreando.
    if (i > 8 && Math.abs(1 - x) < 0.0008 && Math.abs(v) < 0.0008) break
  }
  valores.push(1)
  return valores
}

/** Cuando aterrizo el ultimo vuelo. */
let reciénAterrizado = 0

/**
 * Si el mapa acaba de aterrizar y por tanto ya esta encuadrado.
 *
 * El seguimiento de la lista reencuadra el mapa sobre las tarjetas que se ven.
 * Ese encuadre es el remate del movimiento y tiene que llegar DESPUES, con la
 * caja ya parada: solapado con el vuelo eran dos animaciones discutiendo por el
 * mismo mapa. El margen es corto a proposito —lo justo para que la caja se
 * asiente—, porque encuadrar sobre los resultados es util y no debe hacerse
 * esperar.
 */
export function encuadreRecién(): boolean {
  return Date.now() - reciénAterrizado < 220
}

/**
 * Resuelve cuando la capa de teselas termina de pintar, o cuando se acaba la
 * paciencia.
 *
 * ESTE ERA EL BUG DE "SE QUEDA MEDIO GRIS Y LUEGO SE LLENA".
 *
 * Escuchaba `map.on('load')`, que en Leaflet NO es "las teselas estan listas":
 * es "el mapa se inicializo con centro y zoom", y salta una sola vez al crearlo.
 * Con el mapa ya montado no volvia a saltar nunca, asi que la espera se resolvia
 * por el tope de tiempo o por una comprobacion que miraba antes de que Leaflet
 * hubiera pedido nada. Resultado: se descubria el mapa a medio pintar. La
 * primera vez colaba —las teselas venian del cache de la portada— y a partir de
 * la segunda, con otro encuadre pedido, se veia el relleno en directo.
 *
 * El evento bueno es `load` de la CAPA (`GridLayer`), que salta cuando no queda
 * ninguna tesela pendiente. Y se comprueba despues de dos cuadros, que es
 * cuando Leaflet ya ha tenido ocasion de pedirlas: preguntar antes es preguntar
 * por un trabajo que todavia no ha empezado.
 */
function esperarTeselas(map: L.Map, topeMs: number): Promise<void> {
  return new Promise((listo) => {
    /*
      Hay dos clases de fondo posibles y cada una avisa a su manera.

      La vectorial (MapLibre) dibuja sobre un lienzo y no tiene teselas que
      contar: su señal es `idle`, que significa "ya no queda nada por cargar ni
      por dibujar". La de imagenes (Leaflet) se reconoce por `_tiles` y avisa con
      el `load` de su rejilla. El tipado publico no ofrece forma de distinguir
      ninguna de las dos sin importar sus clases.
    */
    let rejilla: unknown = null
    let vectorial: { once: (e: string, f: () => void) => void; loaded?: () => boolean } | null =
      null
    map.eachLayer((l) => {
      if ('_tiles' in l) rejilla = l
      const puente = l as unknown as { getMaplibreMap?: () => unknown }
      if (typeof puente.getMaplibreMap === 'function') {
        vectorial = puente.getMaplibreMap() as typeof vectorial
      }
    })

    if (vectorial) {
      const gl = vectorial as {
        once: (e: string, f: () => void) => void
        loaded?: () => boolean
      }
      let cerrado = false
      const acabar = () => {
        if (cerrado) return
        cerrado = true
        window.clearTimeout(reloj)
        listo()
      }
      const reloj = window.setTimeout(acabar, topeMs)
      /*
        `idle`, y no `load`.

        Esta es LA razon de que se viera "media pantalla gris que luego se
        rellena". `load` significa "el estilo esta cargado y hubo un primer
        dibujado" — de la caja que el mapa tenia ENTONCES, que es la del panel—.
        Pero justo antes de esperar, la caja se ha agrandado al tamaño union:
        de 450 px de alto a 800 y pico. Esa franja nueva no la habia dibujado
        nadie, y `load` ya habia saltado, asi que se descubria el mapa con la
        mitad inferior en blanco. Al avanzar el vuelo, esa mitad entraba en la
        ventana y se rellenaba a la vista.

        `idle` es "no queda nada por cargar ni por dibujar", que es la unica
        garantia de que la franja nueva ya esta. Y se pide SIEMPRE, aunque el
        mapa diga estar cargado: `loaded()` habla del estado anterior al cambio
        de tamaño.

        Mientras se espera no hay nada roto: se ve el mapa de la portada,
        quieto, que es de donde se venia.
      */
      gl.once('idle', acabar)
      return
    }

    if (!rejilla) {
      listo()
      return
    }
    const capaRejilla = rejilla as L.GridLayer

    let cerrado = false
    const acabar = () => {
      if (cerrado) return
      cerrado = true
      capaRejilla.off('load', acabar)
      window.clearTimeout(reloj)
      listo()
    }
    const reloj = window.setTimeout(acabar, topeMs)
    capaRejilla.on('load', acabar)

    // Dos cuadros: el primero deja que Leaflet pida las teselas que faltan, el
    // segundo comprueba si de verdad quedaba alguna pendiente.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const pendiente = (capaRejilla as unknown as { _loading?: boolean })._loading
        if (pendiente !== true) acabar()
      }),
    )
  })
}

/**
 * La ventana recortada, EN COORDENADAS DEL PROPIO ELEMENTO.
 *
 * Este detalle costo un vuelo entero. `clip-path` se resuelve en el espacio
 * local de la caja, y el `transform` se aplica DESPUES: si el recorte se calcula
 * en coordenadas de pantalla mientras ademas se traslada el elemento, los dos
 * desplazamientos se suman y la ventana acaba en un sitio que no es el que se
 * habia pedido. Se veia como un mapa entrando en diagonal desde abajo.
 *
 * Asi que se resta el desplazamiento: `local = pantalla - traslacion`. Y como
 * ventana y traslacion se interpolan con la misma curva, su suma tambien lo
 * hace, o sea que en cada cuadro intermedio la ventana cae exactamente donde
 * debe, no solo al principio y al final.
 */
function ventana(
  r: DOMRect,
  radio: number,
  offset: { x: number; y: number },
  caja: { ancho: number; alto: number },
) {
  const arriba = r.top - offset.y
  const izquierda = r.left - offset.x
  const derecha = caja.ancho - (r.right - offset.x)
  const abajo = caja.alto - (r.bottom - offset.y)
  return `inset(${arriba}px ${derecha}px ${abajo}px ${izquierda}px round ${radio}px)`
}

/**
 * Trae el mapa de destino volando desde donde estaba el de la portada.
 *
 * `nodo` es el contenedor de Leaflet del buscador y `map` su instancia, ya
 * montada. No hace falta decirle a donde encuadrar: llega quieto.
 */
export function terminarVueloMapa(
  nodo: HTMLElement | null,
  map: L.Map | null,
): void {
  const salida = origen
  if (!salida) return
  if (!nodo || !map) {
    cancelarVueloMapa()
    return
  }

  /*
    El hueco al que se aterriza: el panel del buscador.

    Se guarda la referencia ahora porque en cuanto el mapa salga del flujo con
    `position: fixed`, el panel se queda vacio y es EL quien dice donde hay que
    posarse. Su tamaño no depende de donde este la pagina; su posicion si, y por
    eso se mide mas tarde.
  */
  const hueco = nodo.parentElement
  const medida = nodo.getBoundingClientRect()
  if (!hueco || medida.width < 8 || medida.height < 8) {
    desvanecerCobertura()
    return
  }

  window.clearTimeout(salida.temporizador)
  origen = null

  const { rect: desde, capa } = salida
  const estiloPrevio = nodo.getAttribute('style') ?? ''

  /*
    La union de las dos cajas: el tamaño que tiene el contenedor durante todo el
    vuelo. Es la razon de que no haga falta escalar nada — contenga lo que
    contenga la ventana en cada instante, los pixeles ya estan dibujados— y de
    que el tamaño no cambie a mitad de animacion, que es lo que obligaria a
    remedir y a repintar por cuadro.
  */
  const union = {
    ancho: Math.max(desde.width, medida.width),
    alto: Math.max(desde.height, medida.height),
  }
  const centrar = (r: DOMRect) => ({
    x: (r.left + r.right) / 2 - union.ancho / 2,
    y: (r.top + r.bottom) / 2 - union.alto / 2,
  })
  const a = centrar(desde)

  nodo.style.position = 'fixed'
  nodo.style.left = '0'
  nodo.style.top = '0'
  nodo.style.width = `${union.ancho}px`
  nodo.style.height = `${union.alto}px`
  nodo.style.zIndex = '31'
  nodo.style.willChange = 'transform, clip-path'
  nodo.style.transform = `translate3d(${a.x}px, ${a.y}px, 0)`
  nodo.style.clipPath = ventana(desde, 0, a, union)

  // Una sola vez, ANTES de animar: durante el vuelo el tamaño ya no cambia.
  map.invalidateSize({ animate: false, pan: false })
  // Y arranca mirando exactamente a donde miraba la portada. Este es el
  // fotograma en el que la copia y el mapa vivo son la misma imagen.
  map.setView([salida.centro.lat, salida.centro.lng], salida.zoom, {
    animate: false,
  })

  const curvaMuelle = muelle()
  const duracion = curvaMuelle.length * (1000 / 60)

  const arrancar = () => {
    /*
      AQUI se decide a donde se vuela, y no antes.

      Este era el bug de fondo. El destino se medía al principio, y despues se
      esperaba a que el mapa terminara de dibujarse: cientos de milisegundos. En
      ese hueco la pagina se desplazaba por su cuenta, asi que cuando el vuelo
      arrancaba apuntaba a un sitio donde el panel ya no estaba —trescientos
      pixeles mas abajo—. El primer fotograma y el ultimo salian bien, porque al
      aterrizar se devuelve el estilo y manda el layout, pero todo el trayecto
      iba torcido.

      Se mide con la pagina puesta EN SU SITIO FINAL: se salta alli, se mide y se
      vuelve, seguido y sin ceder el hilo. El navegador no pinta entre medias,
      asi que ese ir y venir no se ve. Y hace falta medir de verdad, no calcular:
      el panel es `sticky`, y a un elemento pegajoso no se le puede predecir la
      posicion restando scroll.
    */
    /*
      El destino se mide AQUI, no al principio.

      Antes se medía antes de esperar a que el mapa se dibujara, y en esos
      cientos de milisegundos la pagina se colocaba: el vuelo acababa apuntando
      a un sitio donde el panel ya no estaba. Ahora, cuando esto corre, la pagina
      lleva rato quieta en su posicion definitiva y lo que se mide es lo que hay.
    */
    const r = hueco.getBoundingClientRect()
    const destino = new DOMRect(r.left, r.top, r.width, r.height)

    const fuera =
      destino.width < 8 ||
      destino.height < 8 ||
      destino.right < 0 ||
      destino.left > window.innerWidth ||
      destino.bottom < 0 ||
      destino.top > window.innerHeight
    if (fuera) {
      // Sin sitio donde posarse: se deja todo como estaba, sin numeros de circo.
      nodo.setAttribute('style', estiloPrevio)
      map.invalidateSize({ animate: false, pan: false })
      return
    }

    const b = centrar(destino)

    /*
      Un fotograma por muestra del muelle, con `easing: linear`.

      El navegador interpola entre keyframes; la forma del movimiento la pone la
      lista de muestras. Asi la caja, el recorte y el scroll comparten curva
      EXACTA —son la misma lista— y ninguno puede resbalar respecto de otro.
    */
    const fotogramas = curvaMuelle.map((e) => {
      const paso = {
        x: a.x + (b.x - a.x) * e,
        y: a.y + (b.y - a.y) * e,
      }
      return {
        transform: `translate3d(${paso.x}px, ${paso.y}px, 0)`,
        clipPath: ventana(
          new DOMRect(
            desde.left + (destino.left - desde.left) * e,
            desde.top + (destino.top - desde.top) * e,
            desde.width + (destino.width - desde.width) * e,
            desde.height + (destino.height - desde.height) * e,
          ),
          RADIO_FINAL * e,
          paso,
          union,
        ),
      }
    })

    const animacion = nodo.animate(fotogramas, {
      duration: duracion,
      easing: 'linear',
      fill: 'forwards',
    })

    /*
      EL MAPA NO SE MUEVE MIENTRAS VUELA. Solo cambia su ventana.

      El territorio moviendose mientras la caja se encoge son dos historias a la
      vez, y ninguna se entiende. Quieto, la transicion dice una sola cosa, que
      ademas es verdad: es el MISMO mapa, mirado por una ventana de otra forma.
      Lo que hay debajo no se ha movido un pixel.

      El encuadre sobre los resultados llega despues, con la caja ya parada, y lo
      hace el seguimiento de la lista, que existe de todas formas.
    */
    let aterrizado = false
    const aterrizar = () => {
      // `cancel()` vuelve a disparar el evento: sin esta guarda, aterrizar se
      // llamaria dos veces.
      if (aterrizado) return
      aterrizado = true

      /*
        Cancelar la animacion ANTES de devolver el estilo. Va con
        `fill: 'forwards'`, que evita el parpadeo del ultimo cuadro, pero un
        relleno hacia delante sigue mandando sobre el estilo calculado aunque se
        borre el atributo `style`: el mapa se quedaba con el `transform` y el
        `clip-path` del vuelo pegados, fuera de su panel y recortado en diagonal.
      */
      animacion.cancel()
      nodo.setAttribute('style', estiloPrevio)
      capa.remove()

      const centroActual = map.getCenter()
      map.invalidateSize({ animate: false, pan: false })
      map.setView(centroActual, map.getZoom(), { animate: false })
      reciénAterrizado = Date.now()
    }

    animacion.addEventListener('finish', aterrizar)
    animacion.addEventListener('cancel', aterrizar)
  }

  /*
    Se espera a que el mapa vivo tenga dibujada TODA la caja de la union antes de
    descubrirlo. Mientras tanto la copia lo tapa: lo que se ve es el mapa de la
    portada, quieto en su sitio, exactamente como estaba. Cuando esta listo, la
    copia se retira de golpe —sin fundido— y no se nota, porque debajo hay la
    misma imagen: mismo centro, mismo zoom, misma ventana.
  */
  esperarTeselas(map, 1800).then(() => {
    capa.remove()
    arrancar()
  })
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
