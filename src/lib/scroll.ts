import { useCallback, useRef } from 'react'

/**
 * Llevar la vista al arranque de una lista al cambiar de pagina.
 *
 * Por defecto el navegador — y `ScrollRestoration` de React Router — mandan al
 * top del documento. En la busqueda eso deja al visitante mirando otra vez el
 * formulario de filtros, con los resultados que acaba de pedir fuera de
 * pantalla; en movil, donde la cabecera y los filtros ocupan casi todo el alto,
 * es peor todavia.
 *
 * No se usa `scrollIntoView`: la cabecera del sitio es `sticky`, asi que hay que
 * descontar su alto a mano o tapa las primeras tarjetas.
 */

/** Aire entre la cabecera fija y lo primero de la lista. */
const GAP = 12

function stickyOffset(): number {
  const header = document.querySelector<HTMLElement>('[data-site-header]')
  return (header?.offsetHeight ?? 0) + GAP
}

export function scrollToListTop(anchor: HTMLElement | null): void {
  if (!anchor) return

  const top = Math.max(
    anchor.getBoundingClientRect().top + window.scrollY - stickyOffset(),
    0,
  )
  const distance = Math.abs(top - window.scrollY)

  window.scrollTo({
    top,
    /*
     * Animar el recorrido ayuda a entender que la lista se recargo — pero solo
     * si es corto. Desde el pie de la pagina 27 el trayecto son varias
     * pantallas y la animacion se vuelve un viaje: ahi se salta en seco. Lo
     * mismo si el sistema pide menos movimiento.
     */
    behavior:
      distance > window.innerHeight * 2 ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
  })
}

/**
 * `[ref, scroll]`: cuelga el `ref` del elemento que abre la lista y llama a
 * `scroll()` cuando cambies de pagina.
 */
export function useListAnchor<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null)

  const scroll = useCallback(() => {
    // Al pulsar, React todavia no ha pintado la pagina nueva. Se espera un
    // frame para medir sobre el layout definitivo.
    requestAnimationFrame(() => scrollToListTop(ref.current))
  }, [])

  return [ref, scroll] as const
}
