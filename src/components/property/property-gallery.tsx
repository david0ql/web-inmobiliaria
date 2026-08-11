import useEmblaCarousel from 'embla-carousel-react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { Lightbox } from '@/components/common/lightbox'
import { Badge } from '@/components/ui/misc'
import { AVAILABILITY_COLOR, AVAILABILITY_LABEL } from '@/lib/format'
import { useT } from '@/lib/i18n'
import type { Availability, PropertyImage } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * La galeria de la ficha. El tema usaba Fotorama (jQuery); esto es embla con la
 * tira de miniaturas sincronizada en los dos sentidos.
 *
 * Las fotos solo existen en tres anchos —560, 1600 y 2560— porque el importador
 * las recomprime a WebP y no hay redimensionado al vuelo, asi que el `sizes` se
 * escribe pensando en esos tres y no en un continuo.
 */
export function PropertyGallery({
  images,
  title,
  availability,
}: {
  images: PropertyImage[]
  title: string
  availability: Availability
}) {
  const t = useT()
  const [viewport, embla] = useEmblaCarousel({ loop: images.length > 1 })
  const [thumbsViewport, thumbs] = useEmblaCarousel({
    containScroll: 'keepSnaps',
    dragFree: true,
  })
  const [selected, setSelected] = useState(0)
  /*
    Que diapositivas llevan ya su `<img>`.

    Embla monta el carril entero, asi que sin esto las 14 fotos del inmueble se
    descargaban de golpe en cuanto contestaba la API: 300 kB y catorce
    decodificaciones peleandose con el hilo principal justo cuando toca pintar
    la portada. `loading="lazy"` no bastaba —el carril entra en el area visible
    aunque las fotos esten desplazadas fuera— asi que se decide aqui: la actual,
    la anterior y la siguiente. Lo demas llega al deslizar.
  */
  const [cargadas, setCargadas] = useState(() => new Set([0, 1]))
  /** Que foto se esta viendo a pantalla completa, o `null`. */
  const [ampliada, setAmpliada] = useState<number | null>(null)

  const onSelect = useCallback(() => {
    if (!embla) return
    const index = embla.selectedScrollSnap()
    setSelected(index)
    thumbs?.scrollTo(index)
    setCargadas((previas) => {
      const vecinas = [index - 1, index, index + 1].filter(
        (i) => i >= 0 && !previas.has(i),
      )
      if (!vecinas.length) return previas
      const siguientes = new Set(previas)
      for (const i of vecinas) siguientes.add(i)
      return siguientes
    })
  }, [embla, thumbs])

  useEffect(() => {
    if (!embla) return
    onSelect()
    embla.on('select', onSelect).on('reInit', onSelect)
  }, [embla, onSelect])

  if (!images.length) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-lg border bg-secondary text-sm text-muted-foreground sm:h-[480px]">
        {t('property.gallery.empty')}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative w-full overflow-hidden rounded-lg border bg-secondary">
        {/*
          `w-full` no es decorativo. El carril de embla es un flex y sus diapositivas
          van al 100%; si el visor no tiene un ancho definido, el 100% no se puede
          resolver y el navegador cae al ancho intrinseco de la foto —1600px— que
          arrastra la columna entera y desborda la pagina a lo ancho.
        */}
        <div ref={viewport} className="w-full overflow-hidden">
          <div className="flex">
            {images.map((image, index) => (
              <div
                key={image.id}
                className="min-w-0 shrink-0 grow-0 basis-full"
              >
                {!cargadas.has(index) ? (
                  // El hueco mantiene el ancho de la diapositiva: sin el, embla
                  // recalcula los saltos y la tira se descuadra.
                  <div
                    className="h-[320px] w-full bg-secondary sm:h-[480px]"
                    aria-hidden="true"
                  />
                ) : (
                  /*
                    La foto se pulsa para verla entera. En una ficha de inmueble
                    es lo primero que hace cualquiera: la del carrusel esta
                    recortada a 480 px de alto y muchas veces lo que se quiere
                    mirar —el fondo de la sala, la vista— esta justo en el
                    recorte.
                  */
                  <button
                    type="button"
                    onClick={() => setAmpliada(index)}
                    aria-label={t('property.gallery.zoom', {
                      index: index + 1,
                      total: images.length,
                    })}
                    className="block w-full cursor-zoom-in"
                  >
                  <img
                    src={image.urlLarge}
                    srcSet={[
                      `${image.url} 560w`,
                      image.urlMedium ? `${image.urlMedium} 800w` : '',
                      `${image.urlLarge} 1600w`,
                      `${image.urlOriginal} 2560w`,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                    sizes="(min-width: 1200px) 840px, (min-width: 992px) 60vw, 100vw"
                    alt={
                      image.description ??
                      t('property.gallery.photo_alt', {
                        title,
                        index: index + 1,
                      })
                    }
                    /* La portada entra en el LCP: esa se carga ya, el resto no. */
                    loading={index === 0 ? 'eager' : 'lazy'}
                    fetchPriority={index === 0 ? 'high' : undefined}
                    decoding="async"
                    className="h-[320px] w-full object-cover sm:h-[480px]"
                  />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="absolute top-3 left-3">
          <Badge
            variant="tag"
            style={{
              backgroundColor: AVAILABILITY_COLOR[availability] ?? '#767676',
            }}
          >
            {AVAILABILITY_LABEL[availability]
              ? t(AVAILABILITY_LABEL[availability])
              : availability}
          </Badge>
        </div>

        {images.length > 1 && (
          <>
            <GalleryArrow side="left" onClick={() => embla?.scrollPrev()} />
            <GalleryArrow side="right" onClick={() => embla?.scrollNext()} />
            <p className="tabular absolute right-3 bottom-3 rounded-full bg-black/65 px-2.5 py-1 text-xs text-white">
              {selected + 1} / {images.length}
            </p>
          </>
        )}
      </div>

      <Lightbox
        images={images}
        index={ampliada}
        onIndex={setAmpliada}
        title={title}
      />

      {images.length > 1 && (
        <div ref={thumbsViewport} className="w-full overflow-hidden">
          <div className="flex gap-2">
            {images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                onClick={() => embla?.scrollTo(index)}
                aria-label={t('property.gallery.go_to_photo', {
                  index: index + 1,
                })}
                aria-current={index === selected}
                className={cn(
                  'h-16 w-[90px] shrink-0 overflow-hidden rounded-md border-2 transition-opacity',
                  index === selected
                    ? 'border-primary'
                    : 'border-transparent opacity-60 hover:opacity-100',
                )}
              >
                <img
                  src={image.url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function GalleryArrow({
  side,
  onClick,
}: {
  side: 'left' | 'right'
  onClick: () => void
}) {
  const t = useT()
  const Icon = side === 'left' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        side === 'left'
          ? t('property.gallery.previous')
          : t('property.gallery.next')
      }
      className={cn(
        'absolute top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-foreground shadow-md transition-colors hover:bg-white',
        side === 'left' ? 'left-3' : 'right-3',
      )}
    >
      <Icon className="size-5" />
    </button>
  )
}
