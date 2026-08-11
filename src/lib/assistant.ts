/**
 * El cliente del asistente, contra `POST /api/v1/public/assistant/chat`.
 *
 * La respuesta es un `text/event-stream`: el servidor va escribiendo el texto
 * según el modelo lo produce, y con él las tarjetas (galería, inmuebles, horas)
 * y las órdenes para el sitio (llevar al buscador). Aquí se lee ese flujo con
 * `fetch` + `ReadableStream` —no `EventSource`, que solo sabe hacer GET— y se
 * entrega evento a evento a quien llame.
 *
 * El hilo es efímero: no hay nada que guardar en el servidor. El historial vive
 * en memoria del navegador y se reenvía en cada turno.
 */

import { ApiError } from './api'
import type { Idioma } from './i18n'

const BASE = '/api/v1'

/**
 * Los avisos que escribe el propio navegador cuando el chat ni siquiera llega a
 * abrirse.
 *
 * Son tres y no pasan por el servidor ni por el modelo, así que no hay quien
 * los traduzca por nosotros. Van aquí, en un condicional, y no en el
 * diccionario: se ven justo cuando la red o la API han fallado, que es mal
 * momento para depender de un texto que llega por la red.
 */
const AVISOS = {
  sinConexion: {
    es: 'No pudimos conectar con el asistente.',
    en: 'We could not reach the assistant.',
  },
  apagado: {
    es: 'El asistente no está disponible en este momento.',
    en: 'The assistant is not available right now.',
  },
  fallo: {
    es: 'El asistente tuvo un problema. Inténtalo de nuevo.',
    en: 'The assistant ran into a problem. Please try again.',
  },
  cortado: {
    es: 'Se cortó la conexión con el asistente.',
    en: 'The connection with the assistant dropped.',
  },
} satisfies Record<string, Record<Idioma, string>>

function aviso(clave: keyof typeof AVISOS, idioma: Idioma = 'es'): string {
  return AVISOS[clave][idioma] ?? AVISOS[clave].es
}

// --- lo que viaja en cada turno --------------------------------------------

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

export type ChatScope =
  | { kind: 'GLOBAL' }
  | { kind: 'PROPERTY'; code: string }

// --- las tarjetas que el servidor manda para pintar --------------------------

export interface PropertyCardView {
  code: string
  title: string
  type: string | null
  city: string | null
  zone: string | null
  salePrice: number | null
  rentPrice: number | null
  currency: string
  area: number | null
  bedrooms: number | null
  bathrooms: number | null
  garages: number | null
  cover: string | null
  availability: string
  /** Ruta de la ficha en la web pública, ya calculada por el servidor. */
  path: string
}

export interface GalleryImage {
  url: string
  urlLarge: string
  description: string | null
}

export interface SlotDay {
  date: string
  slots: { startsAt: string; endsAt: string }[]
}

export type AssistantCard =
  | { type: 'properties'; items: PropertyCardView[] }
  | { type: 'property'; item: PropertyCardView }
  | { type: 'gallery'; code: string; title: string; images: GalleryImage[] }
  | { type: 'slots'; code: string; days: SlotDay[] }
  | {
      type: 'booked'
      code: string
      startsAt: string
      endsAt: string
      appointmentId?: string
    }

export type AssistantAction = { type: 'go_to_search'; reason?: string }

// --- los eventos del stream --------------------------------------------------

export type AssistantEvent =
  | { type: 'text'; delta: string }
  | { type: 'card'; card: AssistantCard }
  | { type: 'action'; action: AssistantAction }
  | { type: 'done' }
  | { type: 'error'; message: string }

export interface SendPayload {
  scope: ChatScope
  messages: ChatTurn[]
  /** Códigos de los inmuebles ya mostrados en el hilo. */
  shownCodes?: string[]
  /** Ids de las visitas pedidas en el hilo: es lo que permite cambiarlas. */
  bookedIds?: string[]
  /** Donde se guarda el hilo, para poder revisarlo despues. */
  conversationId?: string
  /** Para que le hable por su nombre. */
  visitorName?: string
  /**
   * En qué idioma está leyendo la web. Lo dice la URL —`/en` es inglés—, y con
   * él el asistente contesta en inglés a quien está en la versión inglesa.
   */
  locale?: Idioma
  signal?: AbortSignal
}

/**
 * Abre un turno y devuelve un iterable de eventos. Se consume con `for await`.
 *
 * Un fallo de red o un 5xx se emite como un evento `error` en lugar de lanzar,
 * para que quien lo consume tenga un único camino de manejo.
 */
export async function* streamChat(
  payload: SendPayload,
): AsyncGenerator<AssistantEvent> {
  const {
    scope,
    messages,
    shownCodes,
    bookedIds,
    conversationId,
    visitorName,
    locale,
    signal,
  } = payload

  let res: Response
  try {
    res = await fetch(`${BASE}/public/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scope: scope.kind,
        code: scope.kind === 'PROPERTY' ? scope.code : undefined,
        messages,
        // Solo los códigos de lo que ya se enseñó. El servidor los relee de la
        // base: los datos no viajan por aquí, así que manipular esta lista no
        // sirve para colar un precio falso — como mucho, para que el asistente
        // hable de otro inmueble que también está publicado.
        //
        // Hace falta porque el hilo es efímero y los mensajes anteriores del
        // asistente son prosa: sin códigos no puede volver a consultar aquello
        // de lo que ya habló, y acababa contestando de memoria.
        shownCodes,
        bookedIds,
        conversationId,
        visitorName,
        locale,
      }),
      signal,
    })
  } catch (error) {
    if (isAbort(error)) return
    yield { type: 'error', message: aviso('sinConexion', locale) }
    return
  }

  if (res.status === 503) {
    yield { type: 'error', message: aviso('apagado', locale) }
    return
  }
  if (!res.ok || !res.body) {
    yield { type: 'error', message: aviso('fallo', locale) }
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let sep: number
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, sep)
        buffer = buffer.slice(sep + 2)
        const event = parseBlock(block)
        if (event) yield event
      }
    }
  } catch (error) {
    if (!isAbort(error)) {
      yield { type: 'error', message: aviso('cortado', locale) }
    }
  } finally {
    reader.releaseLock()
  }
}

/** Extrae el `data:` de un bloque SSE y lo parsea a un evento. */
function parseBlock(block: string): AssistantEvent | null {
  const data = block
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart())
    .join('\n')
  if (!data) return null
  try {
    return JSON.parse(data) as AssistantEvent
  } catch {
    return null
  }
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

/**
 * Identifica al visitante antes de la primera pregunta.
 *
 * El servidor busca por telefono y correo: si ya es cliente reutiliza su ficha
 * —nadie quiere el mismo cliente tres veces en la cartera por escribir su
 * nombre de otra forma— y si no, la crea.
 */
export async function identify(datos: {
  firstName: string
  lastName: string
  phone: string
  email: string
  propertyCode?: string
}): Promise<{ conversationId: string; returning: boolean }> {
  const res = await fetch(`${BASE}/public/assistant/identify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      message?: string | string[]
    } | null
    const message = Array.isArray(body?.message)
      ? body.message[0]
      : (body?.message ?? 'No pudimos guardar tus datos.')
    throw new ApiError(res.status, message)
  }
  return (await res.json()) as { conversationId: string; returning: boolean }
}
