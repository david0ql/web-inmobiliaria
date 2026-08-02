/**
 * La portada del inmueble, escrita en el HTML por la API.
 *
 * El armazon que sirve nginx para una ficha lleva la foto principal ya
 * resuelta (ver `render.service.ts`). Sin esto, el esqueleto pintaba un
 * rectangulo gris y la foto —que el navegador ya tenia descargada, gracias al
 * `preload`— no aparecia hasta que la API contestaba: medio segundo mirando un
 * hueco vacio con la imagen esperando en la cache.
 *
 * Solo vale para la primera ficha que se abre. Al navegar dentro del sitio no
 * hay HTML nuevo, asi que se descarta en cuanto se usa.
 */
export interface FichaInyectada {
  code: string
  url: string
  srcset: string
  alt: string
}

declare global {
  interface Window {
    __ficha?: FichaInyectada
  }
}

/** La portada inyectada, si es la de este inmueble. */
export function portadaInyectada(code: string): FichaInyectada | null {
  const ficha = typeof window === 'undefined' ? undefined : window.__ficha
  return ficha && ficha.code === code ? ficha : null
}
