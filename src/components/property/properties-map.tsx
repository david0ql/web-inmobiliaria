import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { useEffect, useRef } from 'react'

import { moneyShort } from '@/lib/format'
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
export function PropertiesMap({ properties }: { properties: Property[] }) {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!container.current) return

    const map = L.map(container.current, {
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
      scrollWheelZoom: false,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
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
        cluster.addLayer(L.marker(position, { icon: pin() }).bindPopup(popup))
      }
    }

    map.addLayer(cluster)

    const frame = coreBounds(bounds)
    if (frame) map.fitBounds(frame, { padding: [40, 40], maxZoom: 14 })

    return () => {
      map.remove()
    }
  }, [properties])

  return (
    <div
      ref={container}
      role="application"
      aria-label="Mapa de inmuebles"
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
