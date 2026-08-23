import { Expand } from 'lucide-react'
import { useState } from 'react'

import { Lightbox } from '@/components/common/lightbox'
import { useT } from '@/lib/i18n'
import type { PropertyImage } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * Las fotos de la unidad elegida, en mosaico.
 *
 * Arriba de la pagina va una sola foto, la del proyecto: es la que dice donde
 * estas y no cambia al cambiar de unidad. Estas son otra cosa —el interior
 * concreto del apartamento que se esta mirando— y por eso van aqui abajo,
 * pegadas al desplegable que las decide.
 *
 * Al pulsar cualquiera se abren a pantalla completa, que es donde de verdad se
 * miran unas fotos, con flechas y con las teclas del cursor.
 */
export function UnitPhotos({
  images,
  title,
}: {
  images: PropertyImage[]
  title: string
}) {
  const t = useT()
  const [abierta, setAbierta] = useState<number | null>(null)

  if (!images.length) return null

  const total = images.length

  /*
    La rejilla depende de cuantas fotos haya.

    Con una plantilla fija de cinco casillas, un inmueble con una sola foto la
    metia en una casilla de un cuarto de ancho y el resto quedaba en blanco: la
    unica foto que hay, diminuta. Y con dos, dos recortes perdidos.

    Asi que la forma se elige segun el numero:

      1  una foto a todo lo ancho
      2  dos, mitad y mitad
      3  una grande a la izquierda y dos apiladas a la derecha
      4  cuatro iguales, dos por dos
      5+ una grande a la izquierda y cuatro pequeñas a la derecha

    En movil siempre manda la primera a todo el ancho y debajo caben dos: cuatro
    recortes de 80 px en un telefono no enseñan una cocina.
  */
  const mosaico = images.slice(0, total === 4 ? 4 : 5)
  const forma = Math.min(total, 5)

  /*
    El alto es el mismo en todas las formas —y en escritorio, el de la columna
    de al lado— para que las dos mitades de la rejilla terminen en la misma
    linea. Con altos distintos, la columna corta dejaba un hueco blanco debajo
    que se leia como algo sin terminar.
  */
  const rejilla = {
    1: 'grid-cols-1 h-[240px] sm:h-[380px] lg:h-full',
    2: 'grid-cols-2 h-[200px] sm:h-[300px] lg:h-full',
    3: 'grid-cols-2 grid-rows-2 h-[260px] sm:grid-cols-4 sm:h-[340px] lg:h-full',
    4: 'grid-cols-2 grid-rows-2 h-[260px] sm:h-[380px] lg:h-full',
    5: 'grid-cols-2 grid-rows-2 h-[260px] sm:grid-cols-4 sm:h-[340px] lg:h-full',
  }[forma]

  /** Cuanto ocupa cada casilla, segun la forma que toque. */
  const tramo = (index: number) => {
    if (forma <= 2) return null
    if (forma === 4) return null
    if (index === 0) return 'col-span-2 sm:row-span-2'
    // Con tres fotos, las dos pequeñas ocupan media rejilla cada una.
    return forma === 3 ? 'sm:col-span-2' : null
  }

  return (
    <section className="lg:h-full">
      {/*
        Sin rotulo: una rejilla de fotos debajo del desplegable de unidades no
        necesita que le digan que son fotos. El titulo queda para quien navega
        con lector de pantalla, que si necesita saber donde empieza el bloque.
      */}
      <h2 className="sr-only">{t('project.unit.photos.title')}</h2>

      <div className={cn('grid gap-2', rejilla)}>
        {mosaico.map((image, index) => {
          const grande = index === 0 && forma > 2

          return (
            <button
              key={image.id}
              type="button"
              onClick={() => setAbierta(index)}
              aria-label={t('gallery.photo.zoom', {
                index: index + 1,
                total,
              })}
              className={cn(
                'group relative min-h-0 cursor-zoom-in overflow-hidden rounded-md border',
                tramo(index),
                // Las que no caben en un telefono.
                forma === 5 && index > 2 && 'hidden sm:block',
              )}
            >
              <img
                src={grande || forma === 1 ? image.urlLarge : image.url}
                alt=""
                loading={index === 0 ? 'eager' : 'lazy'}
                className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
              />

              <span className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity group-hover:opacity-100">
                <Expand className="size-5 text-white" aria-hidden="true" />
              </span>

              {index === 0 && total > 1 && (
                /* El total va sobre la primera y no en la ultima casilla: la
                   ultima cambia con el ancho de la pantalla, el numero no. */
                <span className="tabular absolute bottom-3 left-3 rounded-full bg-black/70 px-3 py-1 text-xs text-white">
                  {t('gallery.photo.count', { total })}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <Lightbox
        images={images}
        index={abierta}
        onIndex={setAbierta}
        title={title}
      />
    </section>
  )
}

