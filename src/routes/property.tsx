import { ArrowRight, MapPin, Share2, Video } from 'lucide-react'
import { Suspense, use, useEffect } from 'react'
import { Await, Link, useLoaderData, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { SectionHeading } from '@/components/common/section-heading'
import { AgentPanel } from '@/components/property/agent-panel'
import { autoDescription } from '@/lib/auto-description'
import { FeatureList } from '@/components/property/feature-list'
import { PropertyGallery } from '@/components/property/property-gallery'
import { PropertyGrid } from '@/components/property/property-grid'
import { PropertyMap } from '@/components/property/property-map'
import { SpecTable } from '@/components/property/spec-table'
import { VisitForm } from '@/components/property/visit-form'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/misc'
import {businessType, money} from '@/lib/format'
import { portadaInyectada } from '@/lib/ficha-inyectada'
import { registerVisit } from '@/lib/api'
import { breadcrumbJsonLd, propertyJsonLd } from '@/lib/seo'
import { ROUTES, SITE } from '@/lib/site'
import { useCatalogo } from '@/lib/catalog-i18n'
import { useT } from '@/lib/i18n'
import { useCurrency } from '@/lib/currency'
import { propertyPath } from '@/lib/slug'
import { useSeo } from '@/lib/use-seo'
import type { PropertyData } from '@/routes/loaders'
import type { Property } from '@/lib/types'

export function PropertyDetail() {
  const data = useLoaderData() as PropertyData
  const { code } = useParams()
  return (
    <Suspense fallback={<PropertySkeleton code={code} />}>
      <Detail data={data} />
    </Suspense>
  )
}

function PropertySkeleton({ code }: { code?: string }) {
  // La API escribe la portada en el HTML de la ficha. Si esta, se pinta ya:
  // el navegador la tiene descargada desde el `preload` de la cabecera y
  // esperar a que conteste la API era medio segundo de rectangulo gris con la
  // foto lista en la cache.
  const portada = code ? portadaInyectada(code) : null

  return (
    <div className="container-site py-8">
      <Skeleton className="mb-3 h-3 w-40" />
      <Skeleton className="mb-6 h-7 w-3/4" />
      <div className="grid gap-8 lg:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-3 lg:col-span-8 xl:col-span-9">
          {portada ? (
            <div className="w-full overflow-hidden rounded-lg border bg-secondary">
              {/* Mismas medidas y mismo `srcset` que la galeria: cuando llega,
                  sustituye esta por la misma imagen y nada se mueve. */}
              <img
                src={portada.url}
                srcSet={portada.srcset}
                sizes="(min-width: 1200px) 840px, (min-width: 992px) 60vw, 100vw"
                alt={portada.alt}
                fetchPriority="high"
                decoding="sync"
                className="h-[320px] w-full object-cover sm:h-[480px]"
              />
            </div>
          ) : (
            <Skeleton className="h-[320px] w-full sm:h-[480px]" />
          )}
          <div className="flex gap-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-16 w-[90px] shrink-0" />
            ))}
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-4 xl:col-span-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    </div>
  )
}

function Detail({ data }: { data: PropertyData }) {
  const { precio, moneda } = useCurrency()
  const { tipo, titulo } = useCatalogo()
  const t = useT()
  const property = use(data.property)
  const siblings = data.siblings
  const amount = property.salePrice ?? property.rentPrice

  // El contador de visitas. Va aqui y no en la lectura para que la ficha se
  // pueda cachear; ademas cuenta mejor, porque mide fichas abiertas y no
  // llamadas a la API —el asistente consulta la misma ficha varias veces en una
  // conversacion y eso no son visitas.
  useEffect(() => {
    registerVisit(property.code)
  }, [property.code])

  const canonical = SITE.url + propertyPath(property)
  const place = [property.zone?.name, property.city?.name]
    .filter(Boolean)
    .join(', ')
  const cover =
    property.images?.find((image) => image.isMain) ?? property.images?.[0]

  useSeo(
    {
      // El titulo repite lo que la gente teclea: tipo, operacion y barrio.
      title: `${titulo(property)} · ${SITE.name}`,
      description: t('page.property.seo.description', {
        type: tipo(property.propertyType) ?? t('property.fallback.type'),
        place: place || t('page.property.seo.place'),
        specs: [
          property.area ? `${property.area} m²` : '',
          property.bedrooms
            ? t('property.spec.bedrooms.count', { count: property.bedrooms })
            : '',
          property.bathrooms
            ? t('property.spec.bathrooms.count', { count: property.bathrooms })
            : '',
          amount ? money(amount) : '',
        ]
          .filter(Boolean)
          .map((part) => ` · ${part}`)
          .join(''),
      }),
      canonical,
      image: cover?.urlLarge ?? cover?.url,
      type: 'article',
    },
    {
      property: propertyJsonLd(property, canonical, t),
      crumbs: breadcrumbJsonLd([
        { name: t('nav.home'), url: '/' },
        { name: t('nav.sales'), url: ROUTES.sales },
        { name: titulo(property), url: propertyPath(property) },
      ]),
    },
  )

  return (
    <div className="container-site py-8">
      <header className="mb-6">
        <p className="mb-2 text-xs tracking-widest text-muted-foreground uppercase">
          {tipo(property.propertyType)} · {businessType(property, t)}
        </p>
        <h1 className="tt-square text-xl leading-tight font-semibold uppercase sm:text-2xl">
          {titulo(property)}
        </h1>
        {(property.zone || property.city) && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-4" />
            {[property.zone?.name, property.city?.name, property.city?.region?.name]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
      </header>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* `min-w-0`: por defecto un hijo de rejilla es `min-width:auto`, asi que
            el contenido ancho (una foto de 1600px) lo estira en vez de recortarlo. */}
        <div className="flex min-w-0 flex-col gap-8 lg:col-span-8 xl:col-span-9">
          <PropertyGallery
            images={property.images ?? []}
            title={titulo(property)}
            availability={property.availability}
          />

          <div className="flex flex-wrap items-center gap-2">
            {property.latitude !== null &&
              property.longitude !== null &&
              property.mapPublication === 'EXACT' && (
                <Button asChild variant="outline" size="sm">
                  <a
                    href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${property.latitude},${property.longitude}`}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <MapPin />
                    {t('property.action.streetView')}
                  </a>
                </Button>
              )}

            {property.tourUrl && (
              <Button asChild variant="outline" size="sm">
                <a href={property.tourUrl} target="_blank" rel="noreferrer noopener">
                  <Video />
                  {t('property.action.tour')}
                </a>
              </Button>
            )}

            <Button variant="outline" size="sm" onClick={() => void share(t)}>
              <Share2 />
              {t('property.action.share')}
            </Button>
          </div>

          {/* La caja de codigo y precio, que en la ficha actual va justo bajo
              las fotos y es lo primero que se mira. */}
          <div className="flex flex-wrap items-end justify-between gap-4 rounded-lg border bg-secondary/40 px-5 py-4">
            <div>
              <p className="text-xs tracking-widest text-muted-foreground uppercase">
                {t('property.code')}
              </p>
              <p className="tabular text-lg font-semibold">{property.code}</p>
            </div>
            <div className="text-right">
              <p className="text-xs tracking-widest text-muted-foreground uppercase">
                {property.forSale
                  ? t('property.price.sale')
                  : t('property.price.rent')}
              </p>
              <p className="tabular text-2xl leading-tight font-normal tracking-tight">
                {precio(amount)}{' '}
                <small className="text-xs text-muted-foreground">{moneda}</small>
              </p>
            </div>
          </div>

          {/* Si el inmueble es una unidad de un proyecto, se dice y se enlaza:
              quien mira un apartamento sobre planos quiere ver el conjunto. */}
          {property.family && (
            <Link
              to={`${ROUTES.projects}/${property.family.slug}`}
              className="flex items-center justify-between gap-4 rounded-lg border bg-secondary/40 px-5 py-4 transition-colors hover:bg-secondary"
            >
              <span className="min-w-0">
                <span className="block text-xs tracking-widest text-muted-foreground uppercase">
                  {t('property.project.label')}
                </span>
                <span className="block truncate font-medium">
                  {property.family.name}
                  {property.unitType ? ` · ${property.unitType}` : ''}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1 text-sm">
                {t('property.project.action')}
                <ArrowRight className="size-4" />
              </span>
            </Link>
          )}

          {/*
            La descripcion. Primero la automatica —armada con los propios datos
            del inmueble, asi que el area, las alcobas y el barrio salen
            siempre— y debajo la del asesor, que es donde caben las cosas que no
            estan en ningun campo. Los portales y las redes exigen una
            descripcion, y la de WASI es texto libre: unas fichas traen tres
            lineas y otras un parrafo copiado del anuncio de otra agencia.
          */}
          <section>
            <h2 className="mb-3 text-xs font-bold tracking-widest uppercase">
              {t('property.section.description')}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {autoDescription(property, t)}
            </p>
            {property.observations?.trim() && (
              <p className="mt-3 text-sm leading-relaxed whitespace-pre-line">
                {property.observations.trim()}
              </p>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-xs font-bold tracking-widest uppercase">
              {t('property.section.details')}
            </h2>
            <SpecTable property={property} />
          </section>

          {property.features && property.features.length > 0 && (
            <FeatureList features={property.features} />
          )}

          <PropertyMap property={property} />
        </div>

        {/* En el tema original esta columna es `d-none d-lg-block` y en movil el
            contenido se apila debajo; aqui hace lo mismo con el orden natural. */}
        <aside className="flex min-w-0 flex-col gap-6 lg:col-span-4 xl:col-span-3">
          {/*
            Pegajoso mientras acompaña; suelto cuando estorba.

            Un `sticky` mas alto que la pantalla se queda clavado arriba y su
            parte de abajo no hay forma de alcanzarla: al desplegarse el
            formulario de visita, los ultimos campos y el boton quedaban fuera.

            Asi que en cuanto aparece el formulario —`:has()` lo detecta sin
            tener que subir estado desde el hijo— la columna se suelta y la
            pagina se desplaza como siempre. Rellenar un formulario es una tarea
            larga: ahi ya no aporta nada que el panel siga clavado.
          */}
          <div className="lg:sticky lg:top-24 lg:flex lg:flex-col lg:gap-6 lg:has-[#visit-firstName]:static">
            <AgentPanel property={property} />
            <div className="rounded-lg border bg-card p-5 shadow-sm">
              <VisitForm property={property} />
            </div>
          </div>
        </aside>
      </div>

      <Suspense fallback={null}>
        <Await resolve={siblings} errorElement={null}>
          {(units: Property[]) =>
            units.length > 0 && (
              <section className="mt-16">
                <SectionHeading
                  light={t('property.siblings.light')}
                  strong={
                    property.family
                      ? t('property.siblings.strong.family', {
                          name: property.family.name,
                        })
                      : t('property.siblings.strong')
                  }
                />
                <PropertyGrid properties={units} />
              </section>
            )
          }
        </Await>
      </Suspense>
    </div>
  )
}

async function share(
  t: (key: string, vars?: Record<string, string | number>) => string,
) {
  const url = window.location.href
  if (navigator.share) {
    try {
      await navigator.share({ title: document.title, url })
      return
    } catch {
      /* El visitante cancelo el dialogo del sistema: no es un error. */
      return
    }
  }
  await navigator.clipboard.writeText(url)
  toast.success(t('property.share.copied'))
}
