import { Bath, BedDouble, Car, Ruler } from 'lucide-react'
import { Link } from 'react-router-dom'

import { prefetchProperty } from '@/lib/api'
import { Badge } from '@/components/ui/misc'
import {
  AVAILABILITY_COLOR,
  AVAILABILITY_LABEL,
  area as fmtArea,
  price,
  stratumLabel,
} from '@/lib/format'
import { propertyPath } from '@/lib/slug'
import type { Property } from '@/lib/types'

/**
 * La tarjeta del listado, calcada de la del tema: foto con la etiqueta de estado
 * arriba a la izquierda, cortina oscura con "VER DETALLES" al pasar el raton,
 * franja de cifras, tipo, titulo a dos lineas, resumen, precio y "DETALLE".
 *
 * La foto va a 280px de alto fijo para que la rejilla no baile: las imagenes del
 * inventario vienen de WASI con proporciones muy distintas.
 */
export function PropertyCard({
  property,
  priority = false,
}: {
  property: Property
  /** La portada de las primeras tarjetas suele ser el LCP: esa no se difiere. */
  priority?: boolean
}) {
  const to = propertyPath(property)
  const cover = property.images?.[0]
  const built = property.builtArea ?? property.area

  /* Al apuntar a una tarjeta se adelantan las dos cosas que hacen falta para
     pintar la ficha: su codigo de pantalla y sus datos. */
  const warm = () => {
    void import('@/routes/property')
    prefetchProperty(property.code)
  }

  return (
    <article
      onMouseEnter={warm}
      onTouchStart={warm}
      className="group flex flex-col overflow-hidden rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-md"
    >
      <figure className="relative m-0">
        <Link to={to} className="block" onFocus={warm}>
          <div className="relative h-[280px] overflow-hidden bg-secondary">
            {cover ? (
              <img
                src={cover.url}
                /*
                  El paso intermedio de 1024 px existe por el movil: una
                  tarjeta ocupa 412 px logicos, que a densidad 1,75 son 721 px
                  reales. Sin el, el navegador se saltaba el thumb y bajaba la
                  de 1600 px — 405 kB por tarjeta en vez de 120.
                */
                srcSet={[
                  `${cover.url} 560w`,
                  cover.urlMedium ? `${cover.urlMedium} 800w` : '',
                  `${cover.urlLarge} 1600w`,
                ]
                  .filter(Boolean)
                  .join(', ')}
                sizes="(min-width: 992px) 360px, (min-width: 576px) 50vw, 100vw"
                alt={cover.description ?? property.title}
                width={560}
                height={280}
                loading={priority ? 'eager' : 'lazy'}
                fetchPriority={priority ? 'high' : 'auto'}
                decoding="async"
                className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                Sin fotografía
              </div>
            )}

            {/* La cortina con el boton centrado solo aparece donde hay raton. */}
            <div className="absolute inset-0 hidden items-center justify-center bg-black/70 opacity-0 transition-opacity duration-300 group-hover:opacity-100 lg:flex">
              <span className="rounded-sm border-2 border-white px-3 py-2 text-xs font-bold tracking-wide text-white uppercase">
                Ver detalles
              </span>
            </div>
          </div>
        </Link>

        <div className="absolute top-2.5 left-2.5">
          <Badge
            variant="tag"
            style={{
              backgroundColor:
                AVAILABILITY_COLOR[property.availability] ?? '#767676',
            }}
          >
            {AVAILABILITY_LABEL[property.availability] ?? property.availability}
          </Badge>
        </div>
      </figure>

      {/*
        Dos columnas siempre. En una tarjeta de rejilla de tres, cuatro columnas
        dejan 80px por celda y "10 Garajes" acaba en "10 Gara…"; el icono ya dice
        de que se habla, asi que la cifra va sola y cabe entera.
      */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-b bg-secondary/50 px-4 py-3 text-xs">
        <Spec icon={Ruler} value={built ? fmtArea(built) : null} />
        <Spec
          icon={BedDouble}
          value={property.bedrooms}
          unit={property.bedrooms === 1 ? 'alcoba' : 'alcobas'}
        />
        <Spec
          icon={Bath}
          value={property.bathrooms}
          unit={property.bathrooms === 1 ? 'baño' : 'baños'}
        />
        <Spec
          icon={Car}
          value={property.garages}
          unit={property.garages === 1 ? 'garaje' : 'garajes'}
        />
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">
          {property.propertyType?.name ?? 'Inmueble'}
        </p>
        <h2 className="line-clamp-2-title text-sm leading-snug font-semibold uppercase">
          <Link to={to} className="hover:underline">
            {property.title}
          </Link>
        </h2>
        <p className="line-clamp-2-title text-xs text-muted-foreground">
          Código: {property.code}
          {property.zone ? ` · ${property.zone.name}` : ''}
          {property.city ? ` · ${property.city.name}` : ''}
          {stratumLabel(property.stratum)}
        </p>
      </div>

      {/*
        Precio y "Detalle" en la misma franja. Estaban en dos, una debajo de la
        otra: la tarjeta era mas alta y en una rejilla de tres eso son casi cien
        pixeles de portada para no decir nada nuevo.
      */}
      <div className="flex items-stretch border-t">
        <p className="tabular flex-1 px-4 py-3 text-xl leading-none font-normal tracking-tight">
          {price(property.salePrice ?? property.rentPrice)}{' '}
          <small className="text-[0.625rem] tracking-widest text-muted-foreground uppercase">
            {property.currency?.iso ?? 'COP'}
          </small>
        </p>
        <Link
          to={to}
          className="flex shrink-0 items-center border-l bg-primary px-5 text-xs font-bold tracking-widest text-primary-foreground uppercase transition-opacity hover:opacity-90"
        >
          Detalle
        </Link>
      </div>
    </article>
  )
}

function Spec({
  icon: Icon,
  value,
  unit,
}: {
  icon: typeof Ruler
  value: string | number | null
  unit?: string
}) {
  if (!value) return null
  const text = unit ? `${value} ${unit}` : String(value)
  return (
    <div
      className="flex min-w-0 items-center gap-1.5 text-muted-foreground"
      title={text}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="tabular truncate text-foreground">{text}</span>
    </div>
  )
}
