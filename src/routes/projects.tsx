import { Building2, Search, SearchX } from 'lucide-react'
import { useState } from 'react'
import type { LoaderFunctionArgs } from 'react-router-dom'
import {
  Link,
  useLoaderData,
  useNavigation,
  useSearchParams,
} from 'react-router-dom'
import { breadcrumbJsonLd } from '@/lib/seo'
import { ROUTES, SITE } from '@/lib/site'
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
  useSeo({
    title: `Proyectos de vivienda nueva en Santander · ${SITE.name}`,
    description:
      'Conjuntos y proyectos con unidades disponibles en Bucaramanga y su ' +
      'área metropolitana. Compara tipologías, áreas y precios desde.',
    canonical: SITE.url + ROUTES.projects,
  }, {
    crumbs: breadcrumbJsonLd([
      { name: 'Inicio', url: '/' },
      { name: 'Proyectos', url: ROUTES.projects },
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
            light="Proyectos y"
            strong="conjuntos"
            className="mb-2"
          />
          <p className="tabular text-sm text-muted-foreground">
            {total > 0 ? (
              <>
                {total.toLocaleString('es-CO')}{' '}
                {total === 1 ? 'proyecto' : 'proyectos'} · página {page} de{' '}
                {Math.max(pages, 1)}
              </>
            ) : (
              'Obra nueva, conjuntos cerrados y edificios de la agencia.'
            )}
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
          <EmptyShell icon={SearchX} title="Ningún proyecto coincide">
            <p className="max-w-sm text-sm text-muted-foreground">
              Prueba con otro nombre o quita el filtro de ciudad.
            </p>
            <Button
              variant="outline"
              onClick={() => update({ match: '', cityId: '', page: 1 })}
            >
              Ver todos los proyectos
            </Button>
          </EmptyShell>
        ) : (
          <EmptyShell icon={Building2} title="Aún no hay proyectos publicados">
            <p className="max-w-md text-sm text-muted-foreground">
              Estamos preparando esta sección. Cuando publiquemos un proyecto lo
              verás aquí con sus tipologías, el precio desde y las unidades
              disponibles. Mientras tanto, puedes ver todos los inmuebles que
              tenemos en venta.
            </p>
            <Button asChild>
              <Link to={ROUTES.sales}>Ver inmuebles en venta</Link>
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

  return (
    <form
      aria-label="Filtrar proyectos"
      onSubmit={(event) => {
        event.preventDefault()
        onApply({ match, page: 1 })
      }}
      className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-end lg:w-auto"
    >
      <div className="min-w-0 flex-1 sm:w-48 lg:flex-none">
        <Label htmlFor="project-match" className="mb-1.5 text-xs">
          Nombre
        </Label>
        <Input
          id="project-match"
          value={match}
          onChange={(event) => setMatch(event.target.value)}
          placeholder="Reserva de la Loma"
        />
      </div>

      <div className="min-w-0 flex-1 sm:w-44 lg:flex-none">
        <Label htmlFor="project-city" className="mb-1.5 text-xs">
          Ciudad
        </Label>
        <Select
          value={filters.cityId || ANY}
          onValueChange={(value) =>
            onApply({ cityId: value === ANY ? '' : value, match, page: 1 })
          }
        >
          <SelectTrigger id="project-city" className="w-full">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Todas</SelectItem>
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
        Buscar
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
