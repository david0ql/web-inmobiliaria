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
  /** Cuantas portadas se cargan sin diferir. La primera fila es el LCP. */
  eager = 0,
}: {
  properties: Property[]
  className?: string
  eager?: number
}) {
  return (
    <div className={cn(GRID, className)}>
      {properties.map((property, index) => (
        <PropertyCard
          key={property.id}
          property={property}
          priority={index < eager}
        />
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
