import { Suspense, use } from 'react'
import { useLoaderData } from 'react-router-dom'

import { SectionHeading } from '@/components/common/section-heading'
import { MapSection } from '@/components/property/map-section'
import { PropertyGridSkeleton } from '@/components/property/property-grid'
import { AdvancedSearch } from '@/components/search/advanced-search'
import {
  breadcrumbJsonLd,
  organizationJsonLd,
  websiteJsonLd,
} from '@/lib/seo'
import { SITE } from '@/lib/site'
import { useSeo } from '@/lib/use-seo'
import { ProjectCard } from '@/components/project/project-card'
import { RecentCarousel } from '@/components/property/recent-carousel'
import type { Showcase } from '@/lib/api'
import type { ProjectSummary } from '@/lib/projects'
import type { HomeData } from '@/routes/loaders'

export function Home() {
  const data = useLoaderData() as HomeData

  useSeo(
    {
      title: `${SITE.name} · Apartamentos, casas y lotes en Bucaramanga`,
      description: SITE.description,
      canonical: SITE.url + '/',
    },
    {
      org: organizationJsonLd(),
      site: websiteJsonLd(),
      crumbs: breadcrumbJsonLd([{ name: 'Inicio', url: '/' }]),
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
      <h1 className="sr-only">
        Inmobiliaria en Bucaramanga: apartamentos, casas y lotes en venta en
        Floridablanca, Girón y Piedecuesta
      </h1>

      <MapSection />

      <section className="container-site relative z-10 -mt-8 mb-14 lg:-mt-10">
        <div className="rounded-lg border bg-card p-5 shadow-lg lg:p-6">
          <SectionHeading as="h2" size="sm" light="Búsqueda" strong="avanzada" />
          <AdvancedSearch />
        </div>
      </section>

      {/* La seccion entera desaparece si no hay proyectos publicados. Un
          rotulo y un boton sobre un hueco vacio se leen como algo roto, y hoy
          la agencia todavia no ha dado de alta ninguno. */}
      <Suspense fallback={null}>
        <ProjectsSection promise={data.projects} />
      </Suspense>

      {/* El rotulo y el boton viven dentro: apagado el carrusel desde el
          panel, no debe quedarse un titulo sobre un hueco. */}
      <Suspense fallback={<ShowcaseSkeleton />}>
        <ShowcaseSection promise={data.showcase} />
      </Suspense>
    </>
  )
}


function ProjectsSection({ promise }: { promise: Promise<ProjectSummary[]> }) {
  const projects = use(promise)
  if (!projects.length) return null

  return (
    <section className="container-site mb-14">
      <SectionHeading size="sm" light="Nuestros" strong="proyectos" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </section>
  )
}

function ShowcaseSection({ promise }: { promise: Promise<Showcase> }) {
  const showcase = use(promise)
  if (!showcase.enabled || !showcase.properties.length) return null

  return (
    <section className="container-site mb-14">
      <SectionHeading size="sm" light="Últimos" strong="inmuebles" />
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
