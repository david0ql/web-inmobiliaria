import { lazy, Suspense, useEffect, useRef, useState } from 'react'

import type { Property } from '@/lib/types'

const PropertyMapCanvas = lazy(() =>
  import('@/components/property/property-map-canvas').then((m) => ({
    default: m.PropertyMapCanvas,
  })),
)

/**
 * El bloque de ubicacion de la ficha.
 *
 * El marco y su titulo se pintan siempre; Leaflet —150 kB, mas las teselas de
 * un servidor ajeno— espera a que el bloque se acerque a la pantalla. En movil
 * la ubicacion queda muy por debajo del pliegue, asi que en la practica deja de
 * competir con la foto principal, que es lo unico que el visitante esta
 * esperando ver.
 */
export function PropertyMap({ property }: { property: Property }) {
  const { latitude, longitude, mapPublication } = property
  const frame = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = frame.current
    // Sin IntersectionObserver (navegadores viejos) se monta sin mas: mejor
    // pagar el coste que dejar el hueco vacio.
    if (!node || typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setVisible(true)
        observer.disconnect()
      },
      // 300 px de margen: llega cargado justo antes de que se vea.
      { rootMargin: '300px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  if (latitude === null || longitude === null || mapPublication === 'HIDDEN') {
    return null
  }

  return (
    <section>
      <h2 className="mb-3 text-xs font-bold tracking-widest uppercase">
        Ubicación
      </h2>
      {/* El alto es el mismo que tendra el mapa, para que nada salte al llegar. */}
      <div ref={frame} className="h-[320px] w-full">
        {visible && (
          <Suspense fallback={<MapPlaceholder />}>
            <PropertyMapCanvas property={property} />
          </Suspense>
        )}
        {!visible && <MapPlaceholder />}
      </div>
      {mapPublication === 'APPROXIMATE' && (
        <p className="mt-2 text-xs text-muted-foreground">
          Ubicación aproximada. Tu asesor te da la dirección exacta al agendar la
          visita.
        </p>
      )}
    </section>
  )
}

function MapPlaceholder() {
  return (
    <div
      aria-hidden="true"
      className="size-full rounded-lg border bg-secondary"
    />
  )
}
