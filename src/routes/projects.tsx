import { Building2, Search, SearchX } from 'lucide-react'
import { useState } from 'react'
import type { LoaderFunctionArgs } from 'react-router-dom'
import { useLoaderData, useNavigation, useSearchParams } from 'react-router-dom'
import { Link } from '@/lib/nav'
import { breadcrumbJsonLd } from '@/lib/seo'
import { ROUTES, SITE } from '@/lib/site'
import { number } from '@/lib/format'
import { useIdioma, useT } from '@/lib/i18n'
import { useSeo } from '@/lib/use-seo'

import { SectionHeading } from '@/components/common/section-heading'
import { ProjectCard } from '@/components/project/project-card'
import { PropertyGridSkeleton } from '@/components/property/property-grid'
import { ResultsPager } from '@/components/search/results-pager'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  listProjects,
  readProjectFilters,
  toProjectsQuery,
  writeProjectFilters,
  type ProjectFilters,
  type ProjectSummary,
} from '@/lib/projects'
import { useListAnchor } from '@/lib/scroll'
import { useSiteData } from '@/lib/site-data'
import type { Paginated } from '@/lib/types'

/** Radix no admite `value=""`; el "Todas" necesita un centinela propio. */
const ANY = '__any__'

const GRID = 'grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'

interface ProjectsData {
  filters: ProjectFilters
  results: Paginated<ProjectSummary>
}

export async function loader({
  request,
}: LoaderFunctionArgs): Promise<ProjectsData> {
  const url = new URL(request.url)
  const filters = readProjectFilters(url.searchParams)
  const results = await listProjects(toProjectsQuery(filters))
  return { filters, results }
}

export function ProjectsList() {
  const t = useT()
  const { idioma } = useIdioma()

  useSeo({
    title: t('page.projects.seo.title', { site: SITE.name }),
    description: t('page.projects.seo.description'),
    canonical: SITE.url + ROUTES.projects,
  }, {
    crumbs: breadcrumbJsonLd([
      { name: t('nav.home'), url: '/' },
      { name: t('nav.projects'), url: ROUTES.projects },
    ]),
  })

  const { filters, results } = useLoaderData() as ProjectsData
  const [, setSearchParams] = useSearchParams()
  const navigation = useNavigation()
  const loading = navigation.state === 'loading'

  const filtered = filters.match !== '' || filters.cityId !== ''
  const { total, page, pages } = results.meta
  // Aqui la lista no cuelga de un `Suspense`: el ancla puede ser el contenedor.
  const [anchor, onNavigate] = useListAnchor()

  const update = (next: Partial<ProjectFilters>) => {
    setSearchParams(writeProjectFilters({ ...filters, ...next }), {
      preventScrollReset: true,
    })
    onNavigate()
  }

  return (
    <div ref={anchor} className="container-site py-10">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        {/* `min-w-0`: sin esto el rotulo estira la fila y desborda en movil. */}
        <div className="min-w-0">
          <SectionHeading
            as="h1"
            size="sm"
            light={t('projects.heading.light')}
            strong={t('projects.heading.strong')}
            className="mb-2"
          />
          <p className="tabular text-sm text-muted-foreground">
            {total > 0
              ? t(
                  total === 1 ? 'projects.count.one' : 'projects.count.other',
                  {
                    total: number(total, idioma),
                    page,
                    pages: Math.max(pages, 1),
                  },
                )
              : t('projects.subtitle.empty')}
          </p>
        </div>

        {/* La barra de filtros sobra si no hay nada publicado y nadie ha
            buscado: seria pedirle al visitante que filtre una lista vacia. */}
        {(total > 0 || filtered) && (
          <ProjectFilterBar
            key={`${filters.match}|${filters.cityId}`}
            filters={filters}
            onApply={update}
          />
        )}
      </div>

      {loading ? (
        <PropertyGridSkeleton count={6} />
      ) : results.data.length === 0 ? (
        filtered ? (
          <EmptyShell icon={SearchX} title={t('projects.empty.filtered.title')}>
            <p className="max-w-sm text-sm text-muted-foreground">
              {t('projects.empty.filtered.detail')}
            </p>
            <Button
              variant="outline"
              onClick={() => update({ match: '', cityId: '', page: 1 })}
            >
              {t('projects.empty.filtered.action')}
            </Button>
          </EmptyShell>
        ) : (
          <EmptyShell icon={Building2} title={t('projects.empty.title')}>
            <p className="max-w-md text-sm text-muted-foreground">
              {t('projects.empty.detail')}
            </p>
            <Button asChild>
              <Link to={ROUTES.sales}>{t('projects.empty.action')}</Link>
            </Button>
          </EmptyShell>
        )
      ) : (
        <div className={GRID}>
          {results.data.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      <div className="mt-10">
        <ResultsPager
          page={page}
          pages={pages}
          onPage={(next) => update({ page: next })}
        />
      </div>
    </div>
  )
}

/**
 * Buscar por nombre y acotar por ciudad. Como el resto del sitio, no guarda
 * estado propio mas alla de lo que el visitante esta escribiendo: al aplicar
 * escribe en la URL y el loader vuelve a pedir.
 */
function ProjectFilterBar({
  filters,
  onApply,
}: {
  filters: ProjectFilters
  onApply: (next: Partial<ProjectFilters>) => void
}) {
  const { catalogs } = useSiteData()
  const [match, setMatch] = useState(filters.match)
  const t = useT()

  return (
    <form
      aria-label={t('projects.filters.aria')}
      onSubmit={(event) => {
        event.preventDefault()
        onApply({ match, page: 1 })
      }}
      className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-end lg:w-auto"
    >
      <div className="min-w-0 flex-1 sm:w-48 lg:flex-none">
        <Label htmlFor="project-match" className="mb-1.5 text-xs">
          {t('projects.filters.name')}
        </Label>
        <Input
          id="project-match"
          value={match}
          onChange={(event) => setMatch(event.target.value)}
          placeholder={t('projects.filters.name.placeholder')}
        />
      </div>

      <div className="min-w-0 flex-1 sm:w-44 lg:flex-none">
        <Label htmlFor="project-city" className="mb-1.5 text-xs">
          {t('projects.filters.city')}
        </Label>
        <Select
          value={filters.cityId || ANY}
          onValueChange={(value) =>
            onApply({ cityId: value === ANY ? '' : value, match, page: 1 })
          }
        >
          <SelectTrigger id="project-city" className="w-full">
            <SelectValue placeholder={t('projects.filters.city.any')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>
              {t('projects.filters.city.any')}
            </SelectItem>
            {catalogs.cities.map((city) => (
              <SelectItem key={city.id} value={String(city.id)}>
                {city.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" className="shrink-0">
        <Search />
        {t('projects.filters.submit')}
      </Button>
    </form>
  )
}

function EmptyShell({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Building2
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-5 py-20 text-center">
      <Icon className="size-8 text-muted-foreground" />
      <p className="font-medium">{title}</p>
      {children}
    </div>
  )
}
