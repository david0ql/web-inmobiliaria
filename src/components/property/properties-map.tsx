import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { PropertyCard } from '@/components/property/property-card'
import {
  HERO_MAP_ATTR,
  encuadreRecién,
  registrarMapaVivo,
  terminarVueloMapa,
  vueloPendiente,
} from '@/lib/hero-map'
import {
  capaBase,
  cercoAproximado,
  chincheta,
  controlZoom,
} from '@/lib/mapa-skin'
import { useCatalogo } from '@/lib/catalog-i18n'
import { useIdioma, useT } from '@/lib/i18n'
import { MAP_CENTER, MAP_ZOOM } from '@/lib/site'
import type { Property } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * El mapa que hace de portada. En el sitio actual es lo primero que se ve
 * —450px de alto, agrupando los inmuebles por zona— y aqui se conserva igual.
 *
 * Va con Leaflet a pelo en lugar de react-leaflet: el unico estado que hay son
 * los marcadores, el cluster es un plugin imperativo, y envolverlo en
 * componentes solo añadiria capas sin quitar trabajo.
 *
 * Se respeta `mapPublication`: los inmuebles marcados como HIDDEN no salen, y
 * los APPROXIMATE se dibujan como circulo de 400m en vez de como chincheta,
 * porque su coordenada no es la puerta de la casa.
 *
 * LA VENTANITA VA EN REACT, POR PORTAL. El popup de Leaflet acepta un elemento
 * del DOM como contenido, asi que hay UN solo `div` —creado una vez, fuera del
 * arbol— que se le entrega a un unico `L.popup` compartido por todas las
 * chinchetas, y dentro de el se pinta la ficha con `createPortal`. Se eligio
 * esto y no `createRoot` por chincheta ni plantillas de texto:
 *
 *  - Con `createRoot` habria un arbol de React por popup, desconectado del de
 *    la pagina: sin contexto de idioma, de moneda ni de router —los hooks del
 *    sitio no funcionarian— y con un `unmount()` que hay que acordarse de
 *    llamar en 'popupclose' y al morir el mapa. El portal no tiene ese
 *    problema: el contenido cuelga del arbol de siempre y desaparece solo
 *    cuando el estado vuelve a `null`.
 *  - Con HTML de texto habria que escribir el carrusel a mano —listeners que
 *    poner y quitar, escapado en cada campo— para repetir lo que la tarjeta
 *    del listado ya hace en JSX.
 *
 * Un unico popup y no uno por inmueble porque solo puede haber uno abierto: el
 * `L.popup` se reposiciona y el estado dice que ficha toca pintar dentro.
 */
export function PropertiesMap({
  properties,
  punto,
  radioKm = 5,
  cerca = true,
  className,
  visibles,
  destacado,
}: {
  properties: Property[]
  /** Donde esta quien mira, si lo concedio. */
  punto?: { lat: number; lng: number } | null
  radioKm?: number
  /** Con la geocerca puesta o con el mapa entero. */
  cerca?: boolean
  /** Permite que el buscador use el mapa a la altura completa del viewport. */
  className?: string
  /**
   * Los inmuebles que ahora mismo caben en la pantalla de quien mira la lista.
   *
   * El mapa dibujaba las doce chinchetas de la pagina mientras el ojo estaba en
   * cuatro tarjetas: para saber donde queda lo que se esta leyendo habia que
   * comparar precios entre la lista y el globo. Con esto, lista y mapa miran lo
   * mismo — el resto de la pagina sigue dibujado, apagado, para no perder de
   * vista que hay mas un poco mas alla.
   *
   * `undefined` apaga la sincronia: es lo que usa la portada.
   */
  visibles?: string[]
  /** El inmueble sobre el que esta el raton en la lista. */
  destacado?: string | null
}) {
  const t = useT()
  const { idioma } = useIdioma()
  const { titulo } = useCatalogo()
  const container = useRef<HTMLDivElement>(null)
  const mapa = useRef<L.Map | null>(null)
  const cerca_ = useRef<L.LayerGroup | null>(null)
  const encuadre = useRef<L.LatLngBounds | null>(null)
  const globo = useRef<L.Popup | null>(null)
  const capas = useRef<Map<string, { capa: L.Marker | L.Circle; posicion: L.LatLngExpression }>>(
    new Map(),
  )
  const grupo = useRef<L.MarkerClusterGroup | null>(null)
  /* Si el encuadre inicial ya se hizo. Solo se encuadra la primera vez que
     llegan inmuebles: despues, reencuadrar en cada pagina le quitaria a quien
     mira el sitio donde estaba. */
  const encuadrado = useRef(false)
  /* El encuadre al que se vuelve cuando el raton sale de una tarjeta: el de lo
     visible en la lista, no el del inventario entero. */
  const encuadreVisible = useRef<L.LatLngBounds | null>(null)

  /** El inmueble cuya ficha esta abierta; `null` con el popup cerrado. */
  const [ficha, setFicha] = useState<Property | null>(null)
  /* El mismo dato, por referencia: el efecto que sincroniza marcadores lo
     consulta sin querer volver a correr cada vez que se abre una ficha. */
  const fichaId = useRef<string | null>(null)
  fichaId.current = ficha?.id ?? null

  /* El hueco del portal: vive lo que viva el componente y no se vuelve a crear
     en cada render, porque su identidad es lo que Leaflet guarda como
     contenido del popup. */
  const [hueco] = useState<HTMLDivElement | null>(() =>
    typeof document === 'undefined' ? null : document.createElement('div'),
  )

  /*
    El nombre accesible de cada chincheta se traduce, y `titulo()` es una
    funcion nueva en cada render: si estuviera en las dependencias del efecto,
    el mapa se reharia entero a cada repintado. Se lee por referencia.
  */
  const textos = useRef({ titulo })
  textos.current = { titulo }

  useEffect(() => {
    if (!container.current || !hueco) return

    const map = L.map(container.current, {
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
      /*
        La rueda queda apagada de entrada y se enciende al pulsar el mapa: si
        estuviera siempre viva, bajar la portada con la rueda se convertiria en
        alejar el mapa a mitad de gesto. Al sacar el raton se vuelve a apagar,
        asi que el mapa nunca se queda robando el desplazamiento de la pagina.
      */
      scrollWheelZoom: false,
      /*
        El maximo, explicito. Lo ponia la capa de imagenes; la vectorial no, y
        sin el `map.getMaxZoom()` devuelve infinito. El plugin de agrupacion lo
        usa para repartir los grupos y revienta con "Map has no maxZoom
        specified" antes de dibujar nada.
      */
      maxZoom: 19,
      // El de serie sale arriba a la izquierda; se pone el del sitio abajo a
      // la derecha, junto con el resto de la piel.
      zoomControl: false,
    })
    mapa.current = map
    // Para que el vuelo pueda preguntar a donde mira antes de navegar.
    registrarMapaVivo(map)

    map.on('click', () => map.scrollWheelZoom.enable())
    map.on('mouseout', () => map.scrollWheelZoom.disable())

    capaBase().addTo(map)
    controlZoom().addTo(map)

    /*
      El popup compartido. `maxWidth` = `minWidth` = el ancho de la ficha: asi
      Leaflet no la estrecha ni la estira, y sobre todo no tapa el mapa —en un
      movil de 360px sigue dejando ver a los lados—. El alto lo pone el
      contenido, que es foto contenida + cuatro lineas.
    */
    const popup = L.popup({
      maxWidth: 300,
      minWidth: 300,
      autoPanPadding: [24, 24],
      // La ficha ya lleva su propio cierre visual; el aspa de Leaflet se queda
      // porque en movil es lo unico que se busca para cerrarla.
      closeButton: true,
    }).setContent(hueco)
    globo.current = popup

    /*
      Leaflet enmarca el contenido con margenes y bordes redondeados pensados
      para un parrafo de texto. Se quitan al vuelo en vez de en la hoja de
      estilos porque son estilos de esta ventanita y no del sitio: la foto
      tiene que llegar al borde y la esquina redondeada tiene que recortarla.
    */
    map.on('popupopen', (evento) => {
      const raiz = evento.popup.getElement()
      const marco = raiz?.querySelector<HTMLElement>(
        '.leaflet-popup-content-wrapper',
      )
      const dentro = raiz?.querySelector<HTMLElement>('.leaflet-popup-content')
      if (marco) {
        marco.style.padding = '0'
        marco.style.overflow = 'hidden'
      }
      if (dentro) {
        dentro.style.margin = '0'
        dentro.style.width = 'auto'
        dentro.style.lineHeight = 'inherit'
      }
    })

    // Al cerrarse, la ficha se va del arbol de React: sin contenido montado no
    // hay nada que se quede escuchando ni ocupando memoria.
    map.on('popupclose', () => setFicha(null))

    const cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 50,
    })
    map.addLayer(cluster)
    grupo.current = cluster

    return () => {
      map.remove()
      registrarMapaVivo(null)
      mapa.current = null
      globo.current = null
      capas.current = new Map()
      grupo.current = null
      encuadrado.current = false
      // El popup se fue con el mapa: si el estado siguiera apuntando a un
      // inmueble, la ficha quedaria pintada en un hueco que ya no cuelga de
      // ninguna parte.
      setFicha(null)
    }
    /*
      El mapa se crea UNA vez.

      Antes estaban aqui tambien `properties` e `idioma`, con lo que el mapa se
      destruia y se volvia a construir entero cada vez que cambiaba la lista: en
      el buscador, eso es en cada filtro, en cada orden y en cada pagina. Se
      perdian el encuadre y el zoom que habia elegido quien miraba, y las
      teselas se volvian a pedir todas —un parpadeo gris de medio segundo sobre
      un mapa que ya estaba pintado—. Los marcadores se sincronizan aparte, en
      el efecto de abajo, que es lo unico que de verdad cambia.
    */
  }, [hueco])

  /*
    Los marcadores, sincronizados: se vacia el grupo y se vuelve a llenar.

    `clearLayers` + `addLayers` en bloque, y no capa a capa: el plugin de
    agrupacion recalcula los grupos una sola vez al final en lugar de una por
    chincheta, que con seiscientos inmuebles es la diferencia entre un repintado
    y un tiron.

    `idioma` esta en las dependencias porque el nombre accesible de cada
    chincheta se traduce y solo se escribe al crearla.
  */
  useEffect(() => {
    const map = mapa.current
    const cluster = grupo.current
    const popup = globo.current
    if (!map || !cluster || !popup) return

    cluster.clearLayers()
    const porInmueble = new Map<
      string,
      { capa: L.Marker | L.Circle; posicion: L.LatLngExpression }
    >()
    const nuevas: L.Layer[] = []
    const bounds: L.LatLngExpression[] = []

    for (const property of properties) {
      if (property.mapPublication === 'HIDDEN') continue
      if (property.latitude === null || property.longitude === null) continue

      const position: L.LatLngExpression = [property.latitude, property.longitude]
      bounds.push(position)

      /*
        Se abre a mano en lugar de con `bindPopup`: el popup es uno solo y hay
        que decirle antes que ficha pintar. `openOn` cierra el anterior —lo que
        dispara 'popupclose' y pone el estado a `null`—, por eso el `setFicha`
        va despues; React junta las dos en un solo repintado.
      */
      const abrir = () => {
        popup.setLatLng(position).openOn(map)
        setFicha(property)
      }

      if (property.mapPublication === 'APPROXIMATE') {
        const circulo = cercoAproximado(position).on('click', abrir)
        nuevas.push(circulo)
        porInmueble.set(property.id, { capa: circulo, posicion: position })
      } else {
        // El `title` es lo que da nombre al marcador: Leaflet le pone
        // role="button" y sin texto queda mudo para un lector de pantalla.
        const aguja = L.marker(position, {
          icon: chincheta(),
          title: textos.current.titulo(property),
        }).on('click', abrir)
        nuevas.push(aguja)
        porInmueble.set(property.id, { capa: aguja, posicion: position })
      }
    }

    cluster.addLayers(nuevas)
    capas.current = porInmueble

    const frame = coreBounds(bounds)
    encuadre.current = frame
    // Solo el primer encuadre. Despues manda quien mira: reencuadrar al cambiar
    // de pagina le arrancaria el mapa de donde lo habia dejado.
    if (frame && !encuadrado.current) {
      encuadrado.current = true
      // Con un vuelo en camino, el encuadre lo pone el aterrizaje: hacerlo aqui
      // seria colocar el mapa en su sitio y despues traerlo volando al mismo
      // sitio, o sea enseñar el final antes de empezar.
      if (!vueloPendiente()) {
        map.fitBounds(frame, { padding: [40, 40], maxZoom: 14 })
      }
    }

    // La ficha abierta puede ser de un inmueble que ya no esta en la lista.
    if (!properties.some((p) => p.id === fichaId.current)) map.closePopup()
  }, [properties, idioma])

  /*
    El aterrizaje del vuelo.

    Se hace despues de montar el mapa y en dos cuadros: el primero deja que el
    navegador coloque el panel —en el buscador es `sticky` dentro de una rejilla,
    y medido antes da la caja equivocada—, y el segundo mide ya sobre el layout
    definitivo. Si no venia ningun vuelo, no hace nada.
  */
  useEffect(() => {
    const nodo = container.current
    if (!nodo) return
    let cancelado = false
    /*
      Tres cuadros: montar el mapa, colocar el panel y dejar que el encuadre de
      la pagina termine. Midiendo antes, el vuelo aterrizaba desplazado.

      El vuelo no necesita saber a donde encuadrar: el mapa llega quieto, con el
      encuadre que traia de la portada, y el seguimiento de la lista lo ajusta
      sobre los resultados un instante despues, ya en reposo.
    */
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (!cancelado) {
            terminarVueloMapa(nodo, mapa.current)
          }
        }),
      ),
    )
    return () => {
      cancelado = true
      cancelAnimationFrame(id)
    }
  }, [])

  /*
    Leaflet mide el popup al abrirlo, y en ese instante el hueco todavia esta
    vacio: el contenido lo pinta React un tick despues. `update()` vuelve a
    medir y a decidir el desplazamiento del mapa, que es lo que evita que la
    ficha nazca medio fuera de la pantalla.
  */
  useEffect(() => {
    if (!ficha) return
    const map = mapa.current
    const popup = globo.current
    popup?.update()

    /*
      Y despues de medir, hacer sitio.

      `update()` recoloca la ventanita, pero no mueve el mapa: con la chincheta
      pegada al borde izquierdo del panel, media tarjeta quedaba fuera y el panel
      —que recorta lo que se sale— la cortaba por la mitad. Se ve en cuanto el
      mapa es una columna estrecha al lado de la lista, que es justo como se usa
      en el buscador.

      `panInside` mueve lo justo para que quepa, y nada si ya cabia. El cuadro de
      espera es porque React acaba de pintar la tarjeta dentro del hueco: antes
      de eso, el alto que se mide es cero.
    */
    if (!map || !popup) return
    const id = requestAnimationFrame(() => {
      const donde = popup.getLatLng()
      if (!donde) return
      const marco = popup.getElement()
      const alto = marco?.offsetHeight ?? 0
      const ancho = marco?.offsetWidth ?? 0
      map.panInside(donde, {
        // El alto entero por arriba: la ventanita nace sobre la chincheta.
        paddingTopLeft: [ancho / 2 + 16, alto + 16],
        paddingBottomRight: [ancho / 2 + 16, 16],
        animate: true,
        duration: 0.35,
      })
    })
    return () => cancelAnimationFrame(id)
  }, [ficha])

  /*
    Lista y mapa mirando lo mismo.

    Las chinchetas de lo que no cabe en pantalla no se quitan: se apagan. Es la
    diferencia entre "ahi no hay nada" y "eso no es lo que estas leyendo ahora",
    y quitarlas del todo hacia que el mapa pareciera vaciarse al bajar la lista.

    El encuadre se hace con `flyToBounds` y una duracion corta: bajar la lista
    mueve el mapa acompañando el gesto, no como un salto que obliga a volver a
    situarse. Con una sola tarjeta visible no hay caja que encuadrar, asi que se
    usa un cuadro de 700 m alrededor.
  */
  useEffect(() => {
    const map = mapa.current
    if (!map || !visibles) return

    const activos = new Set(visibles)
    const puntos: L.LatLngExpression[] = []

    for (const [id, { capa, posicion }] of capas.current) {
      const encendida = activos.size === 0 || activos.has(id)
      if (encendida) puntos.push(posicion)
      if (capa instanceof L.Marker) {
        const elemento = capa.getElement()
        if (elemento) {
          elemento.style.transition = 'opacity .35s ease, filter .35s ease'
          elemento.style.opacity = encendida ? '1' : '0.28'
          elemento.style.filter = encendida ? 'none' : 'grayscale(1)'
        }
      } else {
        capa.setStyle({
          opacity: encendida ? 1 : 0.25,
          fillOpacity: encendida ? 0.12 : 0.04,
        })
      }
    }

    if (!puntos.length) return
    const marco =
      puntos.length === 1
        ? L.latLng(puntos[0] as [number, number]).toBounds(700)
        : L.latLngBounds(puntos)
    encuadreVisible.current = marco
    // Con el raton sobre una tarjeta manda el hover: reencuadrar aqui le
    // quitaria el mapa de debajo a mitad de gesto.
    if (destacado) return
    /*
      Y tampoco nada mas aterrizar.

      El vuelo deja el mapa ya encuadrado sobre estos mismos inmuebles. Sin esta
      guarda, el observador de tarjetas visibles se disparaba una decima despues
      y arrancaba OTRO viaje de setecientos milisegundos hacia practicamente el
      mismo sitio: el mapa llegaba y se volvia a mover solo, que es lo que hacia
      que la llegada no se sintiera como una llegada.
    */
    if (encuadreRecién()) return
    map.flyToBounds(marco, {
      padding: [56, 56],
      maxZoom: 16,
      duration: 0.7,
      easeLinearity: 0.25,
    })
    // `destacado` se lee pero no dispara: el vuelo del hover tiene su propio
    // efecto, y reaccionar aqui volveria a encuadrar al soltar el raton.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibles, properties])

  /*
    El acercamiento al pasar el raton por una tarjeta.

    Es lo que convierte la lista y el mapa en una sola pantalla: se apunta a una
    tarjeta y el mapa va a ese inmueble, con la chincheta crecida. Al salir, se
    vuelve al encuadre de lo visible —no al del inventario—, que es de donde se
    venia.

    Quien pidio no ver animaciones no las ve: el mapa se coloca de golpe.
  */
  useEffect(() => {
    const map = mapa.current
    if (!map || !visibles) return

    const sinMovimiento = quieto()

    for (const [id, { capa }] of capas.current) {
      if (!(capa instanceof L.Marker)) continue
      const elemento = capa.getElement()
      if (!elemento) continue
      /*
        La gota crece desde su punta, no desde su centro.

        `transform-origin` va al 50% 100% —lo pone la propia chincheta— porque
        la punta es la que señala la coordenada: escalando desde el centro, el
        inmueble se movia medio bloque al pasar el raton por su tarjeta.
      */
      const gota = elemento.firstElementChild as HTMLElement | null
      if (!gota) continue
      const cuerpo = gota.querySelector('path')
      if (id === destacado) {
        gota.style.transform = 'scale(1.45)'
        cuerpo?.setAttribute('fill', '#c8102e')
        elemento.style.zIndex = '1000'
      } else {
        gota.style.transform = 'scale(1)'
        cuerpo?.setAttribute('fill', '#0d0d0d')
        elemento.style.zIndex = ''
      }
    }

    const objetivo = destacado ? capas.current.get(destacado) : null
    if (objetivo) {
      const centro = L.latLng(objetivo.posicion as [number, number])
      const zoom = Math.max(map.getZoom(), 16)
      if (sinMovimiento) map.setView(centro, zoom)
      else map.flyTo(centro, zoom, { duration: 0.6, easeLinearity: 0.25 })
      return
    }

    const volver = encuadreVisible.current
    if (!volver) return
    if (sinMovimiento) map.fitBounds(volver, { padding: [56, 56], maxZoom: 16 })
    else
      map.flyToBounds(volver, {
        padding: [56, 56],
        maxZoom: 16,
        duration: 0.6,
        easeLinearity: 0.25,
      })
  }, [destacado, visibles])

  /*
    El vuelo hasta quien mira, con su geocerca.

    Va en su propio efecto y no en el de arriba porque la ubicacion llega
    despues —el permiso tarda lo que tarde la persona— y rehacer el mapa entero
    en ese momento seria tirar las chinchetas y volver a pintarlas.

    `flyToBounds` sobre el circulo y no `setView` con un zoom calculado: asi el
    encuadre sale del propio radio, se ve entero con su margen, y en cualquier
    pantalla —un movil estrecho no cabe el mismo zoom que un escritorio.
  */
  useEffect(() => {
    const map = mapa.current
    if (!map) return

    cerca_.current?.remove()
    cerca_.current = null

    if (!punto || !cerca) {
      // Al quitar la geocerca se vuelve al encuadre de siempre, volando: un
      // salto seco deja sin saber si el mapa cambio de sitio o de escala.
      if (encuadre.current) {
        if (quieto()) {
          map.fitBounds(encuadre.current, { padding: [40, 40], maxZoom: 14 })
        } else {
          map.flyToBounds(encuadre.current, {
            padding: [40, 40],
            maxZoom: 14,
            duration: 1.2,
          })
        }
      }
      return
    }

    const centro: L.LatLngExpression = [punto.lat, punto.lng]
    const grupo = L.layerGroup()

    // El punto de "estas aqui", latiendo: es lo que distingue tu posicion de
    // una chincheta mas del inventario.
    L.marker(centro, {
      icon: L.divIcon({
        className: '',
        html: `<span class="mapa-yo"></span>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      }),
      interactive: false,
      keyboard: false,
    }).addTo(grupo)

    grupo.addTo(map)
    cerca_.current = grupo

    /*
      Sin geocerca dibujada: el circulo enmarcaba, pero tambien decia "esto es
      lo que hay" sobre un mapa que sigue teniendo el resto de la ciudad
      detras. El radio se sigue usando —es lo que fija cuanto se acerca— pero
      no se pinta.
    */
    const marco = L.latLng(centro).toBounds(radioKm * 2000)
    /*
      Quien pide menos movimiento no ve el vuelo.

      Un `flyToBounds` de 1,8 segundos es la pantalla entera desplazandose y
      cambiando de escala: de los disparadores vestibulares mas claros que hay.
      No se acorta, se apaga — el mapa se coloca y ya.
    */
    if (quieto()) map.fitBounds(marco, { padding: [24, 24] })
    else map.flyToBounds(marco, { padding: [24, 24], duration: 1.8 })
    /*
      `properties` esta en las dependencias aunque no se use: al llegar los
      inmuebles del radio, el efecto de arriba rehace el mapa entero, y sin
      esto la geocerca se quedaba dibujada sobre el mapa anterior —el que ya
      no existe— y no se veia nada.
    */
  }, [punto, radioKm, cerca, properties])

  return (
    <>
      <div
        ref={container}
        role="application"
        aria-label={t('property.map.label')}
        /* La marca con la que el vuelo encuentra el mapa: de aqui sale el clon
           en la portada, y aqui aterriza en el buscador. */
        {...{ [HERO_MAP_ATTR]: '' }}
        className={cn('h-[300px] w-full sm:h-[380px] lg:h-[450px]', className)}
      />

      {/* La ficha del popup, dentro del arbol de React y por eso con idioma,
          moneda y enlaces del sitio. La `key` la vuelve a montar al cambiar de
          inmueble: asi el carrusel empieza por la portada y no por la foto
          numero cuatro de la chincheta anterior. */}
      {hueco && ficha
        ? createPortal(
            <PropertyCard key={ficha.id} property={ficha} dense />,
            hueco,
          )
        : null}
    </>
  )
}

/** Si el sistema pide menos movimiento, preguntado en el momento de usarlo. */
function quieto(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * El encuadre, ignorando los extremos.
 *
 * La cartera se concentra en el area metropolitana de Bucaramanga, pero hay
 * sueltos en Barrancabermeja, San Gil o Zapatoca. Encuadrar sobre todos obliga a
 * alejarse hasta que se ve medio pais y los inmuebles quedan en un puñado de
 * puntos indistinguibles. Se encuadra sobre el 5-95 % de cada eje: el grueso se
 * ve grande y los sueltos siguen ahi, a un zoom de distancia.
 */
function coreBounds(points: L.LatLngExpression[]): L.LatLngBounds | null {
  if (!points.length) return null
  if (points.length < 8) return L.latLngBounds(points)

  const pairs = points as [number, number][]
  const cut = (values: number[], q: number) =>
    values[Math.min(values.length - 1, Math.floor(values.length * q))]

  const lats = pairs.map((p) => p[0]).sort((a, b) => a - b)
  const lngs = pairs.map((p) => p[1]).sort((a, b) => a - b)

  return L.latLngBounds(
    [cut(lats, 0.05), cut(lngs, 0.05)],
    [cut(lats, 0.95), cut(lngs, 0.95)],
  )
}
