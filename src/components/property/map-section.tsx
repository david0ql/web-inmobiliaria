import { lazy, Suspense, useEffect, useState } from 'react'

import { searchProperties } from '@/lib/api'
import type { Property } from '@/lib/types'

const PropertiesMap = lazy(() =>
  import('@/components/property/properties-map').then((m) => ({
    default: m.PropertiesMap,
  })),
)

/*
  El mapa es la portada del sitio, pero es tambien lo mas caro que hay en ella:
  Leaflet mas el plugin de agrupacion pesan ~150 kB, tira de una veintena de
  teselas contra un servidor ajeno, y sus datos son ~100 inmuebles completos.

  Antes todo eso colgaba del loader de la ruta, asi que la home no pintaba NADA
  hasta que llegaban las cuatro peticiones. Ahora el resto de la pagina —el
  buscador, los destacados, los ultimos— se pinta con dos, y el mapa se monta
  despues, cuando el hilo principal queda libre, con sus datos aparte.

  De cara al visitante el hueco no parpadea: el marco ocupa su sitio desde el
  primer momento, asi que no hay salto de maquetacion.
*/
export function MapSection() {
  const [properties, setProperties] = useState<Property[] | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    const start = () => {
      Promise.all([
        searchProperties({ limit: 48 }, controller.signal),
        searchProperties({ limit: 48, page: 2 }, controller.signal),
      ])
        .then(([a, b]) =>
          setProperties(
            [...a.data, ...b.data].filter(
              (p) => p.latitude !== null && p.longitude !== null,
            ),
          ),
        )
        .catch(() => setProperties([]))
    }

    // `requestIdleCallback` donde exista; Safari todavia no lo trae.
    let cancel: () => void
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(start, { timeout: 2000 })
      cancel = () => window.cancelIdleCallback(id)
    } else {
      const id = window.setTimeout(start, 400)
      cancel = () => window.clearTimeout(id)
    }

    return () => {
      controller.abort()
      cancel()
    }
  }, [])

  if (!properties) return <MapFrame />

  return (
    <Suspense fallback={<MapFrame />}>
      <PropertiesMap properties={properties} />
    </Suspense>
  )
}

/** El hueco del mapa, con su alto exacto para que nada salte al llegar. */
function MapFrame() {
  return (
    <div
      aria-hidden="true"
      className="h-[300px] w-full animate-pulse bg-secondary sm:h-[380px] lg:h-[450px]"
    />
  )
}
