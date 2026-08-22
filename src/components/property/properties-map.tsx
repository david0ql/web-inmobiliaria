import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { useEffect, useRef } from 'react'

import { moneyShort } from '@/lib/format'
import { useT } from '@/lib/i18n'
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
  const container = useRef<HTMLDivElement>(null)
  const mapa = useRef<L.Map | null>(null)
  const cerca_ = useRef<L.LayerGroup | null>(null)
  const encuadre = useRef<L.LatLngBounds | null>(null)

  useEffect(() => {
    if (!container.current) return

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

      const popup = `
        <a href="${propertyPath(property)}" style="display:block;max-width:200px;text-decoration:none;color:inherit">
          <strong style="display:block;font-size:12px;line-height:1.3">${escapeHtml(property.title)}</strong>
          <span style="font-size:13px">${moneyShort(property.salePrice ?? property.rentPrice)}</span>
        </a>`

      if (property.mapPublication === 'APPROXIMATE') {
        cluster.addLayer(
          L.circle(position, {
            radius: 400,
            color: '#0d0d0d',
            weight: 1,
            fillOpacity: 0.12,
          }).bindPopup(popup),
        )
      } else {
        cluster.addLayer(
          // El `title` es lo que da nombre al marcador: Leaflet le pone
          // role="button" y sin texto queda mudo para un lector de pantalla.
          L.marker(position, { icon: pin(), title: property.title }).bindPopup(
            popup,
          ),
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
    }
  }, [properties])

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

    const circulo = L.circle(centro, {
      radius: radioKm * 1000,
      color: '#0d0d0d',
      weight: 2,
      opacity: 0.55,
      fillColor: '#0d0d0d',
      fillOpacity: 0.06,
      interactive: false,
    }).addTo(grupo)

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

    map.flyToBounds(circulo.getBounds(), { padding: [24, 24], duration: 1.8 })
    /*
      `properties` esta en las dependencias aunque no se use: al llegar los
      inmuebles del radio, el efecto de arriba rehace el mapa entero, y sin
      esto la geocerca se quedaba dibujada sobre el mapa anterior —el que ya
      no existe— y no se veia nada.
    */
  }, [punto, radioKm, cerca, properties])

  return (
    <div
      ref={container}
      role="application"
      aria-label={t('property.map.label')}
      className="h-[300px] w-full sm:h-[380px] lg:h-[450px]"
    />
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
