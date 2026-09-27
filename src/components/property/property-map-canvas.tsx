import L from 'leaflet'

import {
  capaBase,
  cercoAproximado,
  chincheta,
  controlZoom,
} from '@/lib/mapa-skin'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'

import { useT } from '@/lib/i18n'
import type { Property } from '@/lib/types'

/**
 * El lienzo de Leaflet. Vive en su propio fichero para que los 150 kB de la
 * libreria solo se descarguen cuando el bloque de ubicacion se acerca a la
 * pantalla: en la ficha estaban compitiendo con la foto principal, que es lo
 * unico que el visitante esta esperando ver.
 *
 * Lo que se enseña depende de `mapPublication`:
 *   HIDDEN      — no se pinta nada, ni el bloque
 *   APPROXIMATE — un circulo de 400m, que es lo que la agencia autoriza
 *   EXACT       — la chincheta en su sitio
 */
export function PropertyMapCanvas({ property }: { property: Property }) {
  const t = useT()
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
      // La piel del sitio pone el suyo abajo a la derecha.
      zoomControl: false,
    })

    capaBase().addTo(map)
    controlZoom().addTo(map)

    if (mapPublication === 'APPROXIMATE') {
      cercoAproximado(position).addTo(map)
    } else {
      L.marker(position, {
        // Leaflet le pone role="button": sin `title` queda mudo para un lector
        // de pantalla.
        title: property.title,
        icon: chincheta(),
      }).addTo(map)
    }

    return () => {
      map.remove()
    }
  }, [latitude, longitude, mapPublication, property.title])

  return (
    <div
      ref={container}
      role="application"
      aria-label={t('property.map.canvas_label', { title: property.title })}
      className="h-[320px] w-full overflow-hidden rounded-lg border"
    />
  )
}
