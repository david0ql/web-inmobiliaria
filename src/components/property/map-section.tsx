import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'

import { Button } from '@/components/ui/button'
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

  Por eso lo que se sirve de entrada es una foto del mapa —una sola imagen
  nuestra, de 105 kB— y Leaflet solo se monta cuando alguien lo pide.

  No es una decision de estilo. Con el mapa vivo, el elemento mas grande de la
  pantalla en movil era una tesela de openstreetmap.org: 4,7 s hasta pintarla,
  de los cuales 1,25 s eran esperar a que Leaflet se descargara y arrancara
  para poder siquiera pedirla. La foto llega con el HTML, se precarga con
  prioridad alta y se ve entera en cuanto llega el CSS.

  Para el visitante el cambio es un boton: ve el mapa, y si quiere moverse por
  el, lo activa. Quien entra desde el movil y baja directo a los destacados no
  descarga nunca Leaflet, ni sus teselas, ni los 96 inmuebles del mapa.
*/
export function MapSection() {
  const [properties, setProperties] = useState<Property[] | null>(null)
  const [live, setLive] = useState(false)
  const frame = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!live) return
    const controller = new AbortController()

    // Dos paginas: el mapa quiere el inventario entero, la API lo pagina de 48.
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
  }, [live])

  if (!live) return <MapPoster ref={frame} onActivate={() => setLive(true)} />
  if (!properties) return <MapPoster ref={frame} loading />

  return (
    <Suspense fallback={<MapPoster loading />}>
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
function MapPoster({
  ref,
  onActivate,
  loading,
}: {
  ref?: React.Ref<HTMLDivElement>
  onActivate?: () => void
  loading?: boolean
}) {
  return (
    <div
      ref={ref}
      className="relative h-[300px] w-full overflow-hidden bg-secondary sm:h-[380px] lg:h-[450px]"
    >
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

      {onActivate && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/25">
          <Button size="lg" onClick={onActivate} className="shadow-lg">
            <MapPin className="size-4" />
            Ver el mapa de inmuebles
          </Button>
        </div>
      )}

      {loading && (
        <div
          className="absolute inset-0 animate-pulse bg-black/25"
          aria-hidden="true"
        />
      )}
    </div>
  )
}
