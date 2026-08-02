import { useEffect, useState } from 'react'

/**
 * Devuelve `true` cuando la pagina ya ha terminado de cargar y el hilo
 * principal esta libre.
 *
 * Es para lo caro que no es urgente: los mapas. Montarlos en el primer render
 * les pone por delante de la foto del inmueble, que es lo que el visitante esta
 * mirando; montarlos solo al hacer scroll o al pulsar significa que a veces no
 * aparecen. Esperar a que la pagina este quieta da las dos cosas.
 *
 * El `timeout` es el seguro: `requestIdleCallback` puede no llegar a dispararse
 * nunca en una pagina que no para quieta, y un mapa que no aparece no es una
 * optimizacion.
 */
export function useCuandoOcioso(esperaMs = 1500): boolean {
  const [ocioso, setOcioso] = useState(false)

  useEffect(() => {
    let cancelar: () => void

    const arrancar = () => {
      if (typeof window.requestIdleCallback === 'function') {
        const id = window.requestIdleCallback(() => setOcioso(true), {
          timeout: esperaMs,
        })
        cancelar = () => window.cancelIdleCallback(id)
      } else {
        // Safari todavia no lo trae.
        const id = window.setTimeout(() => setOcioso(true), 300)
        cancelar = () => window.clearTimeout(id)
      }
    }

    if (document.readyState === 'complete') {
      arrancar()
      return () => cancelar?.()
    }

    window.addEventListener('load', arrancar, { once: true })
    return () => {
      window.removeEventListener('load', arrancar)
      cancelar?.()
    }
  }, [esperaMs])

  return ocioso
}
