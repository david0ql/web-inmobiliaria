import { lazy, Suspense, useEffect, useRef, useState } from 'react'

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

  Y no arranca en cuanto el hilo queda libre, sino cuando el marco se acerca a
  la pantalla. En movil eso significa que quien entra y baja directo a los
  destacados no descarga nunca Leaflet, sus teselas ni los 96 inmuebles del
  mapa: eran 2,4 s de bloqueo del hilo principal y ~400 kB para algo que
  todavia no habia mirado.
*/
export function MapSection() {
  const [properties, setProperties] = useState<Property[] | null>(null)
  const frame = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = frame.current
    // Sin IntersectionObserver (navegadores viejos) se monta sin mas: mejor
    // pagar el coste que dejar la portada vacia.
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
      // 200 px de margen: empieza a cargar justo antes de que se vea.
      { rootMargin: '200px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!visible) return
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
  }, [visible])

  if (!properties) return <MapFrame ref={frame} idle={!visible} />

  return (
    <Suspense fallback={<MapFrame ref={frame} />}>
      <PropertiesMap properties={properties} />
    </Suspense>
  )
}

/** El hueco del mapa, con su alto exacto para que nada salte al llegar. */
function MapFrame({
  ref,
  idle,
}: {
  ref?: React.Ref<HTMLDivElement>
  idle?: boolean
}) {
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`h-[300px] w-full bg-secondary sm:h-[380px] lg:h-[450px] ${
        idle ? '' : 'animate-pulse'
      }`}
    />
  )
}
