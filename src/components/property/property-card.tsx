import { Bath, BedDouble, Car, Ruler } from 'lucide-react'
import { Link } from '@/lib/nav'

import { CardCarousel } from '@/components/common/card-carousel'
import { SpecRow } from '@/components/common/spec-row'
import { prefetchProperty } from '@/lib/api'
import { Badge } from '@/components/ui/misc'
import {AVAILABILITY_COLOR, AVAILABILITY_LABEL, area as fmtArea, stratumLabel} from '@/lib/format'
import { useCurrency } from '@/lib/currency'
import { useCatalogo } from '@/lib/catalog-i18n'
import { useIdioma, useT } from '@/lib/i18n'
import { propertyPath } from '@/lib/slug'
import type { Property, PropertyImage } from '@/lib/types'

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
  const t = useT()
  const { idioma } = useIdioma()
  const { precio, moneda } = useCurrency()
  const { tipo, titulo } = useCatalogo()
  const to = propertyPath(property)
  const fotos = property.images ?? []
  const cover = fotos[0]
  const built = property.builtArea ?? property.area
  /* El estrato, con su separador. */
  const estrato = stratumLabel(property.stratum, t)

  /* Al apuntar a una tarjeta se adelantan las dos cosas que hacen falta para
     pintar la ficha: su codigo de pantalla y sus datos. */
  const warm = () => {
    void import('@/routes/property')
    prefetchProperty(property.code)
  }

  /*
    Una foto de la tarjeta. Solo la primera puede ser el LCP de la portada, asi
    que solo esa hereda el `priority`; las demas se montan cuando alguien pasa a
    ellas y para entonces ya no compiten con el primer pintado.
  */
  const foto = (image: PropertyImage, indice: number) => (
    <img
      key={image.id}
      src={image.url}
      /*
        El paso intermedio de 1024 px existe por el movil: una
        tarjeta ocupa 412 px logicos, que a densidad 1,75 son 721 px
        reales. Sin el, el navegador se saltaba el thumb y bajaba la
        de 1600 px — 405 kB por tarjeta en vez de 120.
      */
      srcSet={[
        `${image.url} 560w`,
        image.urlMedium ? `${image.urlMedium} 800w` : '',
        `${image.urlLarge} 1600w`,
      ]
        .filter(Boolean)
        .join(', ')}
      sizes="(min-width: 992px) 360px, (min-width: 576px) 50vw, 100vw"
      alt={
        image.description ??
        (indice === 0
          ? titulo(property)
          : t('property.card.photo.alt', {
              title: titulo(property),
              index: indice + 1,
            }))
      }
      width={560}
      height={280}
      loading={priority && indice === 0 ? 'eager' : 'lazy'}
      fetchPriority={priority && indice === 0 ? 'high' : 'auto'}
      decoding="async"
      className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
    />
  )

  return (
    <article
      onMouseEnter={warm}
      onTouchStart={warm}
      className="group flex flex-col overflow-hidden rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-md"
    >
      <figure className="relative m-0">
        <div className="relative h-[280px] overflow-hidden bg-secondary">
          {fotos.length > 1 ? (
            <CardCarousel
              total={fotos.length}
              renderSlide={(indice, cargada) =>
                cargada ? (
                  foto(fotos[indice], indice)
                ) : (
                  /* El hueco guarda el sitio de la foto que aun no toca bajar. */
                  <div className="size-full bg-secondary" aria-hidden="true" />
                )
              }
            />
          ) : cover ? (
            foto(cover, 0)
          ) : (
            <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
              {t('property.card.no_photo')}
            </div>
          )}

          {/*
            El enlace se pinta encima de la foto en lugar de envolverla: dentro
            de un `<a>` no pueden ir los botones del carrusel, y encima puede
            quedar por debajo de ellos con el `z-index`.
          */}
          <Link
            to={to}
            className="absolute inset-0 z-10 block"
            onFocus={warm}
            aria-label={titulo(property)}
          >
            {/* La cortina con el boton centrado solo aparece donde hay raton. */}
            <div className="absolute inset-0 hidden items-center justify-center bg-black/70 opacity-0 transition-opacity duration-300 group-hover:opacity-100 lg:flex">
              <span className="rounded-sm border-2 border-white px-3 py-2 text-xs font-bold tracking-wide text-white uppercase">
                {t('property.card.view_details')}
              </span>
            </div>
          </Link>
        </div>

        <div className="absolute top-2.5 left-2.5 z-20">
          <Badge
            variant="tag"
            style={{
              backgroundColor:
                AVAILABILITY_COLOR[property.availability] ?? '#767676',
            }}
          >
            {AVAILABILITY_LABEL[property.availability]
              ? t(AVAILABILITY_LABEL[property.availability])
              : property.availability}
          </Badge>
        </div>
      </figure>

      <SpecRow
        specs={[
          { icon: Ruler, value: built ? fmtArea(built, idioma) : null },
          {
            icon: BedDouble,
            value: property.bedrooms,
            unit:
              property.bedrooms === 1
                ? t('property.spec.bedrooms.one')
                : t('property.spec.bedrooms.other'),
          },
          {
            icon: Bath,
            value: property.bathrooms,
            unit:
              property.bathrooms === 1
                ? t('property.spec.bathrooms.one')
                : t('property.spec.bathrooms.other'),
          },
          {
            icon: Car,
            value: property.garages,
            unit:
              property.garages === 1
                ? t('property.spec.garages.one')
                : t('property.spec.garages.other'),
          },
        ]}
      />

      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">
          {tipo(property.propertyType) ?? t('property.card.fallback_type')}
        </p>
        <h2 className="line-clamp-2-title text-sm leading-snug font-semibold uppercase">
          <Link to={to} className="hover:underline">
            {titulo(property)}
          </Link>
        </h2>
        <p className="line-clamp-2-title text-xs text-muted-foreground">
          {t('property.card.code', { code: property.code })}
          {property.zone ? ` · ${property.zone.name}` : ''}
          {property.city ? ` · ${property.city.name}` : ''}
          {estrato}
        </p>
      </div>

      {/*
        Precio y "Detalle" en la misma franja. Estaban en dos, una debajo de la
        otra: la tarjeta era mas alta y en una rejilla de tres eso son casi cien
        pixeles de portada para no decir nada nuevo.
      */}
      <div className="flex items-stretch border-t">
        <p className="tabular flex-1 px-4 py-3 text-xl leading-none font-normal tracking-tight">
          {precio(property.salePrice ?? property.rentPrice)}{' '}
          <small className="text-[0.625rem] tracking-widest text-muted-foreground uppercase">
            {moneda}
          </small>
        </p>
        <Link
          to={to}
          className="flex shrink-0 items-center border-l bg-primary px-5 text-xs font-bold tracking-widest text-primary-foreground uppercase transition-opacity hover:opacity-90"
        >
          {t('property.card.detail')}
        </Link>
      </div>
    </article>
  )
}

