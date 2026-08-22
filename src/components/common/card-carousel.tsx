import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef, useState, type MouseEvent, type ReactNode } from 'react'

import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/**
 * El carrusel de fotos que va DENTRO de una tarjeta del listado.
 *
 * Esta hecho a mano y no con embla a proposito: en una rejilla hay nueve o doce
 * tarjetas y cada instancia de embla monta sus medidas y sus observadores de
 * tamaño. Para tres o seis fotos que solo van de una en una, un `translateX` y
 * un contador cuestan mucho menos en el primer pintado, que es exactamente
 * donde se juega el LCP de la portada. Embla sigue siendo lo correcto en la
 * galeria de la ficha, donde hay una sola instancia y miniaturas que sincronizar.
 *
 * Dos cosas que no son decorativas:
 *
 * - La tarjeta entera es un enlace a la ficha, asi que todos los controles
 *   cortan el evento (`preventDefault` + `stopPropagation`). Pulsar una flecha
 *   mueve la foto; no abre la ficha.
 * - Solo se pinta el `<img>` de las fotos por las que se ha pasado. Montar las
 *   seis de cada tarjeta al entrar seria bajarse el catalogo entero de la
 *   portada para enseñar una foto.
 */
export function CardCarousel({
  total,
  renderSlide,
}: {
  total: number
  /** `cargada` dice si toca pintar el `<img>` o dejar el hueco. */
  renderSlide: (index: number, cargada: boolean) => ReactNode
}) {
  const t = useT()
  const [activo, setActivo] = useState(0)
  const [cargadas, setCargadas] = useState(() => new Set([0]))
  /** Donde empezo el dedo, para saber si el gesto fue un deslizamiento. */
  const gesto = useRef<{ x: number; y: number } | null>(null)

  const ir = (indice: number) => {
    /* Da la vuelta. Con tres fotos, una flecha apagada en el extremo se lee
       como que el carrusel esta roto mas que como que se acabo. */
    const siguiente = (indice + total) % total
    setActivo(siguiente)
    setCargadas((previas) =>
      previas.has(siguiente) ? previas : new Set(previas).add(siguiente),
    )
  }

  /* El enlace envuelve la zona de la foto: sin esto, tocar una flecha navegaria. */
  const control = (evento: MouseEvent, accion: () => void) => {
    evento.preventDefault()
    evento.stopPropagation()
    accion()
  }

  return (
    <div
      className="relative size-full"
      /* Vertical para la pagina, horizontal para nosotros. */
      style={{ touchAction: 'pan-y' }}
      onTouchStart={(evento) => {
        const dedo = evento.touches[0]
        gesto.current = { x: dedo.clientX, y: dedo.clientY }
      }}
      onTouchEnd={(evento) => {
        const inicio = gesto.current
        gesto.current = null
        if (!inicio) return
        const dedo = evento.changedTouches[0]
        const dx = dedo.clientX - inicio.x
        const dy = dedo.clientY - inicio.y
        /* Umbral, y mas horizontal que vertical: quien baja la pagina con el
           pulgar apoyado en la foto no queria cambiar de foto. */
        if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return
        /* Corta el clic sintetico del final del gesto: deslizar no navega. */
        evento.preventDefault()
        ir(activo + (dx < 0 ? 1 : -1))
      }}
    >
      <div
        className="flex size-full transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${activo * 100}%)` }}
      >
        {Array.from({ length: total }, (_, indice) => (
          <div
            key={indice}
            /* El hueco tiene que ocupar su ancho aunque no tenga foto, o el
               resto de diapositivas se corren. */
            className="h-full min-w-0 shrink-0 grow-0 basis-full"
          >
            {renderSlide(indice, cargadas.has(indice))}
          </div>
        ))}
      </div>

      <Flecha lado="left" onClick={(e) => control(e, () => ir(activo - 1))} />
      <Flecha lado="right" onClick={(e) => control(e, () => ir(activo + 1))} />

      {/*
        Los puntos se ven de 8 px pero el boton mide 24: en un movil no se
        acierta a un punto de 8, y el area va por dentro para que los puntos no
        se separen entre si.
      */}
      <div className="absolute inset-x-0 bottom-0.5 z-20 flex justify-center">
        {Array.from({ length: total }, (_, indice) => (
          <button
            key={indice}
            type="button"
            onClick={(e) => control(e, () => ir(indice))}
            aria-label={t('property.card.photo.go_to', {
              index: indice + 1,
              total,
            })}
            aria-current={indice === activo}
            className="flex size-6 items-center justify-center"
          >
            <span
              className={cn(
                'block size-2 rounded-full shadow-[0_0_2px_rgba(0,0,0,0.6)] transition-all',
                indice === activo ? 'w-4 bg-white' : 'bg-white/55',
              )}
            />
          </button>
        ))}
      </div>
    </div>
  )
}

function Flecha({
  lado,
  onClick,
}: {
  lado: 'left' | 'right'
  onClick: (evento: MouseEvent<HTMLButtonElement>) => void
}) {
  const t = useT()
  const Icono = lado === 'left' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        lado === 'left'
          ? t('property.card.photo.previous')
          : t('property.card.photo.next')
      }
      className={cn(
        /* Siempre a la vista donde no hay raton —en movil el hover no existe y
           unas flechas invisibles son unas flechas que no estan—, y al pasar
           por encima en escritorio, donde tapan la foto sin motivo. */
        'absolute top-1/2 z-20 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-foreground shadow-md transition-opacity hover:bg-white focus-visible:opacity-100 lg:opacity-0 lg:group-hover:opacity-100',
        lado === 'left' ? 'left-2' : 'right-2',
      )}
    >
      <Icono className="size-4" />
    </button>
  )
}
