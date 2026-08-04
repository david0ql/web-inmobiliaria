/**
 * Todo lo de proyectos en un solo modulo: tipos, traduccion URL <-> API y las
 * dos llamadas que necesita la seccion.
 *
 * Un proyecto es una `PropertyFamily` de la API — el conjunto, la torre o la
 * obra nueva a la que pertenecen varios inmuebles. No es un inmueble: no tiene
 * codigo, ni precio propio, ni ficha de venta. Lo que se vende son sus
 * unidades, y esas si son inmuebles con su ficha (ver `propertyPath`).
 */

import type { Query } from './api'
import { api } from './api'
import type { City, Paginated, Property, Zone } from './types'

export type FamilyKind = 'PROJECT' | 'COMPLEX' | 'BUILDING' | 'STAGE'

export type FamilyStatus =
  | 'PLANNED'
  | 'UNDER_CONSTRUCTION'
  | 'DELIVERED'
  | 'SOLD_OUT'

export interface ProjectFamily {
  id: string
  name: string
  slug: string
  kind: FamilyKind
  status: FamilyStatus
  description: string | null
  developer: string | null
  city: City | null
  zone: Zone | null
  address: string | null
  /* La API los sirve como `numeric`, y `numeric` en Postgres viaja en texto. */
  latitude: string | null
  longitude: string | null
  deliveryYear: number | null
  totalUnits: number | null
  coverUrl: string | null
  children?: ProjectFamily[]
}

/** Lo que trae cada fila del listado: la familia mas el resumen de su oferta. */
export interface ProjectSummary extends ProjectFamily {
  unitTypeCount: number
  availableUnits: number
  fromPrice: number | null
}

/**
 * Una tipologia: todas las unidades que comparten forma, tipo y numero de
 * alcobas, agrupadas. Es como se compra obra nueva — nadie compara veinte
 * apartamentos casi iguales, compara "Tipo A, 3 alcobas, 78-84 m2".
 */
export interface UnitTypeSummary {
  unitType: string | null
  propertyType: string
  units: number
  available: number
  minArea: number | null
  maxArea: number | null
  bedrooms: number | null
  minPrice: number | null
  maxPrice: number | null
}

export interface ProjectDetail {
  family: ProjectFamily
  unitTypes: UnitTypeSummary[]
  properties: Property[]
}

// --- etiquetas del dominio, en castellano ---------------------------------

export const FAMILY_KIND_LABEL: Record<FamilyKind, string> = {
  PROJECT: 'Proyecto',
  COMPLEX: 'Conjunto',
  BUILDING: 'Edificio',
  STAGE: 'Etapa',
}

export const FAMILY_STATUS_LABEL: Record<FamilyStatus, string> = {
  PLANNED: 'Sobre planos',
  UNDER_CONSTRUCTION: 'En construcción',
  DELIVERED: 'Entregado',
  SOLD_OUT: 'Vendido',
}

/**
 * Los colores del tema anterior, oscurecidos hasta que se leen.
 *
 * Los de WASI son los de un panel de administracion, sobre fondo claro y texto
 * oscuro; aqui van con texto blanco encima y ahi no llegaban: el amarillo daba
 * 1,68 de contraste sobre 4,5 que pide la norma —practicamente ilegible— y el
 * verde 2,87.
 *
 * Se conserva el tono para que la etiqueta siga significando lo mismo de un
 * vistazo; solo baja la luminosidad. Son los mismos que las etiquetas de
 * disponibilidad de la ficha, que ya se corrigieron por lo mismo.
 */
export const FAMILY_STATUS_COLOR: Record<FamilyStatus, string> = {
  PLANNED: '#1f5c94',
  UNDER_CONSTRUCTION: '#8a6209',
  DELIVERED: '#2f7d4f',
  SOLD_OUT: '#a81c1c',
}

// --- rutas -----------------------------------------------------------------

export const PROJECTS_PATH = '/proyectos'

export function projectPath(project: { slug: string }): string {
  return `${PROJECTS_PATH}/${encodeURIComponent(project.slug)}`
}

// --- URL <-> API -----------------------------------------------------------

export const PROJECTS_PAGE_SIZE = 12

export interface ProjectFilters {
  match: string
  cityId: string
  page: number
}

/** Nombre en la URL <-> campo de pantalla, como en el buscador de inmuebles. */
const PARAM = {
  match: 'match',
  cityId: 'id_city',
  page: 'pagina',
} as const satisfies Record<keyof ProjectFilters, string>

export const EMPTY_PROJECT_FILTERS: ProjectFilters = {
  match: '',
  cityId: '',
  page: 1,
}

export function readProjectFilters(params: URLSearchParams): ProjectFilters {
  const page = Number(params.get(PARAM.page))
  return {
    match: params.get(PARAM.match) ?? '',
    cityId: params.get(PARAM.cityId) ?? '',
    page: Number.isFinite(page) && page > 1 ? Math.trunc(page) : 1,
  }
}

export function writeProjectFilters(
  filters: Partial<ProjectFilters>,
): URLSearchParams {
  const params = new URLSearchParams()
  for (const [key, name] of Object.entries(PARAM) as [
    keyof ProjectFilters,
    string,
  ][]) {
    const value = filters[key]
    if (value === undefined || value === null || value === '') continue
    if (key === 'page' && Number(value) <= 1) continue
    params.set(name, String(value))
  }
  return params
}

/**
 * De los filtros de pantalla a la consulta de `GET /public/projects`.
 *
 * El `ValidationPipe` de la API va con `forbidNonWhitelisted`: cualquier clave
 * que el DTO no declare devuelve un 400. Por eso esto es una lista blanca a
 * mano y no un volcado del objeto de filtros.
 */
export function toProjectsQuery(
  filters: ProjectFilters,
  limit = PROJECTS_PAGE_SIZE,
): Query {
  return {
    q: filters.match.trim() || undefined,
    cityId: filters.cityId || undefined,
    page: filters.page > 1 ? filters.page : undefined,
    limit,
  }
}

// --- llamadas --------------------------------------------------------------

export async function listProjects(
  query: Query,
  signal?: AbortSignal,
): Promise<Paginated<ProjectSummary>> {
  const payload = await api.get<Paginated<ProjectSummary> | ProjectSummary[]>(
    '/public/projects',
    query,
    signal,
  )
  return asPaginated(
    payload,
    Number(query.page ?? 1),
    Number(query.limit ?? PROJECTS_PAGE_SIZE),
  )
}

export function getProject(slug: string, signal?: AbortSignal) {
  return api.get<ProjectDetail>(
    `/public/projects/${encodeURIComponent(slug)}`,
    undefined,
    signal,
  )
}

/**
 * El endpoint devolvia un array plano antes de paginarse. Mientras la API en
 * produccion no lleve la version paginada, el sitio seguiria recibiendo el
 * array viejo: envolverlo aqui evita que el listado reviente en ese hueco.
 */
function asPaginated(
  payload: Paginated<ProjectSummary> | ProjectSummary[],
  page: number,
  limit: number,
): Paginated<ProjectSummary> {
  if (!Array.isArray(payload)) return payload
  const total = payload.length
  const pages = limit > 0 ? Math.ceil(total / limit) : 0
  return {
    data: payload.slice((page - 1) * limit, page * limit),
    meta: { total, page, limit, pages, hasNext: page < pages },
  }
}
