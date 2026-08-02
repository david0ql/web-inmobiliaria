import { SearchX } from 'lucide-react'
import { Suspense, use } from 'react'
import { useLoaderData, useSearchParams } from 'react-router-dom'

import { SectionHeading } from '@/components/common/section-heading'
import {
  PropertyGrid,
  PropertyGridSkeleton,
} from '@/components/property/property-grid'
import { AdvancedSearch } from '@/components/search/advanced-search'
import { ResultsPager } from '@/components/search/results-pager'
import { Skeleton } from '@/components/ui/misc'
import { SORTS, writeFilters, type Filters } from '@/lib/search-params'
import type { SearchData } from '@/routes/loaders'
import type { Paginated, Property } from '@/lib/types'
import { cn } from '@/lib/utils'

export function SearchResults() {
  const data = useLoaderData() as SearchData

  return (
    <div className="container-site py-10">
      <div className="mb-10 rounded-lg border bg-card p-5 shadow-sm lg:p-6">
        <SectionHeading as="h2" light="Búsqueda" strong="avanzada" />
        <AdvancedSearch initial={data.initialFilters} />
      </div>

      <SectionHeading
        as="h1"
        light="Resultados de la"
        strong="búsqueda"
        className="mb-2"
      />

      <Suspense fallback={<ResultsSkeleton />}>
        <Results promise={data.results} />
      </Suspense>
    </div>
  )
}

function Results({
  promise,
}: {
  promise: Promise<{ filters: Filters; results: Paginated<Property> }>
}) {
  const { filters, results } = use(promise)
  const [, setSearchParams] = useSearchParams()

  const update = (next: Partial<Filters>) => {
    setSearchParams(writeFilters({ ...filters, ...next }), {
      preventScrollReset: next.page === undefined,
    })
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="tabular text-sm text-muted-foreground">
          {results.meta.total.toLocaleString('es-CO')}{' '}
          {results.meta.total === 1 ? 'inmueble' : 'inmuebles'} · página{' '}
          {results.meta.page} de {Math.max(results.meta.pages, 1)}
        </p>

        <div className="flex flex-wrap gap-1.5">
          {SORTS.map((sort) => (
            <button
              key={sort.value}
              type="button"
              onClick={() => update({ sort: sort.value, page: 1 })}
              aria-pressed={filters.sort === sort.value}
              className={cn(
                'h-9 rounded-md border px-3 text-xs font-medium transition-colors',
                filters.sort === sort.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'bg-background hover:bg-secondary',
              )}
            >
              {sort.label}
            </button>
          ))}
        </div>
      </div>

      {results.data.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-20 text-center">
          <SearchX className="size-8 text-muted-foreground" />
          <p className="font-medium">Ningún inmueble coincide</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Prueba con un rango de precio más amplio, otra ciudad, o quita algún
            filtro.
          </p>
        </div>
      ) : (
        <PropertyGrid properties={results.data} eager={3} />
      )}

      <div className="mt-10">
        <ResultsPager
          page={results.meta.page}
          pages={results.meta.pages}
          onPage={(page) => update({ page })}
        />
      </div>
    </>
  )
}

function ResultsSkeleton() {
  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-9 w-64" />
      </div>
      <PropertyGridSkeleton count={6} />
    </>
  )
}
