import { autoDescription } from '@/lib/auto-description'
import { SITE } from '@/lib/site'
import type { Property } from '@/lib/types'

/**
 * Metadatos y datos estructurados.
 *
 * El sitio se pinta en el cliente, asi que las etiquetas se inyectan en el
 * `<head>` al montar cada ruta. Google renderiza JavaScript y las lee; lo que
 * NO las lee es el previsualizador de WhatsApp ni el de Facebook, que solo
 * miran el HTML servido. Para que compartir una ficha se vea bien hace falta
 * pregenerar el HTML por ruta — pendiente, y anotado en el README.
 */

export interface Meta {
  title: string
  description: string
  canonical: string
  image?: string
  /** `article` para una ficha, `website` para el resto. */
  type?: string
  noindex?: boolean
}

const MAX_DESCRIPTION = 158

function upsert(selector: string, attrs: Record<string, string>) {
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement(selector.startsWith('link') ? 'link' : 'meta')
    document.head.appendChild(el)
  }
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value)
}

export function applyMeta(meta: Meta) {
  const description = meta.description.slice(0, MAX_DESCRIPTION)
  const image = meta.image
    ? new URL(meta.image, SITE.url).toString()
    : `${SITE.url}/logo.png`

  document.title = meta.title

  upsert('meta[name="description"]', { name: 'description', content: description })
  upsert('link[rel="canonical"]', { rel: 'canonical', href: meta.canonical })
  upsert('meta[name="robots"]', {
    name: 'robots',
    // `max-image-preview:large` es lo que hace que la foto salga grande en el
    // resultado de busqueda, que en inmobiliaria es media pelea ganada.
    content: meta.noindex
      ? 'noindex, nofollow'
      : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
  })

  upsert('meta[property="og:title"]', { property: 'og:title', content: meta.title })
  upsert('meta[property="og:description"]', {
    property: 'og:description',
    content: description,
  })
  upsert('meta[property="og:url"]', { property: 'og:url', content: meta.canonical })
  upsert('meta[property="og:type"]', { property: 'og:type', content: meta.type ?? 'website' })
  upsert('meta[property="og:image"]', { property: 'og:image', content: image })
  upsert('meta[property="og:locale"]', { property: 'og:locale', content: 'es_CO' })

  upsert('meta[name="twitter:card"]', {
    name: 'twitter:card',
    content: 'summary_large_image',
  })
  upsert('meta[name="twitter:title"]', { name: 'twitter:title', content: meta.title })
  upsert('meta[name="twitter:description"]', {
    name: 'twitter:description',
    content: description,
  })
  upsert('meta[name="twitter:image"]', { name: 'twitter:image', content: image })
}

/** Reemplaza el bloque de datos estructurados de la ruta actual. */
export function applyJsonLd(id: string, data: unknown) {
  const attr = `data-jsonld-${id}`
  document.head.querySelector(`script[${attr}]`)?.remove()
  if (!data) return

  const script = document.createElement('script')
  script.type = 'application/ld+json'
  script.setAttribute(attr, '')
  script.textContent = JSON.stringify(data)
  document.head.appendChild(script)
}

// --- bloques reutilizables --------------------------------------------------

/**
 * La agencia. Va en todas las paginas porque es lo que enlaza el sitio con la
 * ficha de negocio y con el mapa: `RealEstateAgent` es el tipo que Google
 * entiende para una inmobiliaria, no `Organization` a secas.
 */
export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    '@id': `${SITE.url}/#organization`,
    name: SITE.name,
    url: SITE.url,
    logo: `${SITE.url}/logo.png`,
    image: `${SITE.url}/logo.png`,
    description: SITE.description,
    telephone: SITE.phone,
    email: SITE.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: SITE.address,
      addressLocality: 'Bucaramanga',
      addressRegion: 'Santander',
      addressCountry: 'CO',
    },
    areaServed: SITE.areaServed.map((name) => ({
      '@type': 'City',
      name,
    })),
    sameAs: SITE.social,
    priceRange: '$$',
    currenciesAccepted: 'COP',
  }
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE.url}/#website`,
    url: SITE.url,
    name: SITE.name,
    inLanguage: 'es-CO',
    publisher: { '@id': `${SITE.url}/#organization` },
    // Habilita la caja de busqueda dentro del resultado de Google.
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE.url}/s?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

export function breadcrumbJsonLd(trail: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((step, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: step.name,
      item: new URL(step.url, SITE.url).toString(),
    })),
  }
}

/**
 * Una ficha de inmueble.
 *
 * Se declara como `Residence` con su `offers`, que es lo que permite a Google
 * mostrar precio, area y numero de habitaciones en el resultado. `RealEstateListing`
 * envuelve a la pagina en si.
 */
export function propertyJsonLd(property: Property, url: string) {
  const images = (property.images ?? [])
    .slice(0, 6)
    .map((image) => new URL(image.urlLarge || image.url, SITE.url).toString())

  const price = property.salePrice ?? property.rentPrice

  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    '@id': url,
    url,
    name: property.title,
    // La automatica y no `observations`: los datos estructurados los leen los
    // portales, y ahi hace falta que el area y las alcobas aparezcan siempre.
    description: autoDescription(property).slice(0, 400),
    datePosted: property.createdAt,
    image: images.length ? images : undefined,
    provider: { '@id': `${SITE.url}/#organization` },
    mainEntity: {
      '@type': 'Residence',
      name: property.title,
      address: {
        '@type': 'PostalAddress',
        streetAddress: property.address ?? undefined,
        addressLocality: property.city?.name,
        addressRegion: 'Santander',
        addressCountry: 'CO',
      },
      geo:
        property.latitude != null && property.longitude != null
          ? {
              '@type': 'GeoCoordinates',
              latitude: property.latitude,
              longitude: property.longitude,
            }
          : undefined,
      numberOfRooms: property.bedrooms ?? undefined,
      numberOfBathroomsTotal: property.bathrooms ?? undefined,
      floorSize: property.area
        ? { '@type': 'QuantitativeValue', value: property.area, unitCode: 'MTK' }
        : undefined,
      yearBuilt: property.buildingYear ?? undefined,
    },
    offers: price
      ? {
          '@type': 'Offer',
          price,
          priceCurrency: property.currency?.iso ?? 'COP',
          availability:
            property.availability === 'AVAILABLE'
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
          url,
          seller: { '@id': `${SITE.url}/#organization` },
        }
      : undefined,
  }
}

/** El listado de resultados, para que Google entienda que es una coleccion. */
export function listingJsonLd(
  properties: Property[],
  url: string,
  pathOf: (property: Property) => string,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': url,
    numberOfItems: properties.length,
    itemListElement: properties.slice(0, 24).map((property, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: new URL(pathOf(property), SITE.url).toString(),
      name: property.title,
    })),
  }
}
