import { Bath, BedDouble, Car, Ruler } from 'lucide-react'
import { Link } from '@/lib/nav'

import { CardCarousel } from '@/components/common/card-carousel'
import { cuerpoDelPrecio } from '@/lib/precio-tipografia'
import { UnaLinea } from '@/components/common/una-linea'
import { BotonMeGusta } from '@/components/property/boton-me-gusta'
import { SpecRow } from '@/components/common/spec-row'
import { prefetchProperty } from '@/lib/api'
import { Badge } from '@/components/ui/misc'
import {AVAILABILITY_COLOR, AVAILABILITY_LABEL, area as fmtArea, stratumLabel} from '@/lib/format'
import { useCurrency } from '@/lib/currency'
import { useCatalogo } from '@/lib/catalog-i18n'
import { useIdioma, useT } from '@/lib/i18n'
import { propertyPath } from '@/lib/slug'
import type { Property, PropertyImage } from '@/lib/types'
import { soloFotos } from '@/lib/projects'
import { cn } from '@/lib/utils'

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
  dense = false,
  onHoverChange,
}: {
  property: Property
  /** La portada de las primeras tarjetas suele ser el LCP: esa no se difiere. */
  priority?: boolean
  /**
   * La misma tarjeta, apretada, para la ventanita del mapa.
   *
   * Antes el globo del mapa llevaba una tarjeta propia —otra foto, otros
   * cuerpos de letra, otro boton— y quien pulsaba una chincheta tenia que
   * volver a leerlo todo para comparar con lo que ya habia visto en la lista.
   * Es la misma decision, asi que es la misma tarjeta: solo cambia el alto de
   * la foto y el aire, porque el globo no puede tapar el mapa que se esta
   * usando para elegir.
   */
  dense?: boolean
  /** Para que el mapa sepa que tarjeta esta mirando el raton. */
  onHoverChange?: (hovering: boolean) => void
}) {
  const t = useT()
  const { idioma } = useIdioma()
  const { precio, moneda } = useCurrency()
  const { tipo, titulo } = useCatalogo()
  const to = propertyPath(property)
  /* Sin planos: la tarjeta de un listado enseña de que casa se trata, y un
     dibujo de la distribucion de portada no lo dice. */
  const fotos = soloFotos(property.images)
  const cover = fotos[0]
  const built = property.builtArea ?? property.area
  const importe = precio(property.salePrice ?? property.rentPrice)
  /* El estrato, con su separador. */
  const estrato = stratumLabel(property.stratum, t)
  /* Codigo, barrio, ciudad y estrato en una sola cadena: va a una linea y el
     globo del hover necesita el texto en plano, no un arbol de nodos. */
  const ubicacion =
    t('property.card.code', { code: property.code }) +
    (property.zone ? ` · ${property.zone.name}` : '') +
    (property.city ? ` · ${property.city.name}` : '') +
    estrato

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
      sizes={dense ? '300px' : '(min-width: 992px) 360px, (min-width: 576px) 50vw, 100vw'}
      alt={
        image.description ??
        (indice === 0
          ? titulo(property)
          : t('property.card.photo.alt', {
              title: titulo(property),
              index: indice + 1,
            }))
      }
      width={dense ? 300 : 560}
      height={dense ? 160 : 280}
      loading={priority && indice === 0 ? 'eager' : 'lazy'}
      fetchPriority={priority && indice === 0 ? 'high' : 'auto'}
      decoding="async"
      className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
    />
  )

  return (
    <article
      onMouseEnter={() => {
        warm()
        onHoverChange?.(true)
      }}
      onMouseLeave={() => onHoverChange?.(false)}
      onFocusCapture={() => onHoverChange?.(true)}
      onBlurCapture={() => onHoverChange?.(false)}
      onTouchStart={warm}
      className={cn(
        'group flex flex-col overflow-hidden rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-md',
        dense && 'w-[300px] text-foreground',
      )}
    >
      <figure className="relative m-0">
        <div
          className={cn(
            'relative overflow-hidden bg-secondary',
            dense ? 'h-[160px]' : 'h-[280px]',
          )}
        >
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
            {/* La foto conserva su color al pasar el ratón. El oscurecimiento
                anterior ocultaba justo la información visual que la persona
                estaba comparando; el título y el cursor ya comunican que la
                tarjeta abre el detalle. */}
          </Link>
        </div>

        {/* El corazon, en la esquina libre: la de la izquierda la ocupa la
            etiqueta de disponibilidad. */}
        <div className="absolute top-2 right-2 z-20">
          <BotonMeGusta code={property.code} />
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

      <div className={cn('flex flex-1 flex-col', dense ? 'gap-1 p-3' : 'gap-2 p-4')}>
        <p className="text-xs tracking-wide text-muted-foreground uppercase">
          {tipo(property.propertyType) ?? t('property.card.fallback_type')}
        </p>
        <UnaLinea
          as="h2"
          texto={titulo(property)}
          className="text-sm leading-snug font-semibold uppercase"
        >
          <Link to={to} className="hover:underline">
            {titulo(property)}
          </Link>
        </UnaLinea>
        <UnaLinea
          as="p"
          texto={ubicacion}
          className="text-xs text-muted-foreground"
        />
      </div>

      {/*
        Precio y "Detalle" en la misma franja. Estaban en dos, una debajo de la
        otra: la tarjeta era mas alta y en una rejilla de tres eso son casi cien
        pixeles de portada para no decir nada nuevo.
      */}
      {/*
        La franja mide siempre lo mismo, y el precio nunca parte.

        Con el precio y la moneda en una linea normal, "$1.450.000.000 COP" no
        cabia y la moneda bajaba sola: esa tarjeta quedaba 20 px mas alta que la
        de al lado y la fila volvia a verse como un diente de sierra, justo lo
        que se arreglo arriba poniendo el titulo a una linea.

        El tamaño lo decide la propia cifra: casi todo el inventario entra
        holgado y se lee grande, y solo los pocos de cuatro cifras de millones
        bajan un punto. Encoger todos por igual —que es lo que hace un `clamp`
        sobre el ancho de la tarjeta— dejaba "$550.000.000" en 15 px por culpa
        de un inmueble de 18.000 millones que nadie esta mirando.

        El alto va fijado aparte de todos modos: es la garantia de que la fila
        se alinea aunque algun dia cambie la tipografia o la moneda.
      */}
      <div className={cn('flex items-stretch border-t', dense ? 'min-h-12' : 'min-h-14')}>
        <p
          className={cn(
            'tabular flex-1 leading-none font-normal tracking-tight whitespace-nowrap',
            dense ? 'px-3 py-2.5' : 'px-4 py-3',
            cuerpoDelPrecio(importe, dense),
          )}
        >
          {importe}{' '}
          <small className="text-[0.625rem] tracking-widest text-muted-foreground uppercase">
            {moneda}
          </small>
        </p>
        <Link
          to={to}
          className={cn(
            'flex shrink-0 items-center border-l bg-primary text-xs font-bold tracking-widest text-primary-foreground uppercase transition-opacity hover:opacity-90',
            dense ? 'px-3.5' : 'px-5',
          )}
        >
          {t('property.card.detail')}
        </Link>
      </div>
    </article>
  )
}
