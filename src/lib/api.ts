/**
 * Cliente HTTP del sitio publico.
 *
 * Es el de `web/src/lib/api.ts` sin la mitad de arriba: aqui no hay sesion, ni
 * access token, ni renovacion, ni 401 que reintentar. Lo que se conserva es el
 * desempaquetado de los errores de Nest — la API escribe sus mensajes en
 * castellano y pensados para leerse, asi que se pasan tal cual a la pantalla.
 */

import type {
  BookVisitPayload,
  BookVisitResult,
  Catalogs,
  CreditRequestResult,
  Paginated,
  Property,
  TypeCount,
  Zone,
} from './types'

const BASE = '/api/v1'

export class ApiError extends Error {
  readonly status: number
  readonly body?: unknown

  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export type Query = Record<string, string | number | boolean | undefined | null>

function toQuery(query?: Query): string {
  if (!query) return ''
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    params.set(key, String(value))
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

interface RequestOptions {
  method?: string
  body?: unknown
  query?: Query
  signal?: AbortSignal
}

async function send<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {}
  const isForm = options.body instanceof FormData
  if (options.body !== undefined && !isForm) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${BASE}${path}${toQuery(options.query)}`, {
    method: options.method ?? 'GET',
    headers,
    body:
      options.body === undefined
        ? undefined
        : isForm
          ? (options.body as FormData)
          : JSON.stringify(options.body),
    signal: options.signal,
  })

  if (res.status === 204) return undefined as T

  const text = await res.text()
  const data: unknown = text ? JSON.parse(text) : null

  if (!res.ok) {
    const body = data as { message?: string | string[] } | null
    const message = Array.isArray(body?.message)
      ? body.message.join('. ')
      : (body?.message ?? `Error ${res.status}`)
    throw new ApiError(res.status, message, data)
  }

  return data as T
}

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) =>
    send<T>(path, { query, signal }),
  post: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    send<T>(path, { method: 'POST', body, signal }),
}

// --- endpoints publicos ----------------------------------------------------

export function searchProperties(query: Query, signal?: AbortSignal) {
  return api.get<Paginated<Property>>('/public/properties', query, signal)
}

/*
  Cache en memoria, corta y sin ceremonia.

  Sirve para dos cosas: que volver atras sea instantaneo en lugar de repetir la
  peticion, y que el adelanto al pasar el raton por una tarjeta no acabe pidiendo
  la ficha dos veces —lo que ademas contaria dos visitas, porque la API incrementa
  el contador en cada lectura.

  Se guarda la promesa, no el resultado: dos llamadas simultaneas comparten vuelo.
*/
const TTL_MS = 60_000
const cache = new Map<string, { at: number; value: Promise<unknown> }>()

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value as Promise<T>

  const value = load().catch((error: unknown) => {
    // Un fallo no se cachea: el siguiente intento debe volver a salir.
    cache.delete(key)
    throw error
  })
  cache.set(key, { at: Date.now(), value })
  return value
}

export function getProperty(code: string, signal?: AbortSignal) {
  return cached(`property:${code}`, () =>
    api.get<Property>(
      `/public/properties/${encodeURIComponent(code)}`,
      undefined,
      signal,
    ),
  )
}

/**
 * Adelanta la ficha mientras el visitante todavia esta decidiendo. Para cuando
 * suelta el clic, el loader de la ruta encuentra la respuesta ya en la cache y
 * la navegacion no espera a la red.
 */
export function prefetchProperty(code: string): void {
  void getProperty(code).catch(() => {
    /* Es un adelanto: si falla, la navegacion de verdad ya dara la cara. */
  })
}

/** Otras unidades del mismo proyecto. Array plano, maximo 12, `[]` si no aplica. */
export function getSiblings(code: string, signal?: AbortSignal) {
  return api.get<Property[]>(
    `/public/properties/${encodeURIComponent(code)}/siblings`,
    undefined,
    signal,
  )
}

/**
 * Ciudades, tipos de inmueble y caracteristicas. `/api/v1/catalogs` existe pero
 * pide token: para el sitio publico la unica puerta es esta.
 */
let catalogsCache: Promise<Catalogs> | null = null

export function getCatalogs(signal?: AbortSignal) {
  // La API ya los sirve desde una cache de diez minutos; esta evita ademas la
  // ida y vuelta cuando varias rutas los piden en la misma navegacion.
  catalogsCache ??= api.get<Catalogs>('/public/catalogs', undefined, signal)
  return catalogsCache
}

export function bookVisit(payload: BookVisitPayload) {
  return api.post<BookVisitResult>('/public/visits', payload)
}


/** Consulta de viabilidad de credito. Es un lead: no aprueba nada. */
export function submitCreditRequest(payload: unknown) {
  return api.post<CreditRequestResult>('/public/credit-requests', payload)
}

/** Los barrios de una ciudad. Sin `cityId` son varios miles: no se pide asi. */
export function getZones(cityId: number, signal?: AbortSignal) {
  return api.get<Zone[]>('/public/catalogs/zones', { cityId }, signal)
}

/**
 * Cuantos inmuebles hay detras de cada opcion del buscador.
 *
 * Se pide con los filtros puestos: al elegir una ciudad, los barrios y los
 * tipos pasan a contar solo lo de esa ciudad. Cada desplegable se cuenta contra
 * los demas filtros y no contra si mismo, asi que la opcion elegida nunca
 * desaparece de su propia lista y siempre se puede cambiar de idea.
 */
export interface FacetOption {
  id: number
  name: string
  count: number
}

export interface Facets {
  countries: FacetOption[]
  regions: FacetOption[]
  cities: FacetOption[]
  zones: FacetOption[]
  propertyTypes: FacetOption[]
}

export function getFacets(query: Query, signal?: AbortSignal) {
  return api.get<Facets>('/public/catalogs/facets', query, signal)
}

/** Lo que el menu enseña entre parentesis: Apartamento (423). */
export function getCounts(signal?: AbortSignal) {
  return api.get<TypeCount[]>('/public/catalogs/counts', undefined, signal)
}

/** Cómo se mueve el carrusel de la portada. */
export interface Showcase {
  /** Si la agencia lo tiene encendido. Apagado, la sección no se pinta. */
  enabled: boolean
  properties: Property[]
  autoplay: boolean
  delayMs: number
  effect: 'SLIDE' | 'FADE'
}

/**
 * El escaparate de la portada, ya resuelto por la API.
 *
 * Qué inmuebles salen —los últimos, los destacados o los que eligió la agencia
 * a mano— lo decide el servidor. Aquí solo se pinta: si mañana se añade otro
 * criterio, esta parte no se entera.
 */
export function getShowcase(signal?: AbortSignal): Promise<Showcase> {
  return api.get<Showcase>('/public/home/showcase', undefined, signal)
}

/**
 * Avisa de que alguien abrió una ficha.
 *
 * Va aparte de leerla para que la lectura se pueda cachear: la ficha es la
 * página más visitada del sitio y antes cada visitante costaba una consulta con
 * imágenes, ciudad, zona, tipo y moneda solo para sumar uno al contador.
 *
 * Si falla, se ignora: perder una visita del contador no puede estropearle la
 * página a nadie.
 */
export function registerVisit(code: string): void {
  void fetch(`${BASE}/public/properties/${encodeURIComponent(code)}/visit`, {
    method: 'POST',
    keepalive: true,
  }).catch(() => undefined)
}
