import { useEffect, useState, useSyncExternalStore } from 'react'

import { getClient, refresh, subscribe, type PortalClient } from './portal'

/**
 * La sesión del portal, para los componentes.
 *
 * `useSyncExternalStore` y no un contexto: el token vive fuera de React a
 * propósito —ver `portal.ts`— y esto es solo la ventana para mirarlo.
 */
export function usePortalClient(): PortalClient | null {
  return useSyncExternalStore(subscribe, getClient, () => null)
}

/**
 * Recupera la sesión al cargar la página.
 *
 * El access token solo vive en memoria, así que una recarga lo pierde. La
 * cookie `httpOnly` sigue ahí: se pide un token nuevo con ella y, si el
 * navegador no la tiene o caducó, simplemente no hay sesión.
 *
 * `ready` distingue "todavía preguntando" de "no hay sesión": sin eso, la
 * pantalla parpadearía con el formulario de entrada durante un instante en cada
 * recarga de alguien que sí está dentro.
 */
export function usePortalSession(): {
  client: PortalClient | null
  ready: boolean
} {
  const client = usePortalClient()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true
    void refresh().finally(() => {
      if (alive) setReady(true)
    })
    return () => {
      alive = false
    }
  }, [])

  return { client, ready }
}

/** Carga un dato del portal, con su estado de error y recarga. */
export function usePortalData<T>(
  load: (signal?: AbortSignal) => Promise<T>,
  deps: unknown[] = [],
): { data: T | null; error: string | null; loading: boolean; reload: () => void } {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    load(controller.signal)
      .then((result) => {
        setData(result)
        setError(null)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err.message : 'No pudimos cargar esto.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  return { data, error, loading, reload: () => setTick((n) => n + 1) }
}
