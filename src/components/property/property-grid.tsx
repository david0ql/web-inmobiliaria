import { useEffect, useRef } from 'react'

import { PropertyCard } from '@/components/property/property-card'
import { Skeleton } from '@/components/ui/misc'
import type { Property } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * `col-xl-4 col-lg-4 col-sm-6` del tema, literal: una columna en movil, dos a
 * partir de 576px y tres a partir de 992px.
 */
const GRID = 'grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'

export function PropertyGrid({
  properties,
  className,
  compact = false,
  /** Cuantas portadas se cargan sin diferir. La primera fila es el LCP. */
  eager = 0,
  onVisibleChange,
  onHoverChange,
}: {
  properties: Property[]
  className?: string
  /** Dos columnas como máximo para el panel estrecho junto al mapa. */
  compact?: boolean
  eager?: number
  /** Qué tarjetas caben ahora mismo en la pantalla, para que el mapa las siga. */
  onVisibleChange?: (ids: string[]) => void
  /** Sobre qué tarjeta está el ratón. */
  onHoverChange?: (id: string | null) => void
}) {
  const contenedor = useRef<HTMLDivElement>(null)
  /* Se avisa por referencia: si el callback entrara en las dependencias del
     efecto, cada repintado del buscador rehacia el observador. */
  const avisar = useRef(onVisibleChange)
  avisar.current = onVisibleChange

  /*
    Que tarjetas se estan viendo de verdad.

    Un solo observador para toda la rejilla, no uno por tarjeta. El umbral es
    del 45%: una tarjeta asomando por el borde inferior no es una tarjeta que
    alguien este mirando, y contarla metia en el mapa inmuebles de una fila que
    todavia no ha llegado.

    `rootMargin` recorta el area util por arriba: la cabecera fija tapa 80 px, y
    sin descontarlos la tarjeta que esta debajo se contaba como visible.
  */
  useEffect(() => {
    if (!onVisibleChange || !contenedor.current) return
    if (typeof IntersectionObserver === 'undefined') return

    const nodos = Array.from(
      contenedor.current.querySelectorAll<HTMLElement>('[data-property-id]'),
    )
    if (!nodos.length) return

    const dentro = new Set<string>()
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          const id = (entrada.target as HTMLElement).dataset.propertyId
          if (!id) continue
          if (entrada.isIntersecting) dentro.add(id)
          else dentro.delete(id)
        }
        // El orden es el de la rejilla, no el de las notificaciones.
        avisar.current?.(
          nodos
            .map((nodo) => nodo.dataset.propertyId!)
            .filter((id) => dentro.has(id)),
        )
      },
      { threshold: 0.45, rootMargin: '-80px 0px 0px 0px' },
    )

    for (const nodo of nodos) observador.observe(nodo)
    return () => observador.disconnect()
  }, [properties, onVisibleChange])

  return (
    <div
      ref={contenedor}
      className={cn(
        compact
          ? 'grid grid-cols-1 gap-5 2xl:grid-cols-2'
          : GRID,
        className,
      )}
    >
      {properties.map((property, index) => (
        <div key={property.id} data-property-id={property.id}>
          <PropertyCard
            property={property}
            priority={index < eager}
            onHoverChange={
              onHoverChange
                ? (hovering) => onHoverChange(hovering ? property.id : null)
                : undefined
            }
          />
        </div>
      ))}
    </div>
  )
}

export function PropertyGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className={GRID}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-lg border">
          <Skeleton className="h-[280px] rounded-none" />
          <div className="space-y-3 p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-6 w-32" />
          </div>
        </div>
      ))}
    </div>
  )
}
