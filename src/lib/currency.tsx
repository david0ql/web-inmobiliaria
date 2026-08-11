import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { api } from '@/lib/api'

export type Moneda = 'COP' | 'USD'

interface Tasa {
  rate: number
  date: string
  source: 'TRM' | 'ER-API'
}

interface Cambio {
  moneda: Moneda
  /** `null` mientras no se sabe el valor del dólar, o si no se pudo saber. */
  tasa: Tasa | null
  /** Hay dólar disponible: sin esto no se enseña el conmutador. */
  disponible: boolean
  cambiar: (moneda: Moneda) => void
  /** Un precio en pesos, en la moneda que esté elegida. */
  precio: (pesos: number | string | null | undefined) => string
}

const CambioContext = createContext<Cambio | null>(null)

const CLAVE = 'serrano:moneda'

const PESOS = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const DOLARES = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

/**
 * En qué moneda se leen los precios del sitio.
 *
 * Una sola decisión para toda la web: quien la toma en una tarjeta espera
 * encontrarla igual en la ficha y en el buscador, y volver mañana y que siga
 * puesta —de ahí el `localStorage`—.
 *
 * El valor del dólar lo da la API, que lo saca de la TRM oficial. No se guarda
 * junto a la preferencia: una tasa vieja convierte mal, y es justo el dato que
 * tiene que estar fresco.
 */
export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [moneda, setMoneda] = useState<Moneda>(() => leerPreferencia())
  const [tasa, setTasa] = useState<Tasa | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    api
      .get<Tasa | null>('/public/fx/usd', undefined, controller.signal)
      .then(setTasa)
      .catch(() => {
        /* Sin tasa el sitio sigue en pesos, que es lo normal aquí. */
      })
    return () => controller.abort()
  }, [])

  const cambiar = useCallback((siguiente: Moneda) => {
    setMoneda(siguiente)
    try {
      localStorage.setItem(CLAVE, siguiente)
    } catch {
      /* Navegación privada: la preferencia dura lo que la pestaña. */
    }
  }, [])

  const valor = useMemo<Cambio>(() => {
    const disponible = Boolean(tasa?.rate)
    // Sin tasa no hay dólares que enseñar, aunque estuviera elegido de antes.
    const efectiva: Moneda = disponible ? moneda : 'COP'

    return {
      moneda: efectiva,
      tasa,
      disponible,
      cambiar,
      precio: (pesos) => {
        const n = typeof pesos === 'string' ? Number(pesos) : pesos
        if (n === null || n === undefined || !Number.isFinite(n) || n === 0)
          return '—'
        if (efectiva === 'USD' && tasa?.rate)
          return `US$${DOLARES.format(Math.round(n / tasa.rate))}`
        return `$${PESOS.format(n)}`
      },
    }
  }, [moneda, tasa, cambiar])

  return (
    <CambioContext.Provider value={valor}>{children}</CambioContext.Provider>
  )
}

/**
 * La moneda elegida y cómo pintar un precio con ella.
 *
 * Devuelve algo utilizable aunque no haya proveedor por encima —pesos y sin
 * conmutador—: así una pantalla suelta, o un test, no revientan por no montar
 * el contexto.
 */
export function useCurrency(): Cambio {
  const contexto = useContext(CambioContext)
  if (contexto) return contexto
  return {
    moneda: 'COP',
    tasa: null,
    disponible: false,
    cambiar: () => {},
    precio: (pesos) => {
      const n = typeof pesos === 'string' ? Number(pesos) : pesos
      if (n === null || n === undefined || !Number.isFinite(n) || n === 0)
        return '—'
      return `$${PESOS.format(n)}`
    },
  }
}

function leerPreferencia(): Moneda {
  try {
    return localStorage.getItem(CLAVE) === 'USD' ? 'USD' : 'COP'
  } catch {
    return 'COP'
  }
}
