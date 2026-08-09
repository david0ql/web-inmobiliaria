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
 * Las fotos de la unidad elegida, en pequeño.
 *
 * Arriba de la pagina va una sola foto, la del proyecto: es la que dice donde
 * estas y no cambia al cambiar de unidad. Estas son otra cosa —el interior
 * concreto del apartamento que se esta mirando— y por eso van aqui abajo,
 * pegadas al desplegable que las decide y en tamaño de miniatura: acompañan a
 * la eleccion, no compiten con ella.
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

  return (
    <section>
      <h2 className="mb-3 flex items-baseline gap-2 text-xs font-bold tracking-widest uppercase">
        Fotos de la unidad
        <span className="tabular text-[11px] font-normal text-muted-foreground">
          {images.length}
        </span>
      </h2>

      {/*
        Una fila que se desplaza en lugar de una rejilla que crece: con veintidos
        fotos, una rejilla de miniaturas ocupa media pantalla y separa el
        desplegable del precio, que es lo que tiene que quedar junto.
      */}
      <ul className="flex gap-2 overflow-x-auto pb-1">
        {images.map((image, index) => (
          <li key={image.id}>
            <button
              type="button"
              onClick={() => setAbierta(index)}
              aria-label={`Ampliar foto ${index + 1} de ${images.length}`}
              className="group relative block size-20 shrink-0 overflow-hidden rounded-md border transition-opacity hover:opacity-90 sm:size-24"
            >
              <img
                src={image.url}
                alt=""
                loading="lazy"
                className="size-full object-cover"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <Expand className="size-4 text-white" aria-hidden="true" />
              </span>
            </button>
          </li>
        ))}
      </ul>

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
