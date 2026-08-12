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
 * No se pide al entrar. Un navegador que abre el cartel del sistema en el
 * primer segundo, antes de que la persona sepa qué sitio es este, se lleva un
 * "bloquear" casi seguro —y bloqueado no se puede volver a preguntar por
 * código—. Así que se pide cuando alguien lo pulsa, que es cuando la pregunta
 * tiene sentido.
 */
export function UbicacionProvider({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<EstadoUbicacion>('sin-preguntar')
  const [punto, setPunto] = useState<{ lat: number; lng: number } | null>(null)
  const [lugar, setLugar] = useState<Lugar | null>(null)
  const [cercanos, setCercanos] = useState<(Property & { distanceKm: number })[]>(
    [],
  )

  // Si ya dio permiso otra vez, el navegador no vuelve a preguntar: se puede
  // usar directamente y la web aparece ya con sus inmuebles cerca.
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setEstado('no-disponible')
      return
    }
    if (!navigator.permissions?.query) return
    navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((permiso) => {
        if (permiso.state === 'granted') localizar()
        if (permiso.state === 'denied') setEstado('denegada')
      })
      .catch(() => {
        /* Safari viejo no lo soporta: se queda esperando a que alguien pulse. */
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
