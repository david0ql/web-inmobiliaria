import {
  Building2,
  CalendarClock,
  Check,
  KeyRound,
  Layers,
  MapPin,
} from 'lucide-react'
import type { LoaderFunctionArgs } from 'react-router-dom'
import { Link, useLoaderData } from 'react-router-dom'

import { Badge } from '@/components/ui/misc'
import { Button } from '@/components/ui/button'
import { area as fmtArea, number, price } from '@/lib/format'
import {
  FAMILY_STATUS_COLOR,
  FAMILY_STATUS_LABEL,
  getProject,
  PROJECTS_PATH,
  type ProjectDetail,
  type UnitTypeSummary,
} from '@/lib/projects'
import { propertyPath } from '@/lib/slug'
import { ROUTES } from '@/lib/site'
import type { Property } from '@/lib/types'

export async function loader({
  params,
}: LoaderFunctionArgs): Promise<ProjectDetail> {
  return getProject(params.slug as string)
}

export function ProjectPage() {
  const { family, unitTypes, properties, amenities } =
    useLoaderData() as ProjectDetail

  const place = [family.zone?.name, family.city?.name, family.city?.region?.name]
    .filter(Boolean)
    .join(' · ')
  const available = unitTypes.reduce((sum, type) => sum + type.available, 0)
  const prices = unitTypes
    .map((type) => type.minPrice)
    .filter((value): value is number => value !== null && value > 0)
  const fromPrice = prices.length ? Math.min(...prices) : null

  /*
    Solo las cifras que dicen algo. "Unidades totales" sobra cuando coincide con
    las libres —es el caso de casi todos los proyectos entregados—, y una
    tipologia sin nombre no es una tipologia que contar.
  */
  // Una tipologia sin nombre no es una tipologia: es una unidad sin clasificar.
  const hayTipologias = unitTypes.some((type) => Boolean(type.unitType))

  const cifras = [
    unitTypes.length > 1 && {
      icon: Layers,
      label: 'Tipologías',
      value: number(unitTypes.length),
    },
    available > 0 && {
      icon: KeyRound,
      label: available === 1 ? 'Unidad libre' : 'Unidades libres',
      value: number(available),
    },
    family.totalUnits && family.totalUnits !== available
      ? {
          icon: Building2,
          label: 'Unidades totales',
          value: number(family.totalUnits),
        }
      : null,
    family.deliveryYear && {
      icon: CalendarClock,
      label: 'Entrega',
      value: String(family.deliveryYear),
    },
  ].filter(Boolean) as {
    icon: typeof Layers
    label: string
    value: string
  }[]

  return (
    <div className="container-site py-8">
      {/*
        La cabecera lleva a la derecha lo unico que decide: desde cuanto, y que
        hacer al respecto. Antes el precio flotaba solo, en gris, entre dos
        bloques, y no habia ninguna accion en toda la pagina: quien se
        interesaba tenia que volver a subir a buscar el telefono.
      */}
      <header className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
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
            <p className="mt-2 flex items-start gap-1.5 text-sm text-muted-foreground">
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
        </div>

        <div className="shrink-0 lg:text-right">
          {fromPrice !== null && (
            <p className="mb-3">
              <span className="block text-[0.625rem] tracking-widest text-muted-foreground uppercase">
                Desde
              </span>
              <span className="tabular text-2xl leading-none font-normal tracking-tight">
                {price(fromPrice)}
              </span>
            </p>
          )}
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button asChild>
              <Link to={ROUTES.contact}>Me interesa</Link>
            </Button>
            {/*
              Y un atajo a la primera unidad libre, que es donde se agenda la
              visita: la cita se pide sobre un inmueble concreto, no sobre el
              conjunto.
            */}
            {properties.length > 0 && (
              <Button asChild variant="outline">
                <Link to={propertyPath(properties[0])}>Agendar visita</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {family.coverUrl && (
        <div className="mb-8 overflow-hidden rounded-lg border bg-secondary">
          <img
            src={family.coverUrl}
            alt={family.name}
            className="h-[220px] w-full object-cover sm:h-[320px] lg:h-[420px]"
          />
        </div>
      )}

      {/*
        Las cifras, sin las que no dicen nada.

        Estaban las cuatro siempre: en un proyecto de lotes salia "Tipologias 1",
        "Unidades libres 10", "Unidades totales 10" y "Entrega —". Dos veces el
        mismo numero y un guion. Se pinta lo que existe y lo que aporta.
      */}
      {cifras.length > 0 && (
        <dl
          className="mb-10 grid gap-4 rounded-lg border bg-secondary/40 p-5"
          style={{
            gridTemplateColumns: `repeat(${Math.min(cifras.length, 2)}, minmax(0, 1fr))`,
          }}
        >
          {cifras.map((cifra) => (
            <Stat
              key={cifra.label}
              icon={cifra.icon}
              label={cifra.label}
              value={cifra.value}
            />
          ))}
        </dl>
      )}

      {/*
        Las tipologias, arriba del todo.

        Es lo que se viene a ver: cuantas formas hay, de que tamaño y a que
        precio. Estaban detras de la descripcion y de las etapas, es decir,
        detras de dos bloques de texto que nadie lee antes de saber si el
        proyecto le encaja.
      */}
      {/*
        La tabla de tipologias solo si hay tipologias de verdad.

        En Ruitoque salia una sola fila que decia "Sin clasificar · Lote /
        Terreno · — alcobas": una tabla entera para no decir nada, y encima
        repitiendo el rango de precio y de area que ya esta en la de unidades.
        Si nadie ha clasificado las unidades, la tabla de abajo ya lo cuenta
        todo, y mejor.
      */}
      {hayTipologias && (
        <section className="mb-10">
          <h2 className="mb-3 text-xs font-bold tracking-widest uppercase">
            Tipologías
          </h2>
          <UnitTypesTable unitTypes={unitTypes} />
        </section>
      )}

      {/*
        Y las zonas comunes debajo, que es lo segundo que se pregunta: si tiene
        piscina, si hay salon, si hay vigilancia.

        No salen de una tabla propia: son las caracteristicas EXTERNAS que
        comparten las unidades, que es lo mismo dicho de otra manera. Ver
        `amenidades()` en la API.
      */}
      {amenities.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-xs font-bold tracking-widest uppercase">
            Zonas comunes
          </h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm sm:grid-cols-3 lg:grid-cols-4">
            {amenities.map((amenity) => (
              <li key={amenity.id} className="flex min-w-0 items-center gap-2">
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

      {family.description && (
        <section className="mb-10">
          <h2 className="mb-3 text-xs font-bold tracking-widest uppercase">
            Descripción
          </h2>
          <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
            {family.description}
          </p>
        </section>
      )}

      {family.children && family.children.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-xs font-bold tracking-widest uppercase">
            Etapas y torres
          </h2>
          <ul className="flex flex-wrap gap-2">
            {family.children.map((child) => (
              <li key={child.id}>
                <Badge variant="outline" className="max-w-full">
                  <span className="truncate">{child.name}</span>
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/*
        Las unidades, en tabla y no en tarjetas.

        Con tarjetas parecian siete inmuebles distintos —misma foto, mismo
        titulo repetido siete veces, "APARTAMENTO EN VENTA EN BOSQUES DEL
        HATO"— cuando en realidad son siete apartamentos del mismo conjunto que
        solo se distinguen por metros, alcobas y precio. En una tabla esa
        diferencia esta en columnas y se compara de un vistazo, que es lo que
        de verdad se hace aqui.
      */}
      <section>
        <h2 className="mb-3 text-xs font-bold tracking-widest uppercase">
          Unidades disponibles
        </h2>
        {properties.length > 0 ? (
          <UnitsTable properties={properties} />
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-5 py-16 text-center">
            <KeyRound className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Ahora mismo no hay unidades disponibles en este proyecto.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to={ROUTES.sales}>Ver otros inmuebles</Link>
            </Button>
          </div>
        )}
      </section>
    </div>
  )
}

/**
 * La tabla de tipologias. Va dentro de su propio contenedor con scroll: son
 * seis columnas y en un movil de 320px no caben, pero lo que no puede pasar es
 * que empujen la pagina entera a lo ancho.
 */
/**
 * Las unidades del proyecto, en tabla.
 *
 * Con tarjetas parecian inmuebles distintos —misma foto, mismo titulo repetido
 * diez veces— cuando son diez unidades del mismo sitio que solo se diferencian
 * en metros, alcobas y precio. En columnas esa diferencia se compara de un
 * vistazo, que es lo que se hace aqui.
 *
 * Las columnas vacias no se pintan: en un proyecto de lotes, "Alcobas" y
 * "Baños" eran dos columnas enteras de guiones ocupando la mitad del ancho.
 */
function UnitsTable({ properties }: { properties: Property[] }) {
  const hay = (campo: 'bedrooms' | 'bathrooms' | 'garages') =>
    properties.some((property) => Number(property[campo]) > 0)

  const columnas = [
    { clave: 'bedrooms' as const, titulo: 'Alcobas' },
    { clave: 'bathrooms' as const, titulo: 'Baños' },
    { clave: 'garages' as const, titulo: 'Garajes' },
  ].filter((columna) => hay(columna.clave))

  return (
    <div className="w-full min-w-0 overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[34rem] text-sm">
        <thead className="bg-secondary/60 text-xs tracking-wide uppercase">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Unidad</th>
            <th className="px-4 py-3 text-left font-semibold">Tipo</th>
            <th className="px-4 py-3 text-right font-semibold">Área</th>
            {columnas.map((columna) => (
              <th
                key={columna.clave}
                className="px-4 py-3 text-right font-semibold"
              >
                {columna.titulo}
              </th>
            ))}
            <th className="px-4 py-3 text-right font-semibold">Precio</th>
            <th className="px-4 py-3 text-right font-semibold">
              <span className="sr-only">Ver</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {properties.map((property) => {
            const built = property.builtArea ?? property.area
            return (
              <tr key={property.id} className="border-t hover:bg-secondary/40">
                <td className="tabular px-4 py-3 font-medium">
                  {property.code}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {property.propertyType?.name ?? '—'}
                </td>
                <td className="tabular px-4 py-3 text-right whitespace-nowrap">
                  {built ? fmtArea(built) : '—'}
                </td>
                {columnas.map((columna) => (
                  <td
                    key={columna.clave}
                    className="tabular px-4 py-3 text-right"
                  >
                    {property[columna.clave] || '—'}
                  </td>
                ))}
                <td className="tabular px-4 py-3 text-right whitespace-nowrap">
                  {property.salePrice
                    ? price(property.salePrice)
                    : 'A consultar'}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={propertyPath(property)}
                    className="text-xs font-bold tracking-widest uppercase hover:underline"
                  >
                    Ver
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function UnitTypesTable({ unitTypes }: { unitTypes: UnitTypeSummary[] }) {
  return (
    <div className="w-full min-w-0 overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[36rem] text-sm">
        <thead className="bg-secondary/60 text-xs tracking-wide uppercase">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Tipología</th>
            <th className="px-4 py-3 text-left font-semibold">Tipo</th>
            <th className="px-4 py-3 text-right font-semibold">Alcobas</th>
            <th className="px-4 py-3 text-right font-semibold">Área</th>
            <th className="px-4 py-3 text-right font-semibold">Precio</th>
            <th className="px-4 py-3 text-right font-semibold">Libres</th>
          </tr>
        </thead>
        <tbody>
          {unitTypes.map((type, index) => (
            <tr
              key={`${type.unitType ?? 'sin-tipologia'}-${type.propertyType}-${index}`}
              className="border-t"
            >
              <td className="px-4 py-3 font-medium">
                {type.unitType ?? 'Sin clasificar'}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {type.propertyType}
              </td>
              <td className="tabular px-4 py-3 text-right">
                {type.bedrooms ?? '—'}
              </td>
              <td className="tabular px-4 py-3 text-right whitespace-nowrap">
                {areaRange(type.minArea, type.maxArea)}
              </td>
              <td className="tabular px-4 py-3 text-right whitespace-nowrap">
                {priceRange(type.minPrice, type.maxPrice)}
              </td>
              <td className="tabular px-4 py-3 text-right">
                {type.available} / {type.units}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** "78 m²" si el rango es un solo valor, "78 – 84 m²" si son dos. */
function areaRange(min: number | null, max: number | null): string {
  if (min === null || max === null || min === max) return fmtArea(min ?? max)
  return `${number(min)} – ${fmtArea(max)}`
}

function priceRange(min: number | null, max: number | null): string {
  if (min === null || max === null || min === max) return price(min ?? max)
  return `${price(min)} – ${price(max)}`
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Layers
  label: string
  value: string
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </dt>
      <dd className="tabular mt-1 truncate text-lg font-semibold">{value}</dd>
    </div>
  )
}
