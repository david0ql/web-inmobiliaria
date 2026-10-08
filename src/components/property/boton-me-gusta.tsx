import { Heart } from 'lucide-react'
import { useState, type MouseEvent } from 'react'
import { toast } from 'sonner'

import { alternarMeGusta, useMeGusta } from '@/lib/me-gusta'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/**
 * El corazon de una ficha.
 *
 * Arriba a la derecha de la foto, como en Airbnb — y no por copiar: es la unica
 * esquina libre (la de la izquierda la ocupa la etiqueta de disponibilidad) y es
 * donde la mano ya lo busca, porque es donde esta en todos los sitios donde se
 * elige algo mirando fotos.
 *
 * Tres detalles que no son decorativos:
 *
 * - **Corta el evento.** La foto entera es un enlace a la ficha; sin
 *   `preventDefault` y `stopPropagation`, marcar abriria el inmueble.
 * - **El contorno blanco.** Va encima de una foto cualquiera, que puede ser
 *   clara o oscura: un corazon gris sobre una fachada blanca no se ve. El relleno
 *   semitransparente y el trazo blanco lo hacen legible sobre las dos.
 * - **El rebote.** Marcar es la unica accion de la tarjeta que no lleva a otra
 *   pantalla, asi que si no se mueve nada parece que no funciono. Dura 220 ms y
 *   se cancela solo.
 */
export function BotonMeGusta({
  code,
  className,
}: {
  code: string
  className?: string
}) {
  const t = useT()
  const marcados = useMeGusta()
  const [rebotando, setRebotando] = useState(false)
  const marcado = marcados.has(code)

  const pulsar = (evento: MouseEvent) => {
    evento.preventDefault()
    evento.stopPropagation()

    /* Solo al marcar: quitar no se celebra. */
    if (!marcado) {
      setRebotando(true)
      window.setTimeout(() => setRebotando(false), 220)
    }

    void alternarMeGusta(code).then((bien) => {
      if (!bien) toast.error(t('property.like.failed'))
    })
  }

  return (
    <button
      type="button"
      onClick={pulsar}
      aria-pressed={marcado}
      aria-label={marcado ? t('property.like.remove') : t('property.like.add')}
      title={marcado ? t('property.like.remove') : t('property.like.add')}
      className={cn(
        'flex size-8 items-center justify-center rounded-full transition-transform',
        'hover:scale-110 active:scale-95',
        rebotando && 'scale-125',
        className,
      )}
    >
      <Heart
        className={cn(
          'size-[22px] transition-colors',
          marcado
            ? 'fill-red-500 stroke-white'
            : 'fill-black/25 stroke-white hover:fill-black/40',
        )}
        strokeWidth={2}
      />
    </button>
  )
}
