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

/**
 * La portada inyectada, si es la de este inmueble.
 *
 * Viene en un `meta` y no en un `<script>` porque la politica de seguridad de
 * la API no permite scripts en linea. Se lee una sola vez: al navegar dentro
 * del sitio el `meta` sigue ahi, pero ya es de otra ficha.
 */
let leido: FichaInyectada | null | undefined

export function portadaInyectada(code: string): FichaInyectada | null {
  if (leido === undefined) {
    const meta = document.head.querySelector<HTMLMetaElement>(
      'meta[name="ficha:portada"]',
    )
    try {
      leido = meta ? (JSON.parse(meta.content) as FichaInyectada) : null
    } catch {
      leido = null
    }
  }
  return leido && leido.code === code ? leido : null
}
