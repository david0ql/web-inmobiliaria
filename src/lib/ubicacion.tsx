import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { api } from '@/lib/api'
import type { Property } from '@/lib/types'

export interface Lugar {
  countryCode: string
  countryName: string
  city: string | null
}

export type EstadoUbicacion =
  | 'sin-preguntar'
  | 'preguntando'
  | 'concedida'
  | 'denegada'
  | 'no-disponible'

interface Ubicacion {
  estado: EstadoUbicacion
  punto: { lat: number; lng: number } | null
  lugar: Lugar | null
  cercanos: (Property & { distanceKm: number })[]
  pedir: () => void
}

const UbicacionContext = createContext<Ubicacion | null>(null)

const CLAVE = 'serrano:ubicacion'

/**
 * Dónde está quien mira, si quiere decirlo.
 *
 * Sirve para dos cosas: enseñarle los inmuebles que tiene cerca y saludarle
 * por su país. Las dos son un extra, así que nada de esto bloquea la web: sin
 * permiso, el sitio se comporta exactamente igual que antes.
 *
 * Se pide al entrar, en cuanto la portada ha pintado: la agencia lo quiere así
 * para que el mapa se centre solo en quien mira. Tiene un coste conocido —un
 * cartel del sistema antes de que la persona sepa qué sitio es este se lleva
 * más "bloquear" que uno pedido con contexto, y bloqueado ya no se puede
 * volver a preguntar por código—, y por eso queda el botón manual: es el único
 * camino que le queda a quien dijo que no sin mirar.
 *
 * No se pide en el primer fotograma sino tras el primer pintado: el cartel
 * encima de una pantalla en blanco no dice de qué sitio viene.
 */
export function UbicacionProvider({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<EstadoUbicacion>('sin-preguntar')
  const [punto, setPunto] = useState<{ lat: number; lng: number } | null>(null)
  const [lugar, setLugar] = useState<Lugar | null>(null)
  const [cercanos, setCercanos] = useState<(Property & { distanceKm: number })[]>(
    [],
  )

  const localizar = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setEstado('no-disponible')
      return
    }
    setEstado('preguntando')
    navigator.geolocation.getCurrentPosition(
      async (posicion) => {
        const coords = {
          lat: posicion.coords.latitude,
          lng: posicion.coords.longitude,
        }
        setPunto(coords)
        setEstado('concedida')
        try {
          localStorage.setItem(CLAVE, '1')
        } catch {
          /* Navegación privada. */
        }

        const [donde, cerca] = await Promise.allSettled([
          api.get<Lugar | null>('/public/geo/where', coords),
          api.get<(Property & { distanceKm: number })[]>(
            '/public/properties/near',
            { ...coords, limit: 6 },
          ),
        ])
        if (donde.status === 'fulfilled') setLugar(donde.value)
        if (cerca.status === 'fulfilled') setCercanos(cerca.value)
      },
      (error) => {
        setEstado(error.code === error.PERMISSION_DENIED ? 'denegada' : 'no-disponible')
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    )
  }, [])

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setEstado('no-disponible')
      return
    }

    // Tras el primer pintado, no en el primer fotograma: el cartel del sistema
    // sobre una pantalla en blanco no dice de que sitio viene.
    const t = setTimeout(() => {
      if (!navigator.permissions?.query) {
        localizar()
        return
      }
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((permiso) => {
          // Denegado, ni se intenta: el navegador no volveria a preguntar y
          // solo serviria para dejar el estado en "preguntando" un rato.
          if (permiso.state === 'denied') setEstado('denegada')
          else localizar()
        })
        .catch(() => localizar())
    }, 600)

    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  const valor = useMemo<Ubicacion>(
    () => ({ estado, punto, lugar, cercanos, pedir: localizar }),
    [estado, punto, lugar, cercanos, localizar],
  )

  return (
    <UbicacionContext.Provider value={valor}>
      {children}
    </UbicacionContext.Provider>
  )
}

export function useUbicacion(): Ubicacion {
  return (
    useContext(UbicacionContext) ?? {
      estado: 'sin-preguntar',
      punto: null,
      lugar: null,
      cercanos: [],
      pedir: () => {},
    }
  )
}

/**
 * La bandera de un país, a partir de su código.
 *
 * Dos letras se convierten en dos "indicadores regionales" y el sistema pinta
 * la bandera. Sin imágenes: son cientos de banderas, cada una un fichero, y el
 * emoji ya lo trae el teléfono con el dibujo que su dueño reconoce.
 */
export function bandera(countryCode: string): string {
  if (!/^[A-Za-z]{2}$/.test(countryCode)) return '🌎'
  return String.fromCodePoint(
    ...[...countryCode.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)),
  )
}
