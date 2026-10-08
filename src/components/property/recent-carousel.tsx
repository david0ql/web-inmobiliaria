import Autoplay from 'embla-carousel-autoplay'
import Fade from 'embla-carousel-fade'
import useEmblaCarousel from 'embla-carousel-react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { use, useCallback, useEffect, useState } from 'react'

import { PuntosCarrusel } from '@/components/common/puntos-carrusel'
import { PropertyCard } from '@/components/property/property-card'
import type { Showcase } from '@/lib/api'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/**
 * Los últimos inmuebles, de tres en tres y pasando.
 *
 * Nueve tarjetas en una rejilla son tres filas: la portada se estira y quien
 * llega abajo ya se cansó. De tres en tres se ve una fila, se entiende de un
 * vistazo y quien quiera más pasa — que es como lo tenía el sitio anterior y
 * como la agencia lo pidió.
 *
 * Las tres primeras fotos van con prioridad; el resto espera a que alguien pase
 * de página. Sin eso, el carrusel descargaría las nueve al entrar y la portada
 * pagaría por seis fotos que nadie ha visto.
 */
export function RecentCarousel({ promise }: { promise: Promise<Showcase> }) {
  const t = useT()
  const { enabled, properties, autoplay, delayMs, effect } = use(promise)
  const fade = effect === 'FADE'

  const [viewport, embla] = useEmblaCarousel(
    {
      align: 'start',
      /*
        Con paso automático el bucle sí: llegar al final y quedarse parado deja
        el carrusel muerto sin que nadie sepa por qué. Sin paso automático no,
        porque quien pulsa la flecha espera que el final sea el final.

        En modo fundido las diapositivas se apilan, así que va de una en una.
      */
      loop: autoplay,
      slidesToScroll: fade ? 1 : 'auto',
    },
    [
      ...(fade ? [Fade()] : []),
      ...(autoplay
        ? [
            Autoplay({
              delay: delayMs,
              // Si alguien está mirando una tarjeta, no se la quitamos de
              // debajo del ratón.
              stopOnMouseEnter: true,
              stopOnInteraction: false,
            }),
          ]
        : []),
    ],
  )
  const [selected, setSelected] = useState(0)
  const [snaps, setSnaps] = useState<number[]>([])

  const onSelect = useCallback(() => {
    if (!embla) return
    setSelected(embla.selectedScrollSnap())
  }, [embla])

  useEffect(() => {
    if (!embla) return
    setSnaps(embla.scrollSnapList())
    onSelect()
    embla.on('select', onSelect).on('reInit', onSelect)
  }, [embla, onSelect])

  if (!enabled || !properties.length) return null

  return (
    <div className="relative">
      <div ref={viewport} className="overflow-hidden">
        {/*
          El hueco entre tarjetas va por dentro, no con `gap`.

          Con `gap-5`, tres tarjetas de `basis-1/3` suman el 100% del visor MAS
          los dos huecos de 20 px: la tercera sobresalia 40 px y se veia cortada
          por la derecha a cualquier ancho. Con margen negativo en el carril y
          relleno en cada tarjeta, el tercio sigue siendo un tercio exacto y la
          separacion se pinta por dentro.
        */}
        <div className={cn('flex', !fade && '-ml-5')}>
          {properties.map((property, index) => (
            <div
              key={property.id}
              className={cn(
                'min-w-0 shrink-0 grow-0',
                fade
                  ? 'basis-full'
                  : 'basis-full pl-5 sm:basis-1/2 lg:basis-1/3',
              )}
            >
              <PropertyCard property={property} priority={index < 3} />
            </div>
          ))}
        </div>
      </div>

      {snaps.length > 1 && (
        <>
          <Arrow
            side="left"
            disabled={selected === 0}
            onClick={() => embla?.scrollPrev()}
          />
          <Arrow
            side="right"
            disabled={selected === snaps.length - 1}
            onClick={() => embla?.scrollNext()}
          />

          <PuntosCarrusel
            total={snaps.length}
            activo={selected}
            onIr={(i) => embla?.scrollTo(i)}
            tono="oscuro"
            etiqueta={(index) =>
              t('property.carousel.go_to_group', { index })
            }
            className="mt-3"
          />
        </>
      )}
    </div>
  )
}

function Arrow({
  side,
  disabled,
  onClick,
}: {
  side: 'left' | 'right'
  disabled: boolean
  onClick: () => void
}) {
  const t = useT()
  const Icon = side === 'left' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={
        side === 'left'
          ? t('property.carousel.previous')
          : t('property.carousel.next')
      }
      className={cn(
        // Fuera de la caja en pantallas anchas, encima en las estrechas: en
        // movil no sobra margen para sacarlas.
        'absolute top-1/2 z-10 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full border bg-background shadow-md transition-opacity sm:flex',
        side === 'left' ? '-left-4' : '-right-4',
        disabled && 'pointer-events-none opacity-0',
      )}
    >
      <Icon className="size-4" />
    </button>
  )
}
