import { ChevronLeft, ChevronRight, Expand } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
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
  const [abierta, setAbierta] = useState<number | null>(null)

  const mover = useCallback(
    (paso: number) =>
      setAbierta((actual) =>
        actual === null
          ? actual
          : (actual + paso + images.length) % images.length,
      ),
    [images.length],
  )

  // Las flechas del teclado: con una foto a pantalla completa es el gesto que
  // sale solo, y el dialogo ya se cierra con Escape.
  useEffect(() => {
    if (abierta === null) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') mover(1)
      if (event.key === 'ArrowLeft') mover(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [abierta, mover])

  if (!images.length) return null

  const foto = abierta === null ? null : images[abierta]

  const total = images.length
  const mosaico = images.slice(0, 5)

  return (
    <section>
      {/*
        Sin rotulo: una rejilla de fotos debajo del desplegable de unidades no
        necesita que le digan que son fotos. El titulo queda para quien navega
        con lector de pantalla, que si necesita saber donde empieza el bloque.
      */}
      <h2 className="sr-only">Fotos de la unidad</h2>

      {/*
        Mosaico: una foto manda y las demas acompañan, que es como se mira un
        inmueble. Con todas del mismo tamaño no hay nada que mirar primero.

        En escritorio la grande ocupa la mitad izquierda —dos columnas por dos
        filas— y cuatro pequeñas llenan la derecha. En movil la grande cruza el
        ancho y debajo caben dos: las otras dos se ocultan porque cuatro
        recortes de 80 px en un telefono no enseñan una cocina.

        Y el total va en una pastilla sobre la grande, no en la ultima casilla:
        la ultima casilla cambia con el ancho de la pantalla, y el numero de
        fotos no.
      */}
      <div className="grid h-[260px] grid-cols-2 grid-rows-2 gap-2 sm:h-[340px] sm:grid-cols-4">
        {mosaico.map((image, index) => {
          const grande = index === 0 && mosaico.length > 1

          return (
            <button
              key={image.id}
              type="button"
              onClick={() => setAbierta(index)}
              aria-label={`Ampliar foto ${index + 1} de ${total}`}
              className={cn(
                'group relative min-h-0 overflow-hidden rounded-md border',
                grande && 'col-span-2 sm:row-span-2',
                // Las dos ultimas solo donde hay sitio para que se vean.
                index > 2 && 'hidden sm:block',
              )}
            >
              <img
                src={grande ? (image.urlLarge ?? image.url) : image.url}
                alt=""
                loading={index === 0 ? 'eager' : 'lazy'}
                className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
              />

              <span className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity group-hover:opacity-100">
                <Expand className="size-5 text-white" aria-hidden="true" />
              </span>

              {grande && total > 1 && (
                <span className="tabular absolute bottom-3 left-3 rounded-full bg-black/70 px-3 py-1 text-xs text-white">
                  {total} fotos
                </span>
              )}
            </button>
          )
        })}
      </div>

      <Dialog
        open={abierta !== null}
        onOpenChange={(open) => !open && setAbierta(null)}
      >
        <DialogContent className="max-w-5xl border-none bg-transparent p-0 shadow-none">
          <DialogTitle className="sr-only">
            {title} · foto {(abierta ?? 0) + 1} de {images.length}
          </DialogTitle>

          {foto && (
            <div className="relative">
              <img
                src={foto.urlLarge ?? foto.url}
                alt={`${title} · foto ${(abierta ?? 0) + 1}`}
                className="max-h-[80vh] w-full rounded-lg object-contain"
              />

              {images.length > 1 && (
                <>
                  <Flecha lado="left" onClick={() => mover(-1)} />
                  <Flecha lado="right" onClick={() => mover(1)} />
                  <span className="tabular absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-xs text-white">
                    {(abierta ?? 0) + 1} / {images.length}
                  </span>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}

function Flecha({
  lado,
  onClick,
}: {
  lado: 'left' | 'right'
  onClick: () => void
}) {
  const Icon = lado === 'left' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={lado === 'left' ? 'Foto anterior' : 'Foto siguiente'}
      className={cn(
        'absolute top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 shadow-md transition-colors hover:bg-background',
        lado === 'left' ? 'left-3' : 'right-3',
      )}
    >
      <Icon className="size-5" />
    </button>
  )
}
