import { ArrowDown, ArrowUp, Clock3, List, Map, SearchX, SlidersHorizontal } from 'lucide-react'
import { Suspense, use, useRef, useState } from 'react'
import { useLoaderData, useNavigation, useSearchParams } from 'react-router-dom'

import { SectionHeading } from '@/components/common/section-heading'
import {
  PropertyGrid,
  PropertyGridSkeleton,
} from '@/components/property/property-grid'
import { AdvancedSearch } from '@/components/search/advanced-search'
import { ResultsPager } from '@/components/search/results-pager'
import { Skeleton } from '@/components/ui/misc'
import { breadcrumbJsonLd } from '@/lib/seo'
import { ROUTES, SITE } from '@/lib/site'
import { number } from '@/lib/format'
import { useIdioma, useT } from '@/lib/i18n'
import { useSeo } from '@/lib/use-seo'
import { SORTS, countActive, writeFilters, type Filters } from '@/lib/search-params'
import { useListAnchor } from '@/lib/scroll'
import type { SearchData } from '@/routes/loaders'
import type { Paginated, Property } from '@/lib/types'
import { cn } from '@/lib/utils'
import { PropertiesMap } from '@/components/property/properties-map'

export function SearchResults() {
  const data = useLoaderData() as SearchData
  const [params] = useSearchParams()
  const t = useT()
  const navigation = useNavigation()
  const searching = navigation.state !== 'idle'
  const [filtersOpen, setFiltersOpen] = useState(false)
  const activeFilters = countActive(data.initialFilters)

  // Una pagina 2 con los mismos inmuebles que la 1 es contenido duplicado: se
  // apunta la canonica al listado limpio y solo se indexa la primera.
  const page = Number(params.get('page') ?? 1)

  useSeo({
    title:
      page > 1
        ? t('page.search.seo.title.paged', { page, site: SITE.name })
        : t('page.search.seo.title', { site: SITE.name }),
    description: t('page.search.seo.description'),
    canonical: SITE.url + ROUTES.sales,
    noindex: page > 1,
  }, {
    crumbs: breadcrumbJsonLd([
      { name: t('nav.home'), url: '/' },
      { name: t('nav.sales'), url: ROUTES.sales },
    ]),
  })
  // El ancla vive fuera del `Suspense`: mientras carga la pagina nueva el
  // interior se sustituye por el esqueleto, pero este titular no se mueve.
  const [anchor, scrollToResults] = useListAnchor()

  return (
    <div className="container-site relative py-6 lg:py-8" aria-busy={searching}>
      {searching && (
        <div
          className="fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-primary/15"
          role="status"
          aria-label={t('search.loading')}
        >
          <span className="block h-full w-1/3 animate-[search-progress_1s_ease-in-out_infinite] bg-primary" />
        </div>
      )}
      <div className="mb-6 rounded-xl border bg-card p-4 shadow-sm sm:mb-8 lg:p-6">
        <SectionHeading
          as="h2"
          size="sm"
          light={t('search.heading.light')}
          strong={t('search.heading.strong')}
        />
        <button
          type="button"
          onClick={() => setFiltersOpen((open) => !open)}
          className="mt-3 flex h-11 w-full items-center justify-between rounded-full border px-4 text-sm font-semibold sm:hidden"
          aria-expanded={filtersOpen}
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="size-4" />
            {t('search.filters')}
          </span>
          {activeFilters > 0 && (
            <span className="grid size-6 place-items-center rounded-full bg-primary text-xs text-primary-foreground">
              {activeFilters}
            </span>
          )}
        </button>
        <div className={cn('mt-4 sm:block', filtersOpen ? 'block' : 'hidden')}>
          <AdvancedSearch initial={data.initialFilters} />
        </div>
      </div>

      <div ref={anchor}>
        <SectionHeading
          as="h1"
          size="sm"
          light={t('page.search.results.light')}
          strong={t('page.search.results.strong')}
          className="mb-2"
        />

        <Suspense fallback={<ResultsSkeleton />}>
          <Results promise={data.results} onNavigate={scrollToResults} />
        </Suspense>
      </div>
    </div>
  )
}

function Results({
  promise,
  onNavigate,
}: {
  promise: Promise<{ filters: Filters; results: Paginated<Property> }>
  onNavigate: () => void
}) {
  const { filters, results } = use(promise)
  const [, setSearchParams] = useSearchParams()
  const t = useT()
  const { idioma } = useIdioma()
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list')
  const mapPanel = useRef<HTMLDivElement>(null)

  /*
   * Ordenar y paginar rehacen la lista entera, asi que en ambos casos se sube
   * al arranque de los resultados — no al top de la pagina, que es lo que hace
   * `ScrollRestoration` si se le deja.
   */
  const update = (next: Partial<Filters>) => {
    setSearchParams(writeFilters({ ...filters, ...next }), {
      preventScrollReset: true,
    })
    onNavigate()
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="tabular text-sm text-muted-foreground">
          {t(
            results.meta.total === 1
              ? 'search.count.one'
              : 'search.count.other',
            {
              total: number(results.meta.total, idioma),
              page: results.meta.page,
              pages: Math.max(results.meta.pages, 1),
            },
          )}
        </p>

        <div className="flex flex-wrap gap-1.5" aria-label={t('search.sort.aria')}>
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
              {sort.direction === 'up' ? (
                <ArrowUp className="mr-1 inline size-3.5" aria-hidden="true" />
              ) : sort.direction === 'down' ? (
                <ArrowDown className="mr-1 inline size-3.5" aria-hidden="true" />
              ) : (
                <Clock3 className="mr-1 inline size-3.5" aria-hidden="true" />
              )}
              {t(sort.label)}
            </button>
          ))}
        </div>
      </div>

      {results.data.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-20 text-center">
          <SearchX className="size-8 text-muted-foreground" />
          <p className="font-medium">{t('search.empty.title')}</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {t('search.empty.detail')}
          </p>
        </div>
      ) : (
        <div className="relative lg:grid lg:grid-cols-[minmax(0,55%)_minmax(360px,45%)] lg:gap-6">
          <div className={cn(mobileView === 'map' && 'hidden', 'lg:block')}>
            <PropertyGrid properties={results.data} eager={2} compact />
          </div>
          <div
            ref={mapPanel}
            className={cn(
              mobileView === 'list'
                ? 'fixed top-0 -left-[200vw] w-full lg:left-auto'
                : 'relative',
              'overflow-hidden rounded-2xl border bg-secondary shadow-sm lg:sticky lg:top-20 lg:block lg:h-[calc(100vh-6rem)] lg:w-auto',
            )}
            aria-hidden={mobileView === 'list' ? true : undefined}
          >
            <PropertiesMap
              properties={results.data}
              className="h-[calc(100dvh-11rem)] min-h-[420px] sm:h-[calc(100dvh-10rem)] lg:h-full"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              const next = mobileView === 'list' ? 'map' : 'list'
              setMobileView(next)
              if (next === 'map') {
                requestAnimationFrame(() =>
                  mapPanel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
                )
              }
            }}
            className="fixed bottom-5 left-1/2 z-40 flex h-12 -translate-x-1/2 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background shadow-xl lg:hidden"
            aria-pressed={mobileView === 'map'}
          >
            {mobileView === 'list' ? <Map className="size-4" /> : <List className="size-4" />}
            {mobileView === 'list' ? t('search.view.map') : t('search.view.list')}
          </button>
        </div>
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
