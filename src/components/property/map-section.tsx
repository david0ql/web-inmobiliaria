import { lazy, Suspense, useEffect, useState } from 'react'

import { LocateFixed } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { api, searchProperties } from '@/lib/api'
import { bandera, useUbicacion } from '@/lib/ubicacion'
import { useCuandoOcioso } from '@/lib/cuando-ocioso'
import { decimal } from '@/lib/format'
import { useIdioma, useT } from '@/lib/i18n'
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
  const t = useT()
  const { punto, lugar, estado, pedir } = useUbicacion()
  const { idioma } = useIdioma()
  const [properties, setProperties] = useState<Property[] | null>(null)
  const [cerca, setCerca] = useState(true)

  /*
    Con la ubicacion concedida, el mapa deja de enseñar el inventario entero y
    pasa a enseñar lo que hay dentro del radio. Se pide a la API en vez de
    filtrar lo ya cargado: en el mapa hay 96 inmuebles de 642, y filtrar esos
    96 por distancia daria "no hay nada cerca" en media area metropolitana.
  */
  useEffect(() => {
    if (!punto || !cerca) return
    const controller = new AbortController()
    api
      .get<Property[]>('/public/properties/near', {
        ...punto,
        radiusKm: RADIO_KM,
        limit: 120,
      }, controller.signal)
      .then((cercanos) => {
        // Sin nada dentro del radio no se cambia el mapa: enseñar un circulo
        // vacio es peor que enseñar el inventario.
        if (cercanos.length) setProperties(cercanos)
        else setCerca(false)
      })
      .catch(() => {
        /* Se queda el mapa de siempre. */
      })
    return () => controller.abort()
  }, [punto, cerca])

  useEffect(() => {
    if (!ocioso) return
    if (punto && cerca) return
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

  const conUbicacion = Boolean(punto)

  return (
    <div className="relative">
      <Suspense fallback={<MapPoster />}>
        <PropertiesMap
          properties={properties}
          punto={punto}
          radioKm={RADIO_KM}
          cerca={cerca}
        />
      </Suspense>

      {/*
        El control va encima del mapa y no debajo: es lo que explica por que el
        mapa se movio solo, y esa explicacion tiene que estar donde paso.

        `pointer-events-none` en el contenedor y `auto` en la pastilla: si no,
        una caja transparente de un metro de ancho se traga los gestos del
        mapa que hay debajo.
      */}
      <div className="pointer-events-none absolute inset-x-0 top-3 z-[400] flex justify-center px-3">
        {conUbicacion ? (
          <div className="pointer-events-auto flex max-w-full items-center gap-2 rounded-full border bg-background/95 py-1.5 pr-1.5 pl-3 shadow-lg backdrop-blur">
            <span className="flex min-w-0 items-center gap-1.5 text-xs">
              {lugar && (
                <span className="text-sm leading-none" aria-hidden="true">
                  {bandera(lugar.countryCode)}
                </span>
              )}
              <span className="truncate">
                {cerca
                  ? t('map.fence.on', { km: decimal(RADIO_KM, idioma) })
                  : t('map.fence.off')}
              </span>
            </span>
            <Button
              size="sm"
              variant={cerca ? 'outline' : 'default'}
              className="h-7 shrink-0 rounded-full px-3 text-xs"
              onClick={() => setCerca((previo) => !previo)}
            >
              {cerca ? t('map.fence.remove') : t('map.fence.restore')}
            </Button>
          </div>
        ) : (
          estado !== 'no-disponible' && (
            <Button
              size="sm"
              variant="outline"
              className="pointer-events-auto h-8 rounded-full bg-background/95 text-xs shadow-lg backdrop-blur"
              onClick={pedir}
              disabled={estado === 'preguntando'}
            >
              <LocateFixed className="size-3.5" aria-hidden="true" />
              {t('map.fence.locate')}
            </Button>
          )
        )}
      </div>
    </div>
  )
}

/** Dos kilometros y medio: el barrio propio y el de al lado, no media ciudad. */
const RADIO_KM = 2.5

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
