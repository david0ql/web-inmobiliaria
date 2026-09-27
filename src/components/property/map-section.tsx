import { MapPinOff, X } from 'lucide-react'
import { lazy, Suspense, useEffect, useState } from 'react'

import { api, searchProperties } from '@/lib/api'
import { useUbicacion } from '@/lib/ubicacion'
import { useCuandoOcioso } from '@/lib/cuando-ocioso'
import { useT } from '@/lib/i18n'
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
/** Lo que devuelve `/public/properties/near`: un inmueble y su distancia. */
type Cercano = Property & { distanceKm?: number }

export function MapSection() {
  const ocioso = useCuandoOcioso()
  const { punto } = useUbicacion()
  const [properties, setProperties] = useState<Property[] | null>(null)
  /** Cuando quien mira esta lejos de todo el inventario. */
  const [lejos, setLejos] = useState<{ km: number; lugar: string | null } | null>(
    null,
  )

  /*
    Los del radio se SUMAN al inventario, no lo sustituyen.

    La geocerca acerca y enmarca; no esconde. Quien mira quiere ver lo que
    tiene al lado sin perder de vista que la agencia tiene mas cosas un poco
    mas alla: alejar el mapa y encontrarlo vacio es peor que no haberlo
    acercado.

    Y hacen falta aparte porque el mapa carga 96 inmuebles de 642: los del
    radio pueden no estar entre esos 96, y sin pedirlos el circulo saldria
    medio vacio justo donde mas lleno esta.
  */
  useEffect(() => {
    if (!punto) return
    const controller = new AbortController()
    /*
      Sin `radiusKm`: se piden los mas cercanos SIN recortar por distancia.

      Antes se pedian solo los de 2,5 km y una respuesta vacia se ignoraba en
      silencio: quien abria la web desde Bogota veia el mapa plantado en
      Bucaramanga, sin una palabra que le dijera que eso no es donde esta ni por
      que. Pidiendolos ordenados por cercania y ya, la misma respuesta sirve para
      las dos cosas: los que estan al lado se suman al mapa, y si el primero
      queda a 300 km, es que no hay nada cerca y hay que decirlo.
    */
    api
      .get<Cercano[]>('/public/properties/near', {
        ...punto,
        limit: 120,
      }, controller.signal)
      .then((cercanos) => {
        if (!cercanos.length) return
        const dentro = cercanos.filter((p) => (p.distanceKm ?? 0) <= RADIO_KM)
        if (dentro.length) {
          setProperties((previos) => unir(previos ?? [], dentro))
          setLejos(null)
          return
        }
        // Lo mas cercano, y donde esta: es lo unico que hace util el aviso.
        const primero = cercanos[0]
        setLejos({
          km: Math.round(primero.distanceKm ?? 0),
          lugar: primero.city?.name ?? null,
        })
      })
      .catch(() => {
        /* Se queda el mapa de siempre. */
      })
    return () => controller.abort()
  }, [punto])

  useEffect(() => {
    if (!ocioso) return
    const controller = new AbortController()

    // Dos paginas: el mapa quiere el inventario entero y la API lo da de 48.
    Promise.all([
      searchProperties({ limit: 48 }, controller.signal),
      searchProperties({ limit: 48, page: 2 }, controller.signal),
    ])
      .then(([a, b]) =>
        setProperties((previos) =>
          unir(
            previos ?? [],
            [...a.data, ...b.data].filter(
              (p) => p.latitude !== null && p.longitude !== null,
            ),
          ),
        ),
      )
      .catch(() => setProperties([]))

    return () => controller.abort()
  }, [ocioso])

  if (!properties?.length) return <MapPoster />

  return (
    <div className="relative">
      <Suspense fallback={<MapPoster />}>
        {/*
          Estando lejos, el mapa NO vuela a la ubicacion: alli no hay nada que
          enseñar. Se queda en el encuadre del inventario, que es a donde apunta
          el aviso.
        */}
        <PropertiesMap
          properties={properties}
          punto={lejos ? null : punto}
          radioKm={RADIO_KM}
          cerca={!lejos}
        />
      </Suspense>

      {lejos && <AvisoLejos {...lejos} />}
    </div>
  )
}

/**
 * "Cerca de ti no hay nada".
 *
 * Va sobre el mapa y no encima ni debajo: lo que hay que entender es que ESE
 * mapa no es el sitio donde estas. Dice tambien a que distancia queda lo mas
 * cercano y como se llama, porque "no hay nada cerca" a secas se lee como "esta
 * inmobiliaria no tiene nada".
 *
 * Se puede cerrar: quien ya lo entendio no tiene por que seguir viendolo sobre
 * el mapa que vino a mirar.
 */
function AvisoLejos({ km, lugar }: { km: number; lugar: string | null }) {
  const t = useT()
  const [visible, setVisible] = useState(true)
  if (!visible) return null

  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-[500] flex justify-center px-3">
      <div className="pointer-events-auto flex max-w-md items-start gap-2.5 rounded-xl border bg-background/95 px-3.5 py-2.5 text-left shadow-lg backdrop-blur-sm">
        <MapPinOff className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p className="text-xs leading-relaxed">
          {lugar
            ? t('map.far.detail', { km: String(km), place: lugar })
            : t('map.far.detail_noplace', { km: String(km) })}
        </p>
        <button
          type="button"
          onClick={() => setVisible(false)}
          aria-label={t('map.far.dismiss')}
          className="-mr-1 -mt-0.5 shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

/** Dos kilometros y medio: el barrio propio y el de al lado, no media ciudad. */
const RADIO_KM = 2.5

/**
 * Dos listas de inmuebles en una, sin repetidos.
 *
 * Las dos consultas —el inventario del mapa y los del radio— se solapan, y un
 * mismo inmueble dibujado dos veces cuenta dos veces en el numero del grupo:
 * el mapa diria que hay cuarenta donde hay treinta.
 */
function unir(a: Property[], b: Property[]): Property[] {
  const porId = new Map(a.map((p) => [p.id, p]))
  for (const p of b) porId.set(p.id, p)
  return [...porId.values()]
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
  const t = useT()
  return (
    <div className="relative h-[300px] w-full overflow-hidden bg-secondary sm:h-[380px] lg:h-[450px]">
      <img
        src="/mapa-santander.webp"
        srcSet="/mapa-santander-sm.webp 760w, /mapa-santander.webp 1280w"
        sizes="100vw"
        alt={t('property.map.poster_alt')}
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
