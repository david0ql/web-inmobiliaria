import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { Bath, BedDouble, Car, ChevronLeft, ChevronRight, Ruler } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { SpecRow } from '@/components/common/spec-row'
import { prefetchProperty } from '@/lib/api'
import { useCatalogo } from '@/lib/catalog-i18n'
import { useCurrency } from '@/lib/currency'
import { area as fmtArea } from '@/lib/format'
import { useIdioma, useT } from '@/lib/i18n'
import { Link } from '@/lib/nav'
import { MAP_CENTER, MAP_ZOOM } from '@/lib/site'
import { propertyPath } from '@/lib/slug'
import type { Property } from '@/lib/types'

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
}: {
  properties: Property[]
  /** Donde esta quien mira, si lo concedio. */
  punto?: { lat: number; lng: number } | null
  radioKm?: number
  /** Con la geocerca puesta o con el mapa entero. */
  cerca?: boolean
}) {
  const t = useT()
  const { idioma } = useIdioma()
  const { titulo } = useCatalogo()
  const container = useRef<HTMLDivElement>(null)
  const mapa = useRef<L.Map | null>(null)
  const cerca_ = useRef<L.LayerGroup | null>(null)
  const encuadre = useRef<L.LatLngBounds | null>(null)
  const globo = useRef<L.Popup | null>(null)

  /** El inmueble cuya ficha esta abierta; `null` con el popup cerrado. */
  const [ficha, setFicha] = useState<Property | null>(null)

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
    })
    mapa.current = map

    map.on('click', () => map.scrollWheelZoom.enable())
    map.on('mouseout', () => map.scrollWheelZoom.disable())

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      // En pantallas de alta densidad pide un zoom mas y las dibuja a la mitad:
      // sin esto las teselas se ven borrosas en cualquier movil.
      detectRetina: true,
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map)

    /*
      El popup compartido. `maxWidth` = `minWidth` = el ancho de la ficha: asi
      Leaflet no la estrecha ni la estira, y sobre todo no tapa el mapa —en un
      movil de 360px sigue dejando ver a los lados—. El alto lo pone el
      contenido, que es foto contenida + cuatro lineas.
    */
    const popup = L.popup({
      maxWidth: 264,
      minWidth: 264,
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
        cluster.addLayer(
          L.circle(position, {
            radius: 400,
            color: '#0d0d0d',
            weight: 1,
            fillOpacity: 0.12,
          }).on('click', abrir),
        )
      } else {
        cluster.addLayer(
          // El `title` es lo que da nombre al marcador: Leaflet le pone
          // role="button" y sin texto queda mudo para un lector de pantalla.
          L.marker(position, {
            icon: pin(),
            title: textos.current.titulo(property),
          }).on('click', abrir),
        )
      }
    }

    map.addLayer(cluster)

    const frame = coreBounds(bounds)
    encuadre.current = frame
    if (frame) map.fitBounds(frame, { padding: [40, 40], maxZoom: 14 })

    return () => {
      map.remove()
      mapa.current = null
      globo.current = null
      // El popup se fue con el mapa: si el estado siguiera apuntando a un
      // inmueble, la ficha quedaria pintada en un hueco que ya no cuelga de
      // ninguna parte.
      setFicha(null)
    }
    // `idioma` esta aqui porque el nombre accesible de las chinchetas se
    // traduce y solo se escribe al crearlas.
  }, [properties, idioma, hueco])

  /*
    Leaflet mide el popup al abrirlo, y en ese instante el hueco todavia esta
    vacio: el contenido lo pinta React un tick despues. `update()` vuelve a
    medir y a decidir el desplazamiento del mapa, que es lo que evita que la
    ficha nazca medio fuera de la pantalla.
  */
  useEffect(() => {
    if (ficha) globo.current?.update()
  }, [ficha])

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
        map.flyToBounds(encuadre.current, {
          padding: [40, 40],
          maxZoom: 14,
          duration: 1.2,
        })
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
    map.flyToBounds(marco, { padding: [24, 24], duration: 1.8 })
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
        className="h-[300px] w-full sm:h-[380px] lg:h-[450px]"
      />

      {/* La ficha del popup, dentro del arbol de React y por eso con idioma,
          moneda y enlaces del sitio. La `key` la vuelve a montar al cambiar de
          inmueble: asi el carrusel empieza por la portada y no por la foto
          numero cuatro de la chincheta anterior. */}
      {hueco && ficha
        ? createPortal(<FichaMapa key={ficha.id} property={ficha} />, hueco)
        : null}
    </>
  )
}

/**
 * La ficha de la ventanita: la tarjeta del listado en pequeño.
 *
 * Enseña lo mismo y en el mismo orden que `PropertyCard` —foto, franja de
 * cifras, tipo y titulo, codigo, precio y el enlace al detalle— porque quien
 * pulsa una chincheta y quien mira el listado estan decidiendo lo mismo, y dos
 * lenguajes distintos para la misma decision solo obligan a releer.
 *
 * La foto va a 264x150: contenida a proposito, para que la ventanita no tape
 * el mapa que la persona esta usando para elegir.
 */
function FichaMapa({ property }: { property: Property }) {
  const t = useT()
  const { idioma } = useIdioma()
  const { precio, moneda } = useCurrency()
  const { tipo, titulo } = useCatalogo()
  const [indice, setIndice] = useState(0)

  const fotos = property.images ?? []
  const foto = fotos[indice] ?? fotos[0]
  const to = propertyPath(property)
  const nombre = titulo(property)
  const built = property.builtArea ?? property.area

  // El giro es circular: con cuatro fotos y una flecha a cada lado, toparse
  // con un boton apagado en el extremo es peor que dar la vuelta.
  const mover = (paso: number) =>
    setIndice((n) => (n + paso + fotos.length) % fotos.length)

  const warm = () => {
    void import('@/routes/property')
    prefetchProperty(property.code)
  }

  return (
    <article className="w-[264px] font-sans text-foreground">
      <div className="relative h-[150px] overflow-hidden bg-secondary">
        {foto ? (
          <img
            src={foto.url}
            alt={t('property.gallery.photo_alt', {
              title: nombre,
              index: indice + 1,
            })}
            width={264}
            height={150}
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
            {t('property.card.no_photo')}
          </div>
        )}

        {fotos.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => mover(-1)}
              aria-label={t('property.gallery.previous')}
              className="absolute top-1/2 left-1 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white transition-colors hover:bg-black/70"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => mover(1)}
              aria-label={t('property.gallery.next')}
              className="absolute top-1/2 right-1 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white transition-colors hover:bg-black/70"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>

            {/*
              Contador y puntitos a la vez, y no uno de los dos: los puntos
              dicen de un vistazo cuantas fotos quedan y dejan saltar a una,
              pero con seis ya no se sabe en cual se esta sin contarlos. El
              numero lo dice sin mirar.
            */}
            <span className="tabular absolute right-1.5 bottom-1.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] leading-none text-white">
              {indice + 1}/{fotos.length}
            </span>
            <div className="absolute bottom-1.5 left-1.5 flex gap-1">
              {fotos.map((imagen, n) => (
                <button
                  key={imagen.id}
                  type="button"
                  onClick={() => setIndice(n)}
                  aria-label={t('property.gallery.go_to_photo', { index: n + 1 })}
                  aria-current={n === indice}
                  className={`size-1.5 rounded-full transition-colors ${
                    n === indice ? 'bg-white' : 'bg-white/45 hover:bg-white/75'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <SpecRow
        specs={[
          { icon: Ruler, value: built ? fmtArea(built, idioma) : null },
          {
            icon: BedDouble,
            value: property.bedrooms,
            unit:
              property.bedrooms === 1
                ? t('property.spec.bedrooms.one')
                : t('property.spec.bedrooms.other'),
          },
          {
            icon: Bath,
            value: property.bathrooms,
            unit:
              property.bathrooms === 1
                ? t('property.spec.bathrooms.one')
                : t('property.spec.bathrooms.other'),
          },
          {
            icon: Car,
            value: property.garages,
            unit:
              property.garages === 1
                ? t('property.spec.garages.one')
                : t('property.spec.garages.other'),
          },
        ]}
      />

      <div className="flex flex-col gap-1 p-3">
        <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
          {tipo(property.propertyType) ?? t('property.fallback.type')}
        </p>
        <h3 className="line-clamp-2-title m-0 text-[13px] leading-snug font-semibold uppercase">
          <Link to={to} onMouseEnter={warm} onFocus={warm} className="text-foreground no-underline hover:underline">
            {nombre}
          </Link>
        </h3>
        <p className="m-0 text-[11px] text-muted-foreground">
          {t('property.card.code', { code: property.code })}
        </p>
        {property.mapPublication === 'APPROXIMATE' && (
          <p className="m-0 text-[11px] text-muted-foreground">
            {t('property.map.popup.approximate')}
          </p>
        )}
        <p className="tabular m-0 text-lg leading-none font-normal tracking-tight">
          {precio(property.salePrice ?? property.rentPrice)}{' '}
          <small className="text-[10px] tracking-widest text-muted-foreground uppercase">
            {moneda}
          </small>
        </p>
      </div>

      <Link
        to={to}
        onMouseEnter={warm}
        onFocus={warm}
        className="block border-t bg-primary px-3 py-2.5 text-center text-[11px] font-bold tracking-widest text-primary-foreground uppercase no-underline transition-opacity hover:opacity-90"
      >
        {t('property.card.view_details')}
      </Link>
    </article>
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

/**
 * Un `divIcon` en lugar del marcador por defecto: el PNG de Leaflet se pierde
 * al empaquetar y ademas asi la chincheta es del negro del sitio.
 */
function pin() {
  return L.divIcon({
    className: '',
    html: `<span style="display:block;width:16px;height:16px;border-radius:50%;background:#0d0d0d;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8],
  })
}
