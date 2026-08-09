import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect } from 'react'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import type { PropertyImage } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * Una foto a pantalla completa, con flechas y teclado.
 *
 * Vive aparte porque lo pide toda foto que se pueda pulsar: la galeria de la
 * ficha, la portada del proyecto y el mosaico de la unidad. Tres visores
 * distintos serian tres formas distintas de cerrar y de pasar de foto, y quien
 * ya aprendio una espera la misma en las demas.
 *
 * `object-contain` y no `cover`: aqui se viene a ver la foto entera. Recortarla
 * es lo que hace la miniatura para que cuadre la rejilla, no lo que se quiere
 * cuando alguien la ha ampliado a proposito.
 */
export function Lightbox({
  images,
  index,
  onIndex,
  title,
}: {
  images: PropertyImage[]
  /** `null` con el visor cerrado. */
  index: number | null
  onIndex: (index: number | null) => void
  title: string
}) {
  const mover = useCallback(
    (paso: number) => {
      if (index === null || !images.length) return
      onIndex((index + paso + images.length) % images.length)
    },
    [index, images.length, onIndex],
  )

  // Las flechas del cursor: con una foto a pantalla completa es el gesto que
  // sale solo. Escape ya lo maneja el propio dialogo.
  useEffect(() => {
    if (index === null) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') mover(1)
      if (event.key === 'ArrowLeft') mover(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, mover])

  const foto = index === null ? null : images[index]

  return (
    <Dialog
      open={index !== null}
      onOpenChange={(open) => !open && onIndex(null)}
    >
      <DialogContent className="max-w-6xl border-none bg-transparent p-0 shadow-none">
        <DialogTitle className="sr-only">
          {title} · foto {(index ?? 0) + 1} de {images.length}
        </DialogTitle>

        {foto && (
          <div className="relative">
            <img
              src={foto.urlOriginal ?? foto.urlLarge}
              alt={foto.description ?? `${title} · foto ${(index ?? 0) + 1}`}
              className="max-h-[85vh] w-full rounded-lg object-contain"
            />

            {images.length > 1 && (
              <>
                <Flecha lado="left" onClick={() => mover(-1)} />
                <Flecha lado="right" onClick={() => mover(1)} />
                <span className="tabular absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-xs text-white">
                  {(index ?? 0) + 1} / {images.length}
                </span>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
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
