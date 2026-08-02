import { Suspense, use } from 'react'
import { Link, useLoaderData } from 'react-router-dom'

import { SectionHeading } from '@/components/common/section-heading'
import { MapSection } from '@/components/property/map-section'
import {
  PropertyGrid,
  PropertyGridSkeleton,
} from '@/components/property/property-grid'
import { AdvancedSearch } from '@/components/search/advanced-search'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/lib/site'
import type { HomeData } from '@/routes/loaders'
import type { Property } from '@/lib/types'

export function Home() {
  const data = useLoaderData() as HomeData

  return (
    <>
      <MapSection />

      <section className="container-site relative z-10 -mt-8 mb-14 lg:-mt-10">
        <div className="rounded-lg border bg-card p-5 shadow-lg lg:p-6">
          <SectionHeading as="h3" light="Búsqueda" strong="avanzada" />
          <AdvancedSearch />
        </div>
      </section>

      <section className="container-site mb-14">
        <SectionHeading light="Inmuebles" strong="destacados" />
        <Suspense fallback={<PropertyGridSkeleton count={3} />}>
          <Grid promise={data.featured} eager={3} />
        </Suspense>
      </section>

      <section className="container-site mb-14">
        <SectionHeading light="Últimos" strong="inmuebles" />
        <Suspense fallback={<PropertyGridSkeleton count={3} />}>
          <Grid promise={data.recent} />
        </Suspense>
        <div className="mt-8 flex justify-center">
          <Button asChild variant="outline">
            <Link to={ROUTES.sales}>Ver todo el inventario</Link>
          </Button>
        </div>
      </section>
    </>
  )
}

function Grid({
  promise,
  eager = 0,
}: {
  promise: Promise<Property[]>
  eager?: number
}) {
  return <PropertyGrid properties={use(promise)} eager={eager} />
}
