import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { api } from '@/lib/api'
import es from '@/i18n/es.json'
import en from '@/i18n/en.json'

export const IDIOMAS = ['es', 'en'] as const
export type Idioma = (typeof IDIOMAS)[number]

export const IDIOMA_LABEL: Record<Idioma, string> = {
  es: 'Español',
  en: 'English',
}

type Diccionario = Record<string, string>

/**
 * Las frases empaquetadas con la web.
 *
 * Son la red de seguridad y el primer pintado: si la API tarda o falla, el
 * sitio se lee igual. Encima de ellas van las que la agencia haya cambiado
 * desde el panel, que llegan por `/public/i18n/:idioma`.
 */
const BASE: Record<Idioma, Diccionario> = { es, en }

interface Traduccion {
  idioma: Idioma
  cambiar: (idioma: Idioma) => void
  /**
   * La frase de una clave. `vars` sustituye `{algo}` dentro del texto.
   *
   * Si la clave no existe se devuelve la clave misma: en pantalla se ve
   * `home.hero.title` y se sabe al instante qué falta, en vez de un hueco en
   * blanco que nadie relaciona con nada.
   */
  t: (key: string, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<Traduccion | null>(null)

const CLAVE = 'serrano:idioma'

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [idioma, setIdioma] = useState<Idioma>(() => leerPreferencia())
  const [remoto, setRemoto] = useState<Partial<Record<Idioma, Diccionario>>>({})

  useEffect(() => {
    const controller = new AbortController()
    api
      .get<Diccionario>(`/public/i18n/${idioma}`, undefined, controller.signal)
      .then((data) => setRemoto((previo) => ({ ...previo, [idioma]: data })))
      .catch(() => {
        /* Con lo empaquetado basta para leer la web entera. */
      })
    return () => controller.abort()
  }, [idioma])

  // El idioma del documento: se lo dicen los buscadores y los lectores de
  // pantalla, y de él dependen la separación silábica y las comillas.
  useEffect(() => {
    document.documentElement.lang = idioma
  }, [idioma])

  const cambiar = useCallback((siguiente: Idioma) => {
    setIdioma(siguiente)
    try {
      localStorage.setItem(CLAVE, siguiente)
    } catch {
      /* Navegación privada: dura lo que la pestaña. */
    }
  }, [])

  const valor = useMemo<Traduccion>(() => {
    const diccionario = { ...BASE[idioma], ...(remoto[idioma] ?? {}) }
    return { idioma, cambiar, t: (key, vars) => resolver(diccionario, key, vars) }
  }, [idioma, remoto, cambiar])

  return <I18nContext.Provider value={valor}>{children}</I18nContext.Provider>
}

/**
 * La función de traducir.
 *
 * Funciona sin proveedor por encima —cae al español empaquetado— para que una
 * pantalla suelta, o un componente montado en una prueba, no reviente por no
 * haber montado el contexto.
 */
export function useT(): Traduccion['t'] {
  const contexto = useContext(I18nContext)
  return contexto?.t ?? ((key, vars) => resolver(BASE.es, key, vars))
}

export function useIdioma(): {
  idioma: Idioma
  cambiar: (idioma: Idioma) => void
} {
  const contexto = useContext(I18nContext)
  return {
    idioma: contexto?.idioma ?? 'es',
    cambiar: contexto?.cambiar ?? (() => {}),
  }
}

function resolver(
  diccionario: Diccionario,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const texto = diccionario[key] ?? BASE.es[key] ?? key
  if (!vars) return texto
  return texto.replace(/\{(\w+)\}/g, (bruto, nombre: string) =>
    nombre in vars ? String(vars[nombre]) : bruto,
  )
}

function leerPreferencia(): Idioma {
  try {
    const guardado = localStorage.getItem(CLAVE)
    if (guardado && (IDIOMAS as readonly string[]).includes(guardado))
      return guardado as Idioma
    // Sin preferencia, lo que traiga el navegador: quien llega desde fuera con
    // el navegador en inglés lo agradece, y quien está en Colombia ve español.
    return navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'es'
  } catch {
    return 'es'
  }
}
