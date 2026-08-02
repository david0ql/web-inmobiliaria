import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'

import type { Property } from '@/lib/types'

/**
 * El mapa de la ficha. Un solo inmueble, y lo que se enseña depende de
 * `mapPublication`:
 *   HIDDEN      — no se pinta nada, ni el bloque
 *   APPROXIMATE — un circulo de 400m, que es lo que la agencia autoriza
 *   EXACT       — la chincheta en su sitio
 */
export function PropertyMap({ property }: { property: Property }) {
  const container = useRef<HTMLDivElement>(null)
  const { latitude, longitude, mapPublication } = property

  useEffect(() => {
    if (!container.current) return
    if (latitude === null || longitude === null) return
    if (mapPublication === 'HIDDEN') return

    const position: L.LatLngExpression = [latitude, longitude]
    const map = L.map(container.current, {
      center: position,
      zoom: mapPublication === 'APPROXIMATE' ? 14 : 16,
      scrollWheelZoom: false,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map)

    if (mapPublication === 'APPROXIMATE') {
      L.circle(position, {
        radius: 400,
        color: '#0d0d0d',
        weight: 1,
        fillOpacity: 0.12,
      }).addTo(map)
    } else {
      L.marker(position, {
        icon: L.divIcon({
          className: '',
          html: `<span style="display:block;width:16px;height:16px;border-radius:50%;background:#0d0d0d;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></span>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        }),
      }).addTo(map)
    }

    return () => {
      map.remove()
    }
  }, [latitude, longitude, mapPublication])

  if (latitude === null || longitude === null || mapPublication === 'HIDDEN') {
    return null
  }

  return (
    <section>
      <h2 className="mb-3 text-xs font-bold tracking-widest uppercase">
        Ubicación
      </h2>
      <div
        ref={container}
        role="application"
        aria-label={`Ubicación de ${property.title}`}
        className="h-[320px] w-full overflow-hidden rounded-lg border"
      />
      {mapPublication === 'APPROXIMATE' && (
        <p className="mt-2 text-xs text-muted-foreground">
          Ubicación aproximada. Tu asesor te da la dirección exacta al agendar la
          visita.
        </p>
      )}
    </section>
  )
}
