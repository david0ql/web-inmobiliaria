import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/**
 * Los puntos de un carrusel, como maximo cinco.
 *
 * Un punto por diapositiva solo funciona mientras hay pocas. Con seis fotos en
 * una tarjeta la fila de puntos se come el ancho de la foto, y en el movil —donde
 * el carrusel de la portada va de una en una— quince puntos de 8 px pegados no
 * son un indicador: son una linea gris que no dice ni donde estas ni cuanto
 * queda.
 *
 * Cinco es el tope porque es lo que se lee de un vistazo sin contar, y es lo que
 * hacen iOS y Airbnb por el mismo motivo. Pasado el tope los puntos dejan de ser
 * uno por diapositiva y pasan a ser una ventana que se desplaza: los extremos se
 * quedan quietos —el primero y el ultimo punto siempre significan "principio" y
 * "final"— y el activo se mueve por dentro. Asi el indicador sigue contando algo
 * cierto: a que altura del carrusel estas.
 *
 * Los puntos de los bordes se dibujan mas pequeños cuando hay mas por detras.
 * Es la señal de que la fila esta recortada; sin ella, un carrusel de quince
 * fotos y uno de cinco se ven exactamente igual.
 */

/** Cuantos puntos caben sin que haya que contarlos. */
const TOPE = 5

export function PuntosCarrusel({
  total,
  activo,
  onIr,
  /** Claro sobre la foto, oscuro sobre el fondo de la pagina. */
  tono = 'claro',
  etiqueta,
  className,
}: {
  total: number
  activo: number
  onIr: (indice: number, evento: React.MouseEvent<HTMLButtonElement>) => void
  tono?: 'claro' | 'oscuro'
  /** Como se nombra cada punto al lector de pantalla. */
  etiqueta: (indice: number, total: number) => string
  className?: string
}) {
  const t = useT()
  const ventana = Math.min(total, TOPE)

  /*
    Donde empieza la ventana. Se centra en el activo y se topa en los extremos,
    de modo que el primer y el ultimo punto son siempre alcanzables y la ventana
    no se sale por ningun lado.
  */
  const inicio = Math.max(
    0,
    Math.min(activo - Math.floor(ventana / 2), total - ventana),
  )

  return (
    <div
      className={cn('flex justify-center', className)}
      role="tablist"
      aria-label={t('property.carousel.dots')}
    >
      {Array.from({ length: ventana }, (_, posicion) => {
        const indice = inicio + posicion
        const seleccionado = indice === activo
        /* Hay mas carrusel por detras de este punto: se dibuja menguado. */
        const recortado =
          (posicion === 0 && inicio > 0) ||
          (posicion === ventana - 1 && inicio + ventana < total)

        return (
          <button
            key={indice}
            type="button"
            role="tab"
            onClick={(evento) => onIr(indice, evento)}
            aria-label={etiqueta(indice + 1, total)}
            aria-selected={seleccionado}
            className="group flex size-6 items-center justify-center"
          >
            <span
              className={cn(
                'block rounded-full transition-all',
                recortado ? 'size-1.5' : 'size-2',
                seleccionado && 'w-4',
                tono === 'claro'
                  ? cn(
                      'shadow-[0_0_2px_rgba(0,0,0,0.6)]',
                      seleccionado ? 'bg-white' : 'bg-white/55',
                    )
                  : seleccionado
                    ? 'bg-foreground'
                    : 'bg-muted-foreground/35 group-hover:bg-muted-foreground/60',
              )}
            />
          </button>
        )
      })}
    </div>
  )
}
