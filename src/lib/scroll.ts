import { useCallback, useEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

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

/**
 * Al cambiar de página, sube arriba con suavidad.
 *
 * `ScrollRestoration` de React Router ya sube, pero de golpe: la página nueva
 * aparece ya arriba y no se percibe el movimiento. Con el desplazamiento se ve
 * que ha cambiado de sitio, que es justo lo que una aplicación de una sola
 * página no le comunica al visitante.
 *
 * Solo al navegar hacia delante (`PUSH`). Con "atrás" manda `ScrollRestoration`,
 * que devuelve a donde estabas — subir arriba ahí sería perder el sitio.
 *
 * Y se respeta `prefers-reduced-motion`: para quien lo tenga activado el
 * desplazamiento no es un detalle bonito, es un mareo.
 */
export function useSmoothScrollTop(): void {
  const { pathname } = useLocation()
  const navigationType = useNavigationType()

  useEffect(() => {
    if (navigationType !== 'PUSH') return
    if (window.scrollY === 0) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }, [pathname, navigationType])
}
