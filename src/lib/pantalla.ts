import { useEffect, useState } from 'react'

/**
 * Si la pantalla es estrecha, medido de verdad y no adivinado.
 *
 * Hay cosas que no se pueden resolver con CSS porque no son un cambio de
 * aspecto sino de ESTRUCTURA: el buscador, por ejemplo, pinta los mismos diez
 * campos dentro de una rejilla o dentro de una hoja a pantalla completa, y
 * pintarlos en los dos sitios para enseñar uno y esconder el otro duplicaria
 * identificadores y estado.
 *
 * El valor inicial se lee de forma sincrona, no en un efecto. Leyendolo despues,
 * el primer pintado siempre sale en la version ancha y en un telefono se ve el
 * formulario entero durante un cuadro antes de replegarse — un parpadeo que se
 * nota justo en lo primero que aparece de la pagina.
 *
 * 576px es el `sm` de Tailwind y el breakpoint del tema del que viene el sitio.
 */
export function usePantallaEstrecha(maxima = 575): boolean {
  const consulta = `(max-width: ${maxima}px)`
  const [estrecha, setEstrecha] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(consulta).matches,
  )

  useEffect(() => {
    const media = window.matchMedia(consulta)
    const actualizar = () => setEstrecha(media.matches)
    actualizar()
    media.addEventListener('change', actualizar)
    return () => media.removeEventListener('change', actualizar)
  }, [consulta])

  return estrecha
}
