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
  garages: string
  /** Lo que mueve a comprar, no lo que describe la casa. Ver "Más filtros". */
  readyToMoveIn: string
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
  garages: 'garages',
  readyToMoveIn: 'ready',
  minPrice: 'min_price',
  maxPrice: 'max_price',
  sort: 'orden',
  page: 'pagina',
} as const satisfies Record<keyof Filters, string>

/**
 * Donde opera la agencia.
 *
 * El formulario abria con "Todos" en pais y departamento, y en la practica eso
 * es un paso de mas para todo el mundo: el inventario entero esta en Santander
 * y quien entra ya sabe que busca aqui. Se arranca puesto y se puede quitar.
 */
export const PAIS_POR_DEFECTO = '1'
export const DEPARTAMENTO_POR_DEFECTO = '29'

/**
 * "Todos", dicho en voz alta en la URL.
 *
 * Sin esto no se puede quitar el valor por defecto. Un campo vacio no se
 * escribe en la URL —es lo que distingue "no me importa" de "esto"—, asi que
 * quien pone el pais en "Todos" y busca se encuentra con que al recargar vuelve
 * a poner Colombia: el parametro que faltaba se rellenaba otra vez con el
 * defecto, y no habia forma de salir de Santander.
 *
 * Con un valor explicito, la URL puede decir las tres cosas que hacen falta:
 * "no se ha tocado" (sin parametro, vale el defecto), "este" (el id) y "todos"
 * (este cero, que ningun catalogo usa como id).
 */
const TODOS = '0'

/**
 * Lee un campo que arranca puesto: el parametro manda, y si no esta, el defecto.
 */
function conDefecto(
  params: URLSearchParams,
  nombre: string,
  defecto: string,
): string {
  const valor = params.get(nombre)
  if (valor === null) return defecto
  return valor === TODOS ? '' : valor
}

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
  garages: '',
  readyToMoveIn: '',
  minPrice: '',
  maxPrice: '',
  sort: '',
  page: 1,
}

export function readFilters(params: URLSearchParams): Filters {
  const page = Number(params.get(PARAM.page))
  return {
    match: params.get(PARAM.match) ?? '',
    countryId: conDefecto(params, PARAM.countryId, PAIS_POR_DEFECTO),
    regionId: conDefecto(params, PARAM.regionId, DEPARTAMENTO_POR_DEFECTO),
    cityId: params.get(PARAM.cityId) ?? '',
    zoneId: params.get(PARAM.zoneId) ?? '',
    propertyTypeId: params.get(PARAM.propertyTypeId) ?? '',
    condition: params.get(PARAM.condition) ?? '',
    businessType: params.get(PARAM.businessType) ?? '',
    bedrooms: params.get(PARAM.bedrooms) ?? '',
    bathrooms: params.get(PARAM.bathrooms) ?? '',
    garages: params.get(PARAM.garages) ?? '',
    readyToMoveIn: params.get(PARAM.readyToMoveIn) ?? '',
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
    /*
      Vaciar pais o departamento SI se escribe, como `0`: es la unica forma de
      decir "todos" y que no se vuelva a poner el defecto al recargar.
    */
    if (
      (key === 'countryId' || key === 'regionId') &&
      (value === '' || value === null)
    ) {
      params.set(name, TODOS)
      continue
    }
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

/*
  `label` guarda la CLAVE de la frase, no la frase: son constantes de modulo y
  `useT()` solo vive dentro de un componente. El select las traduce al pintar.
*/
export const SORTS = [
  { value: '', label: 'catalog.sort.recent', direction: 'recent' },
  { value: 'price_asc', label: 'catalog.sort.price_asc', direction: 'up' },
  { value: 'price_desc', label: 'catalog.sort.price_desc', direction: 'down' },
] as const

export const CONDITIONS = [
  { value: 'NEW', label: 'catalog.condition.new' },
  { value: 'USED', label: 'catalog.condition.used' },
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

/**
 * "1 o más" … "7 o más", igual que los selects del tema anterior.
 *
 * Viaja el numero, no la frase: la frase la arma el select con
 * `t('search.rooms.option', { count })`, que en cada idioma la ordena a su
 * manera.
 */
/*
  De una a cinco, no a siete.

  Son minimos: "5" significa cinco o mas. Un sexto y un septimo escalon no
  parten nada —en el inventario entero hay un puñado de fichas con seis
  alcobas— y alargan un desplegable que se recorre con el pulgar.
*/
export const ROOM_OPTIONS = [1, 2, 3, 4, 5].map((n) => ({
  value: String(n),
  n,
}))

/**
 * Doce por pagina, no veinticuatro.
 *
 * Veinticuatro tarjetas son ocho filas en escritorio y veinticuatro pantallazos
 * en movil: quien no encuentra lo suyo en las primeras no baja hasta el final,
 * baja hasta que se cansa. Doce son cuatro filas, se ven enteras y el paginador
 * queda a la vista, que es lo que de verdad hace recorrer un inventario.
 *
 * El numero de paginas lo calcula la API a partir de este limite, asi que basta
 * cambiarlo aqui.
 */
export const PAGE_SIZE = 12

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
    garages: filters.garages || undefined,
    readyToMoveIn: filters.readyToMoveIn || undefined,
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
 *
 * Por lo mismo, el pais y el departamento solo cuentan cuando NO son los que
 * vienen puestos: Colombia y Santander estan ahi desde antes de que nadie toque
 * nada.
 */
const IMPLICITOS: (keyof Filters)[] = ['page', 'sort', 'businessType']

/** Lo que ya viene puesto y por tanto no cuenta como filtro elegido. */
const DE_FABRICA: Partial<Record<keyof Filters, string>> = {
  countryId: PAIS_POR_DEFECTO,
  regionId: DEPARTAMENTO_POR_DEFECTO,
}

export function countActive(filters: Filters): number {
  return (Object.keys(EMPTY_FILTERS) as (keyof Filters)[]).filter(
    (key) =>
      !IMPLICITOS.includes(key) &&
      filters[key] !== '' &&
      filters[key] !== DE_FABRICA[key],
  ).length
}
