import { Suspense, use } from 'react'

import { Link } from '@/lib/nav'
import { useLoaderData } from 'react-router-dom'

import { SectionHeading } from '@/components/common/section-heading'
import { MapSection } from '@/components/property/map-section'
import { PropertyGrid, PropertyGridSkeleton } from '@/components/property/property-grid'
import { AdvancedSearch } from '@/components/search/advanced-search'
import {
  breadcrumbJsonLd,
  organizationJsonLd,
  websiteJsonLd,
} from '@/lib/seo'
import { ROUTES, SITE } from '@/lib/site'
import { useIdioma, useT } from '@/lib/i18n'
import { useSeo } from '@/lib/use-seo'
import { ProjectCard } from '@/components/project/project-card'
import { RecentCarousel } from '@/components/property/recent-carousel'
import type { Showcase } from '@/lib/api'
import type { Property } from '@/lib/types'
import type { ProjectSummary } from '@/lib/projects'
import type { HomeData } from '@/routes/loaders'

export function Home() {
  const data = useLoaderData() as HomeData
  const t = useT()
  const { idioma } = useIdioma()

  useSeo(
    {
      title: t('page.home.seo.title', { site: SITE.name }),
      description: t(SITE.description),
      canonical: SITE.url + '/',
    },
    {
      org: organizationJsonLd(t),
      site: websiteJsonLd(idioma),
      crumbs: breadcrumbJsonLd([{ name: t('nav.home'), url: '/' }]),
    },
  )

  return (
    <>
      {/*
        El h1 de la portada. Va oculto a la vista porque encima del mapa no
        cabe un titular sin estropear el diseño, pero tiene que existir: es lo
        primero que lee un lector de pantalla y lo que le dice a un buscador de
        que va este sitio. Sin el, la portada no tenia ningun h1.
      */}
      <h1 className="sr-only">{t('page.home.h1')}</h1>

      <MapSection />

      <section className="container-site relative z-10 -mt-8 mb-14 lg:-mt-10">
        <div className="rounded-lg border bg-card p-5 shadow-lg lg:p-6">
          <SectionHeading
            as="h2"
            size="sm"
            light={t('search.heading.light')}
            strong={t('search.heading.strong')}
          />
          <AdvancedSearch />
        </div>
      </section>

      {/* La seccion entera desaparece si no hay proyectos publicados. Un
          rotulo y un boton sobre un hueco vacio se leen como algo roto, y hoy
          la agencia todavia no ha dado de alta ninguno. */}
      <Suspense fallback={null}>
        <ProjectsSection promise={data.projects} />
      </Suspense>

      {/*
        Aqui estaba "Cerca de ti", que no se pintaba hasta que alguien concedia
        su ubicacion: un titulo sobre un hueco para todo el que decia no. En su
        sitio, lo ultimo que entro al inventario, que le sirve a cualquiera y no
        pide nada a cambio. El mapa de arriba sigue usando la ubicacion cuando
        la hay, que es donde de verdad aporta.
      */}
      <Suspense fallback={<ShowcaseSkeleton />}>
        <NovedadesSection promise={data.novedades} />
      </Suspense>

      <Suspense fallback={<ShowcaseSkeleton />}>
        <ShowcaseSection promise={data.showcase} />
      </Suspense>
    </>
  )
}


function ProjectsSection({ promise }: { promise: Promise<ProjectSummary[]> }) {
  const t = useT()
  const projects = use(promise)
  if (!projects.length) return null

  return (
    <section className="container-site mb-14">
      <SectionHeading
        size="sm"
        light={t('projects.heading.light')}
        strong={t('projects.heading.strong')}
      />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </section>
  )
}

/**
 * Lo ultimo publicado.
 *
 * Se apoya en el orden por defecto de la API —lo mas reciente primero—, asi que
 * no hay nada que mantener: un inmueble entra al inventario y aparece aqui. Si
 * no hay ninguno, la seccion no se pinta, igual que las demas.
 */
function NovedadesSection({ promise }: { promise: Promise<Property[]> }) {
  const t = useT()
  const novedades = use(promise)
  if (!novedades.length) return null

  return (
    <section className="container-site mb-14">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <SectionHeading
          size="sm"
          light={t('home.novedades.light')}
          strong={t('home.novedades.strong')}
          className="mb-0"
        />
        <Link to={ROUTES.sales} className="text-sm font-medium hover:underline">
          {t('home.novedades.all')}
        </Link>
      </div>
      <PropertyGrid properties={novedades} />
    </section>
  )
}

function ShowcaseSection({ promise }: { promise: Promise<Showcase> }) {
  const t = useT()
  const showcase = use(promise)
  if (!showcase.enabled || !showcase.properties.length) return null

  return (
    <section className="container-site mb-14">
      <SectionHeading
        size="sm"
        light={t('home.showcase.light')}
        strong={t('home.showcase.strong')}
      />
      <RecentCarousel promise={promise} />
    </section>
  )
}

function ShowcaseSkeleton() {
  return (
    <section className="container-site mb-14">
      <PropertyGridSkeleton count={3} />
    </section>
  )
}
