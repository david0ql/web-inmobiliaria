import { Check, MapPin } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { LoaderFunctionArgs } from 'react-router-dom'
import { Link, useLoaderData } from 'react-router-dom'

import { Lightbox } from '@/components/common/lightbox'
import { UnitPhotos } from '@/components/project/unit-photos'
import { AgentPanel } from '@/components/property/agent-panel'
import { PropertyMap } from '@/components/property/property-map'
import { SpecTable } from '@/components/property/spec-table'
import { VisitForm } from '@/components/property/visit-form'
import { Badge } from '@/components/ui/misc'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { area as fmtArea, price } from '@/lib/format'
import {
  FAMILY_STATUS_COLOR,
  FAMILY_STATUS_LABEL,
  getProject,
  PROJECTS_PATH,
  type ProjectDetail,
} from '@/lib/projects'
import { ROUTES } from '@/lib/site'
import type { Property } from '@/lib/types'

export async function loader({
  params,
}: LoaderFunctionArgs): Promise<ProjectDetail> {
  return getProject(params.slug as string)
}

/**
 * El proyecto, contado como se cuenta un inmueble.
 *
 * Antes era otra cosa: tablas, cifras sueltas y ninguna accion. Pero quien
 * entra aqui viene de ver fichas y ya sabe leerlas —fotos arriba, precio
 * debajo, detalles, mapa y el asesor a un lado—, asi que la pagina usa esas
 * mismas piezas y no unas propias que hay que aprender.
 *
 * Lo unico que cambia es el desplegable: un proyecto no tiene UN precio ni UNAS
 * alcobas, tiene tantos como unidades libres. Al elegir una se recalcula la
 * ficha entera —precio, detalles, mapa, asesor y formulario de visita— sin
 * salir de la pagina.
 */
export function ProjectPage() {
  const { family, properties, amenities } = useLoaderData() as ProjectDetail
  const [selectedId, setSelectedId] = useState(properties[0]?.id ?? '')
  const [portadaAbierta, setPortadaAbierta] = useState(false)

  const selected = useMemo(
    () => properties.find((p) => p.id === selectedId) ?? properties[0],
    [properties, selectedId],
  )

  /*
    Arriba, una sola foto: la del proyecto.

    Es la que dice donde estas, y no tiene por que cambiar al cambiar de unidad
    —el edificio es el mismo—. Las fotos del interior van abajo, pegadas al
    desplegable que las decide. Si el proyecto no tiene portada cargada se usa
    la de la unidad con mas fotos, que en la practica es una aerea del conjunto.
  */
  const portada = useMemo(() => {
    if (family.coverUrl) return family.coverUrl
    const mejor = properties.reduce(
      (mejor, property) =>
        (property.images?.length ?? 0) > (mejor?.images?.length ?? 0)
          ? property
          : mejor,
      properties[0],
    )
    const imagen = mejor?.images?.[0]
    return imagen?.urlLarge ?? imagen?.url ?? null
  }, [family.coverUrl, properties])

  const place = [family.zone?.name, family.city?.name, family.city?.region?.name]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="container-site py-8">
      <header className="mb-6">
        <p className="mb-2 flex flex-wrap items-center gap-2 text-xs tracking-widest text-muted-foreground uppercase">
          <Link to={PROJECTS_PATH} className="hover:underline">
            Proyectos
          </Link>
          <span aria-hidden="true">·</span>
          <Badge
            variant="tag"
            style={{ backgroundColor: FAMILY_STATUS_COLOR[family.status] }}
          >
            {FAMILY_STATUS_LABEL[family.status] ?? family.status}
          </Badge>
        </p>

        <h1 className="tt-square text-xl leading-tight font-semibold uppercase sm:text-2xl">
          {family.name}
        </h1>

        {(place || family.address) && (
          <p className="mt-3 flex items-start gap-1.5 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 size-4 shrink-0" />
            <span className="min-w-0">
              {[family.address, place].filter(Boolean).join(' · ')}
            </span>
          </p>
        )}

        {family.developer && (
          <p className="mt-1 text-sm text-muted-foreground">
            Promotor: <span className="font-medium">{family.developer}</span>
          </p>
        )}
      </header>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-8 lg:col-span-8 xl:col-span-9">
          {portada && (
            <>
              {/* La portada tambien se amplia: esta recortada a 420 px de alto
                  y es la unica foto del conjunto entero. */}
              <button
                type="button"
                onClick={() => setPortadaAbierta(true)}
                aria-label={`Ampliar la foto de ${family.name}`}
                className="block cursor-zoom-in overflow-hidden rounded-lg border bg-secondary"
              >
                <img
                  src={portada}
                  alt={family.name}
                  className="h-[240px] w-full object-cover sm:h-[340px] lg:h-[420px]"
                />
              </button>
              <Lightbox
                images={[
                  {
                    id: 'portada',
                    url: portada,
                    urlMedium: portada,
                    urlLarge: portada,
                    urlOriginal: portada,
                    description: family.name,
                    position: 1,
                    isMain: true,
                    width: null,
                    height: null,
                  },
                ]}
                index={portadaAbierta ? 0 : null}
                onIndex={(i) => setPortadaAbierta(i !== null)}
                title={family.name}
              />
            </>
          )}

          {selected ? (
            <>
              {/*
                El desplegable es la pieza propia de esta pagina, y por eso va
                pegado a las fotos y antes que el precio: es lo que decide todas
                las cifras que vienen debajo.
              */}
              <div className="rounded-lg border bg-card p-5 shadow-sm">
                <label
                  htmlFor="unidad"
                  className="mb-1.5 block text-xs tracking-widest text-muted-foreground uppercase"
                >
                  Tipologías
                </label>
                <Select
                  value={selected.id}
                  onValueChange={setSelectedId}
                  disabled={properties.length === 1}
                >
                  <SelectTrigger id="unidad" aria-label="Unidad del proyecto">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        {etiqueta(property)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <UnitPhotos
                images={selected.images ?? []}
                title={`${family.name} · ${selected.code}`}
              />

              {/*
                El codigo y el precio van en su propia caja, la misma que en la
                ficha de inmueble. Elegir y leer son dos gestos distintos:
                juntarlos en un solo recuadro hacia que el precio pareciera
                parte del formulario.
              */}
              <div className="flex flex-wrap items-end justify-between gap-4 rounded-lg border bg-secondary/40 px-5 py-4">
                <div>
                  <p className="text-xs tracking-widest text-muted-foreground uppercase">
                    Código
                  </p>
                  <p className="tabular text-lg font-semibold">
                    {selected.code}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs tracking-widest text-muted-foreground uppercase">
                    Precio de venta
                  </p>
                  <p className="tabular text-2xl leading-tight font-normal tracking-tight">
                    {selected.salePrice ? price(selected.salePrice) : '—'}{' '}
                    <small className="text-xs text-muted-foreground">
                      {selected.currency?.iso ?? 'COP'}
                    </small>
                  </p>
                </div>
              </div>

              {family.description && (
                <section>
                  <h2 className="mb-3 text-xs font-bold tracking-widest uppercase">
                    Descripción
                  </h2>
                  <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                    {family.description}
                  </p>
                </section>
              )}

              <section>
                <h2 className="mb-3 text-xs font-bold tracking-widest uppercase">
                  Detalles de la unidad
                </h2>
                <SpecTable property={selected} />
              </section>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-5 py-16 text-center">
              <p className="text-sm text-muted-foreground">
                Ahora mismo no hay unidades disponibles en este proyecto.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to={ROUTES.sales}>Ver otros inmuebles</Link>
              </Button>
            </div>
          )}

          {/*
            Las zonas comunes no salen de un campo del proyecto: son las
            caracteristicas EXTERNAS que comparten sus unidades, que es lo mismo
            dicho de otra manera. Ver `amenidades()` en la API.
          */}
          {amenities.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-bold tracking-widest uppercase">
                Zonas comunes
              </h2>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm sm:grid-cols-3">
                {amenities.map((amenity) => (
                  <li
                    key={amenity.id}
                    className="flex min-w-0 items-center gap-2"
                  >
                    <Check
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="truncate">{amenity.name}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {selected && <PropertyMap property={selected} />}
        </div>

        {selected && (
          <aside className="flex min-w-0 flex-col gap-6 lg:col-span-4 xl:col-span-3">
            <div className="lg:sticky lg:top-24 lg:flex lg:flex-col lg:gap-6">
              <AgentPanel property={selected} />
              <div className="rounded-lg border bg-card p-5 shadow-sm">
                {/*
                  La visita se agenda sobre la unidad elegida y no sobre el
                  proyecto: la agenda es del asesor que la tiene asignada y el
                  cupo depende de ese inmueble concreto. La `key` fuerza a
                  empezar de cero al cambiar: las horas libres de una unidad no
                  valen para otra.
                */}
                <VisitForm key={selected.id} property={selected} />
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}

/** Lo que se lee en el desplegable: por lo que se elige una unidad. */
function etiqueta(property: Property): string {
  const built = property.builtArea ?? property.area
  return [
    property.propertyType?.name,
    built ? fmtArea(built) : null,
    property.bedrooms ? `${property.bedrooms} alcobas` : null,
    property.salePrice ? price(property.salePrice) : null,
  ]
    .filter(Boolean)
    .join(' · ')
}
