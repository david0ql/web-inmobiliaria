import { createContext, useContext, useEffect, useMemo, useState } from 'react'

import { api } from '@/lib/api'
import { useIdioma } from '@/lib/i18n'
import { dolares as enDolares, pesos as enPesos } from '@/lib/format'

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
  /** Un precio en pesos, en la moneda que corresponde al idioma. */
  precio: (pesos: number | string | null | undefined) => string
}

const CambioContext = createContext<Cambio | null>(null)

/*
  El formato del precio lo decide la MONEDA, no el idioma del sitio: los pesos
  se separan con punto de millar y los dolares con coma, aqui y en la version
  en ingles. `pesos()` y `dolares()` viven en `format.ts`, que es donde esta
  esa regla escrita.
*/

/**
 * En qué moneda se leen los precios: la que corresponde al idioma.
 *
 * Español, pesos. Inglés, dólares. No hay elección de moneda y por eso no hay
 * conmutador: dos interruptores al lado que casi siempre se mueven juntos son
 * dos decisiones donde el visitante solo tiene una —"en qué idioma leo esto"—,
 * y la segunda solo sirve para dejarlos descuadrados: la web en inglés
 * hablando de "$1.750.000.000".
 *
 * Si la API no supo el valor del dólar, el inglés se lee en pesos. Convertir
 * con una cifra inventada, enseñando precios de casas, sería peor.
 */
export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { idioma } = useIdioma()
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

  const valor = useMemo<Cambio>(() => {
    const moneda: Moneda = idioma === 'en' && tasa?.rate ? 'USD' : 'COP'

    return {
      moneda,
      tasa,
      precio: (pesos) => {
        const n = typeof pesos === 'string' ? Number(pesos) : pesos
        if (n === null || n === undefined || !Number.isFinite(n) || n === 0)
          return '—'
        if (moneda === 'USD' && tasa?.rate)
          return `US$${enDolares(Math.round(n / tasa.rate))}`
        return `$${enPesos(n)}`
      },
    }
  }, [idioma, tasa])

  return (
    <CambioContext.Provider value={valor}>{children}</CambioContext.Provider>
  )
}

/**
 * La moneda del idioma y cómo pintar un precio con ella.
 *
 * Devuelve algo utilizable aunque no haya proveedor por encima —pesos—: así
 * una pantalla suelta, o un test, no revientan por no montar el contexto.
 */
export function useCurrency(): Cambio {
  const contexto = useContext(CambioContext)
  if (contexto) return contexto
  return {
    moneda: 'COP',
    tasa: null,
    precio: (pesos) => {
      const n = typeof pesos === 'string' ? Number(pesos) : pesos
      if (n === null || n === undefined || !Number.isFinite(n) || n === 0)
        return '—'
      return `$${enPesos(n)}`
    },
  }
}
