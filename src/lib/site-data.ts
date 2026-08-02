/**
 * Lo que la cabecera necesita en todas las pantallas: los catalogos y cuantos
 * inmuebles hay de cada tipo. Lo pide el loader de la ruta raiz una sola vez y
 * el resto del arbol lo lee de ahi.
 *
 * Llega como PROMESA, no como valor: la ruta raiz no espera a los catalogos para
 * pintar el armazon. Quien necesite los datos los desenvuelve con `use()` y por
 * tanto tiene que colgar de un `<Suspense>`.
 */

import { use } from 'react'
import { useRouteLoaderData } from 'react-router-dom'

import { slugify } from './slug'
import type { Catalogs, PropertyType } from './types'

export interface SiteData {
  catalogs: Catalogs
  /** id del tipo -> inmuebles publicados en venta */
  counts: Record<number, number>
}

export const EMPTY_SITE_DATA: SiteData = {
  catalogs: { cities: [], propertyTypes: [], features: [] },
  counts: {},
}

/** Suspende hasta que los catalogos llegan. Requiere un `<Suspense>` por encima. */
export function useSiteData(): SiteData {
  const data = useRouteLoaderData('root') as
    | { site: Promise<SiteData> }
    | undefined
  return data?.site ? use(data.site) : EMPTY_SITE_DATA
}

export interface MenuType extends PropertyType {
  /** Nulo cuando la API no expone contadores. */
  count: number | null
  slug: string
}

/**
 * Los tipos que el menu enseña. Con contadores se recortan a los que tienen
 * algo publicado —el catalogo trae 33 tipos y solo una docena tiene inventario—
 * y sin ellos se enseñan todos: mas largo, pero mejor que un menu vacio.
 */
export function menuTypes(data: SiteData): MenuType[] {
  const hasCounts = Object.keys(data.counts).length > 0

  return data.catalogs.propertyTypes
    .map((type) => ({
      ...type,
      count: hasCounts ? (data.counts[type.id] ?? 0) : null,
      slug: slugify(type.name),
    }))
    .filter((type) => type.count === null || type.count > 0)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

/** `/s/casa-campestre/ventas?id_property_type=11&business_type[0]=for_sale` */
export function typePath(type: { id: number; slug: string }): string {
  return `/s/${type.slug}/ventas?id_property_type=${type.id}&business_type%5B0%5D=for_sale`
}
