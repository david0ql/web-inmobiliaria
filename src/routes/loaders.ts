/**
 * Los loaders de todas las rutas, juntos y en el trozo principal.
 *
 * Dos decisiones, las dos por velocidad, y las dos se ven en la cascada de red:
 *
 * 1. NO viven dentro del modulo de su pantalla. Si el loader va en el fichero que
 *    `lazy` carga bajo demanda, el router tiene que bajarse ese trozo ANTES de
 *    poder pedir nada — una vuelta entera de red antes de empezar la siguiente.
 *    Aqui pesan unas lineas y arrancan las peticiones en cuanto se conoce la ruta,
 *    en paralelo con la descarga del componente.
 *
 * 2. NO esperan. Devuelven promesas sin resolver, asi que la ruta se pinta
 *    inmediatamente —cabecera, pie, esqueletos— y cada trozo aparece cuando llega
 *    su respuesta. Antes de esto la pagina se quedaba en blanco hasta que
 *    contestaba el ultimo endpoint.
 */

import type { LoaderFunctionArgs } from 'react-router-dom'

import {
  getCatalogs,
  getCounts,
  getProperty,
  getSiblings,
  searchProperties,
} from '@/lib/api'
import {
  getProject,
  listProjects,
  readProjectFilters,
  toProjectsQuery,
} from '@/lib/projects'
import { readFilters, toApiQuery, type Filters } from '@/lib/search-params'
import { slugify } from '@/lib/slug'
import type { SiteData } from '@/lib/site-data'
import type { Paginated, Property } from '@/lib/types'

async function loadSite(): Promise<SiteData> {
  // Los catalogos son criticos —sin ellos no hay buscador—; los contadores son
  // adorno y si fallan el menu se pinta sin numeros en lugar de tumbar el sitio.
  const [catalogs, counts] = await Promise.all([
    getCatalogs(),
    getCounts().catch(() => []),
  ])
  return {
    catalogs,
    counts: Object.fromEntries(
      counts.map((row) => [row.propertyTypeId, row.forSale]),
    ),
  }
}

export interface RootData {
  site: Promise<SiteData>
}

export function rootLoader(): RootData {
  return { site: loadSite() }
}

export interface HomeData {
  featured: Promise<Property[]>
  recent: Promise<Property[]>
}

export function homeLoader(): HomeData {
  // El orden por defecto de la API ya pone los OUTSTANDING primero, que es
  // exactamente el "destacado" del sitio: no hay un booleano `featured`.
  return {
    featured: searchProperties({ limit: 9 }).then((page) => page.data),
    recent: searchProperties({ sort: 'recent', limit: 9 }).then((p) => p.data),
  }
}

export interface SearchData {
  /** Lo que dice la URL, disponible ya, para pintar el formulario sin esperar. */
  initialFilters: Filters
  results: Promise<{ filters: Filters; results: Paginated<Property> }>
}

/**
 * `/buscar`, `/venta` y `/venta/:tipo` pintan la misma pantalla. La unica
 * diferencia es que las dos ultimas dan por supuesta la venta, y eso lo dice la
 * ruta al declararse —`salesLoader`— en lugar de deducirse mirando el path.
 * Antes esto era un `pathname.endsWith('/ventas')`: bastaba renombrar la ruta
 * para que el filtro dejase de aplicarse en silencio, sin romper nada visible.
 */
function search(
  { request, params }: LoaderFunctionArgs,
  forSale: boolean,
): SearchData {
  const url = new URL(request.url)
  const filters = readFilters(url.searchParams)

  if (forSale && !filters.businessType) filters.businessType = 'for_sale'

  const results = (async () => {
    let resolved = filters
    /*
      Los enlaces del menu llevan el tipo tanto en el segmento legible como en
      `id_property_type`. Si alguien entra a `/venta/apartamento` a pelo —desde
      un marcador viejo— el id se resuelve desde el catalogo.
    */
    if (!resolved.propertyTypeId && params.typeSlug) {
      const catalogs = await getCatalogs()
      const match = catalogs.propertyTypes.find(
        (type) => slugify(type.name) === params.typeSlug,
      )
      if (match) resolved = { ...resolved, propertyTypeId: String(match.id) }
    }
    return { filters: resolved, results: await searchProperties(toApiQuery(resolved)) }
  })()

  return { initialFilters: filters, results }
}

/** `/buscar`: sin filtros implicitos, solo lo que traiga la query. */
export function searchLoader(args: LoaderFunctionArgs): SearchData {
  return search(args, false)
}

/** `/venta` y `/venta/:tipo`. */
export function salesLoader(args: LoaderFunctionArgs): SearchData {
  return search(args, true)
}

/*
  Proyectos si espera a sus datos, a diferencia de las pantallas de inmuebles.
  Es una pantalla secundaria a la que se llega navegando, nunca la primera que se
  abre, asi que el armazon ya esta en pantalla y no hay pagina en blanco que
  evitar. Lo que si se gana trayendo el loader aqui es que la peticion salga en
  paralelo con la descarga del componente.
*/
export function projectsLoader({ request }: LoaderFunctionArgs) {
  const filters = readProjectFilters(new URL(request.url).searchParams)
  return listProjects(toProjectsQuery(filters)).then((results) => ({
    filters,
    results,
  }))
}

export function projectLoader({ params }: LoaderFunctionArgs) {
  return getProject(params.slug as string)
}

export interface PropertyData {
  property: Promise<Property>
  /** Las otras unidades del proyecto no bloquean la ficha: llegan cuando llegan. */
  siblings: Promise<Property[]>
}

export function propertyLoader({ params }: LoaderFunctionArgs): PropertyData {
  const code = params.code as string
  return {
    property: getProperty(code),
    siblings: getSiblings(code).catch(() => []),
  }
}
