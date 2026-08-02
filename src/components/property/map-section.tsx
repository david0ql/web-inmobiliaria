import { lazy, Suspense, useEffect, useState } from 'react'

import { searchProperties } from '@/lib/api'
import { useCuandoOcioso } from '@/lib/cuando-ocioso'
import type { Property } from '@/lib/types'

const PropertiesMap = lazy(() =>
  import('@/components/property/properties-map').then((m) => ({
    default: m.PropertiesMap,
  })),
)

/*
  El mapa de la portada: siempre sale, pero no se pone por delante de nada.

  Es lo mas caro de la pagina —Leaflet mas el plugin de agrupacion pesan
  ~150 kB, tira de una veintena de teselas contra un servidor ajeno y sus datos
  son ~100 inmuebles completos— y es tambien el elemento mas grande de la
  pantalla, o sea el que mide el navegador para decidir si la pagina va rapida.

  Asi que lo que se sirve con el HTML es una foto del mapa: 35 kB en movil, en
  el armazon de index.html, precargada con prioridad alta. Se ve entera en
  cuanto llega el CSS, sin esperar a React. Cuando la pagina termina de cargar
  y el hilo queda libre, Leaflet se monta encima y a partir de ahi el mapa es
  el de verdad, con sus chinchetas.

  El visitante no ve el cambio: la foto esta hecha con el mismo centro y el
  mismo zoom.
*/
export function MapSection() {
  const ocioso = useCuandoOcioso()
  const [properties, setProperties] = useState<Property[] | null>(null)

  useEffect(() => {
    if (!ocioso) return
    const controller = new AbortController()

    // Dos paginas: el mapa quiere el inventario entero y la API lo da de 48.
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

    return () => controller.abort()
  }, [ocioso])

  if (!properties?.length) return <MapPoster />

  return (
    <Suspense fallback={<MapPoster />}>
      <PropertiesMap properties={properties} />
    </Suspense>
  )
}

/**
 * La foto del mapa, con el mismo alto que tendra el mapa real para que nada
 * salte al cambiarlo.
 *
 * `fetchpriority="high"` y el `preload` del index.html van juntos: sin ellos el
 * navegador la trata como una imagen mas del cuerpo y la deja para el final,
 * que es exactamente el problema que se venia a resolver.
 */
function MapPoster() {
  return (
    <div className="relative h-[300px] w-full overflow-hidden bg-secondary sm:h-[380px] lg:h-[450px]">
      <img
        src="/mapa-santander.webp"
        srcSet="/mapa-santander-sm.webp 760w, /mapa-santander.webp 1280w"
        sizes="100vw"
        alt="Mapa de Bucaramanga y su área metropolitana"
        width={1280}
        height={760}
        fetchPriority="high"
        decoding="sync"
        className="size-full object-cover"
      />

      {/* Requisito de la licencia de los datos, tambien sobre la foto. */}
      <span className="absolute right-0 bottom-0 bg-white/80 px-1.5 py-0.5 text-[10px] text-neutral-700">
        © OpenStreetMap
      </span>
    </div>
  )
}
