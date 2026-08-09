/**
 * La traduccion entre la URL y la consulta a la API, en un solo sitio.
 *
 * El buscador no guarda estado propio: la URL es la unica fuente de verdad, de
 * modo que una busqueda se puede compartir, recargar y recorrer con el boton
 * atras. Los nombres de los parametros son los del sitio anterior
 * (`id_property_type`, `business_type[0]`, `min_price`...) porque son los que
 * llevan los enlaces ya publicados en el menu, en las redes y en los portales.
 */

import type { Query } from './api'

export interface Filters {
  match: string
  countryId: string
  regionId: string
  cityId: string
  zoneId: string
  propertyTypeId: string
  condition: string
  businessType: string
  bedrooms: string
  bathrooms: string
  minPrice: string
  maxPrice: string
  sort: string
  page: number
}

/** Nombre en la URL <-> campo del formulario. */
const PARAM = {
  match: 'match',
  countryId: 'id_country',
  regionId: 'id_region',
  cityId: 'id_city',
  zoneId: 'id_zone',
  propertyTypeId: 'id_property_type',
  condition: 'id_property_condition',
  businessType: 'business_type[0]',
  bedrooms: 'bedrooms',
  bathrooms: 'bathrooms',
  minPrice: 'min_price',
  maxPrice: 'max_price',
  sort: 'orden',
  page: 'pagina',
} as const satisfies Record<keyof Filters, string>

export const EMPTY_FILTERS: Filters = {
  match: '',
  countryId: '',
  regionId: '',
  cityId: '',
  zoneId: '',
  propertyTypeId: '',
  condition: '',
  businessType: '',
  bedrooms: '',
  bathrooms: '',
  minPrice: '',
  maxPrice: '',
  sort: '',
  page: 1,
}

export function readFilters(params: URLSearchParams): Filters {
  const page = Number(params.get(PARAM.page))
  return {
    match: params.get(PARAM.match) ?? '',
    countryId: params.get(PARAM.countryId) ?? '',
    regionId: params.get(PARAM.regionId) ?? '',
    cityId: params.get(PARAM.cityId) ?? '',
    zoneId: params.get(PARAM.zoneId) ?? '',
    propertyTypeId: params.get(PARAM.propertyTypeId) ?? '',
    condition: params.get(PARAM.condition) ?? '',
    businessType: params.get(PARAM.businessType) ?? '',
    bedrooms: params.get(PARAM.bedrooms) ?? '',
    bathrooms: params.get(PARAM.bathrooms) ?? '',
    minPrice: params.get(PARAM.minPrice) ?? '',
    maxPrice: params.get(PARAM.maxPrice) ?? '',
    sort: params.get(PARAM.sort) ?? '',
    page: Number.isFinite(page) && page > 1 ? page : 1,
  }
}

export function writeFilters(filters: Partial<Filters>): URLSearchParams {
  const params = new URLSearchParams()
  for (const [key, name] of Object.entries(PARAM) as [
    keyof Filters,
    string,
  ][]) {
    const value = filters[key]
    if (value === undefined || value === '' || value === null) continue
    if (key === 'page' && Number(value) <= 1) continue
    params.set(name, String(value))
  }
  return params
}

/** Solo digitos: los campos de precio del sitio se escriben con puntos. */
export function digits(value: string): string {
  return value.replace(/\D/g, '')
}

export const SORTS = [
  { value: '', label: 'Más nuevo' },
  { value: 'price_asc', label: 'Menor precio' },
  { value: 'price_desc', label: 'Mayor precio' },
] as const

export const CONDITIONS = [
  { value: 'NEW', label: 'Nuevo' },
  { value: 'USED', label: 'Usado' },
  { value: 'PROJECT', label: 'Proyecto' },
  { value: 'UNDER_CONSTRUCTION', label: 'En construcción' },
] as const

/*
  El buscador tenia un desplegable "Tipo de negocio" con Venta, Alquiler y
  Permutar. Los 642 inmuebles publicados estan en venta y ninguno en alquiler
  ni en permuta, asi que dos de las tres opciones devolvian siempre cero
  resultados: un filtro que solo sirve para vaciar la pagina.

  El filtro sale de la interfaz. `businessType` se queda en los parametros
  porque los enlaces publicados en los portales lo llevan en la query
  (`business_type[0]=for_sale`) y no se pueden romper.
*/

/** "1 o más" … "7 o más", igual que los selects del tema anterior. */
export const ROOM_OPTIONS = [1, 2, 3, 4, 5, 6, 7].map((n) => ({
  value: String(n),
  label: `${n} o más`,
}))

export const PAGE_SIZE = 24

/**
 * De los filtros de pantalla a la consulta que acepta `GET /public/properties`.
 *
 * Ojo: el `ValidationPipe` de la API va con `forbidNonWhitelisted`, asi que
 * mandar una clave que el DTO no declara devuelve un 400. Por eso esta funcion
 * es una lista blanca explicita y no un volcado del objeto de filtros.
 */
export function toApiQuery(filters: Filters, limit = PAGE_SIZE): Query {
  return {
    q: filters.match.trim() || undefined,
    countryId: filters.countryId || undefined,
    regionId: filters.regionId || undefined,
    cityId: filters.cityId || undefined,
    zoneId: filters.zoneId || undefined,
    propertyTypeId: filters.propertyTypeId || undefined,
    condition: filters.condition || undefined,
    bedrooms: filters.bedrooms || undefined,
    bathrooms: filters.bathrooms || undefined,
    minPrice: filters.minPrice || undefined,
    maxPrice: filters.maxPrice || undefined,
    forSale: filters.businessType === 'for_sale' ? 'true' : undefined,
    forRent: filters.businessType === 'for_rent' ? 'true' : undefined,
    forTransfer: filters.businessType === 'for_transfer' ? 'true' : undefined,
    sort: filters.sort || undefined,
    page: filters.page > 1 ? filters.page : undefined,
    limit,
  }
}

/**
 * Cuantos filtros ha tocado el VISITANTE, para el boton de limpiar.
 *
 * Fuera el orden y la pagina, que no son filtros. Y fuera `businessType`: en
 * `/venta` lo pone la propia ruta, no la persona, y ademas no tiene casilla en
 * el formulario desde que se quito el desplegable de tipo de negocio. Contarlo
 * hacia aparecer "limpiar filtros" nada mas entrar, ofreciendo deshacer algo
 * que nadie habia hecho.
 */
const IMPLICITOS: (keyof Filters)[] = ['page', 'sort', 'businessType']

export function countActive(filters: Filters): number {
  return (Object.keys(EMPTY_FILTERS) as (keyof Filters)[]).filter(
    (key) => !IMPLICITOS.includes(key) && filters[key] !== '',
  ).length
}
