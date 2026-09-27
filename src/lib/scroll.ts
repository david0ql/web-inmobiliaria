import { useCallback, useEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

import { vueloPendiente } from '@/lib/hero-map'

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

export function scrollToListTop(
  anchor: HTMLElement | null,
  /** Sin animar, para cuando otra animacion depende de que la pagina ya este quieta. */
  instantaneo = false,
): void {
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
      instantaneo ||
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
 * Al llegar a una lista, dejarla encuadrada de entrada.
 *
 * `useSmoothScrollTop` sube al top en cada navegacion, y en el buscador eso
 * deja la pantalla en el formulario de filtros: quien acaba de pedir unos
 * resultados tiene que bajar a mano para verlos. Esto los coloca justo debajo
 * de la cabecera —"Resultados de la busqueda" arriba, los filtros ya por
 * encima del borde— en cuanto la lista existe.
 *
 * Solo al ENTRAR, y nunca al volver atras: quien pulsa atras espera aparecer
 * donde estaba, no reencuadrado. Y una sola vez por navegacion, para que
 * ordenar o cambiar de pagina siga siendo cosa de `useListAnchor`.
 */
export function useSettleOnList(anchor: HTMLElement | null, listo: boolean): void {
  const { key } = useLocation()
  const navigationType = useNavigationType()
  const hecho = useRef<string | null>(null)

  useEffect(() => {
    if (!listo || !anchor) return
    if (navigationType === 'POP') return
    if (hecho.current === key) return
    hecho.current = key

    /*
      Dos cuadros de espera, no uno: el primero pinta la lista y el segundo deja
      que el mapa mida su caja. Midiendo antes, el ancla estaba donde iba a
      estar el hueco vacio y el encuadre salia corto.
    */
    /*
      Con un vuelo del mapa en marcha, el encuadre es instantaneo.

      El clon aterriza midiendo la caja del mapa de destino, y una pagina
      desplazandose suavemente mueve esa caja mientras se mide: el clon caia un
      par de dedos por debajo de su sitio. Colocando la pagina de golpe —antes de
      que el vuelo mida— las dos cosas coinciden, y lo que se ve es un mapa que
      va a su hueco mientras la pagina ya esta quieta.
    */
    requestAnimationFrame(() =>
      requestAnimationFrame(() => scrollToListTop(anchor, vueloPendiente())),
    )
  }, [anchor, listo, key, navigationType])
}

/**
 * Qué hace la vista al cambiar de página.
 *
 * Sustituye a `ScrollRestoration` de React Router, que no se puede matizar: sube
 * al top de golpe SIEMPRE y en el mismo efecto, así que cualquier intento de
 * suavizarlo desde fuera llega tarde —el efecto del padre corre después del
 * hijo y ya estás arriba—.
 *
 * Hacia delante sube con suavidad: en una aplicación de una sola página nada le
 * dice al visitante que ha cambiado de sitio, y ver el desplazamiento lo dice.
 * Hacia atrás devuelve a donde estabas, que es lo que espera quien vuelve a una
 * lista de resultados a mitad.
 *
 * `prefers-reduced-motion` se respeta: para quien lo tenga activado el
 * desplazamiento no es un detalle bonito, es un mareo.
 */
export function useSmoothScrollTop(): void {
  const { key } = useLocation()
  const navigationType = useNavigationType()

  // Guarda dónde se queda cada entrada del historial. La limpieza corre justo
  // antes de que cambie la clave, o sea al salir de esa página.
  useEffect(() => {
    return () => {
      try {
        sessionStorage.setItem(`scroll:${key}`, String(window.scrollY))
      } catch {
        // Sin almacenamiento simplemente no se recuerda.
      }
    }
  }, [key])

  useEffect(() => {
    if (navigationType === 'POP') {
      const guardado = Number(sessionStorage.getItem(`scroll:${key}`) ?? 0)
      // Dos cuadros: el contenido diferido todavía no ha pintado y sin altura
      // no hay a dónde volver.
      requestAnimationFrame(() =>
        requestAnimationFrame(() =>
          window.scrollTo({ top: guardado, behavior: 'auto' }),
        ),
      )
      return
    }

    if (window.scrollY === 0) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }, [key, navigationType])
}
