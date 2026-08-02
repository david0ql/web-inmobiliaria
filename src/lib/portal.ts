import { ApiError } from './api'

/**
 * Sesión del propietario en el portal.
 *
 * El access token vive **solo en memoria**. Ni `localStorage` ni
 * `sessionStorage`: cualquier script que se cuele en la página puede leerlos, y
 * la web pública carga mapas, analítica y lo que venga después. Al recargar se
 * pierde, y se recupera pidiendo uno nuevo con la cookie `httpOnly` que el
 * navegador guarda y ningún script puede tocar.
 *
 * De ahí que todo esto sea un módulo con estado y no un contexto de React: la
 * variable tiene que sobrevivir a los re-renders sin acabar en el árbol.
 */

const BASE = '/api/v1'

export interface PortalClient {
  id: string
  email: string
  fullName: string
  mustChangePassword: boolean
}

let accessToken: string | null = null
let current: PortalClient | null = null

/** Suscriptores, para que la interfaz reaccione a entrar y salir. */
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getClient(): PortalClient | null {
  return current
}

function setSession(session: { accessToken: string; client: PortalClient }) {
  accessToken = session.accessToken
  current = session.client
  notify()
}

function clearSession() {
  accessToken = null
  current = null
  notify()
}

// --- transporte ------------------------------------------------------------

interface Options {
  method?: string
  body?: unknown
  signal?: AbortSignal
  /** Evita el bucle: la propia renovación no puede reintentar renovando. */
  retry?: boolean
}

async function request<T>(path: string, options: Options = {}): Promise<T> {
  const headers: Record<string, string> = {}
  const isForm = options.body instanceof FormData
  if (options.body !== undefined && !isForm) {
    headers['Content-Type'] = 'application/json'
  }
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  const res = await fetch(`${BASE}${path}`, {
    method: options.method ?? 'GET',
    headers,
    // `same-origin` y no `include`: la cookie de sesión solo tiene sentido
    // hacia nuestra propia API, y pedirla hacia fuera sería regalarla.
    credentials: 'same-origin',
    body:
      options.body === undefined
        ? undefined
        : isForm
          ? (options.body as FormData)
          : JSON.stringify(options.body),
    signal: options.signal,
  })

  /*
   * Un 401 con sesión abierta suele ser el access token caducado —dura quince
   * minutos—, así que se renueva una vez y se reintenta. Si la renovación
   * también falla, la sesión se acabó de verdad.
   */
  if (res.status === 401 && options.retry !== false && accessToken) {
    const renewed = await refresh()
    if (renewed) return request<T>(path, { ...options, retry: false })
    clearSession()
  }

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

// --- sesión ----------------------------------------------------------------

export async function login(email: string, password: string): Promise<void> {
  const session = await request<{ accessToken: string; client: PortalClient }>(
    '/portal/auth/login',
    { method: 'POST', body: { email, password }, retry: false },
  )
  setSession(session)
}

/**
 * El registro contesta lo mismo exista o no el correo, así que no devuelve
 * sesión: el mensaje se enseña y el visitante pasa a la pantalla de entrada.
 */
export function register(payload: {
  firstName: string
  lastName: string
  email: string
  cellPhone: string
  identification?: string
  password: string
  acceptsMarketing?: boolean
}): Promise<{ message: string }> {
  return request<{ message: string }>('/portal/auth/register', {
    method: 'POST',
    body: payload,
    retry: false,
  })
}

/** Devuelve `true` si había una sesión que renovar. */
export async function refresh(): Promise<boolean> {
  try {
    const session = await request<{
      accessToken: string
      client: PortalClient
    }>('/portal/auth/refresh', { method: 'POST', retry: false })
    setSession(session)
    return true
  } catch {
    clearSession()
    return false
  }
}

export async function logout(): Promise<void> {
  await request('/portal/auth/logout', { method: 'POST', retry: false }).catch(
    () => undefined,
  )
  clearSession()
}

export async function changePassword(
  currentPassword: string,
  password: string,
): Promise<void> {
  await request('/portal/auth/change-password', {
    method: 'POST',
    body: { currentPassword, password },
  })
  // La API cerró todas las sesiones, incluida esta: hay que volver a entrar.
  clearSession()
}

// --- datos -----------------------------------------------------------------

export interface PortalProfile {
  id: string
  firstName: string
  lastName: string | null
  fullName: string
  email: string | null
  cellPhone: string | null
  identification: string | null
  city: { id: number; name: string } | null
  acceptsMarketing: boolean
  mustChangePassword: boolean
  lastPortalLoginAt: string | null
  agent: {
    fullName: string
    email: string
    cellPhone: string | null
    hasWhatsapp: boolean
    photoUrl: string | null
  } | null
}

export interface PortalProperty {
  id: string
  code: string
  title: string
  address: string | null
  salePrice: number | null
  rentPrice: number | null
  area: number | null
  bedrooms: number | null
  bathrooms: number | null
  garages: number | null
  availability: string
  publicationStatus: string
  propertyType: string | null
  city: string | null
  zone: string | null
  cover: string | null
  createdAt: string
}

export interface PortalVisit {
  id: string
  type: string
  status: string
  startsAt: string
  endsAt: string
  property: { code: string; title: string } | null
}

export interface PortalRequest {
  id: string
  reference: string
  status: string
  complexName: string
  address: string
  unitNumber: string
  cityName: string
  neighborhood: string
  propertyTypeName: string
  salePrice: string
  builtArea: string
  bedrooms: number
  bathrooms: number
  requestedVisitAt: string | null
  documents: { docType: string | null }[]
  photos: number
  propertyId: string | null
  createdAt: string
}

/**
 * Descarga un documento suyo.
 *
 * Igual que en el panel: un `<a href>` no lleva `Authorization`, y estos
 * ficheros ya no se sirven como estáticos. Se piden con el token, se tienen un
 * instante en memoria y se sueltan.
 */
export async function downloadDocument(
  requestId: string,
  index: number,
  filename: string,
): Promise<void> {
  const res = await fetch(
    `${BASE}/portal/requests/${requestId}/documents/${index}`,
    {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      credentials: 'same-origin',
    },
  )
  if (!res.ok) throw new ApiError(res.status, 'No se pudo descargar el documento')

  const url = URL.createObjectURL(await res.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export const portal = {
  profile: (signal?: AbortSignal) =>
    request<PortalProfile>('/portal/me', { signal }),
  properties: (signal?: AbortSignal) =>
    request<PortalProperty[]>('/portal/properties', { signal }),
  visits: (signal?: AbortSignal) =>
    request<PortalVisit[]>('/portal/visits', { signal }),
  requests: (signal?: AbortSignal) =>
    request<PortalRequest[]>('/portal/requests', { signal }),
  createConsignment: (body: FormData) =>
    request<{ reference: string; message: string; files: number }>(
      '/portal/consignments',
      { method: 'POST', body },
    ),
}
