import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMatches, useNavigate } from 'react-router-dom'

import { ROUTES } from '@/lib/site'
import {
  streamChat,
  type AssistantAction,
  type AssistantCard,
  type ChatScope,
  type ChatTurn,
} from '@/lib/assistant'

/**
 * El asistente, atado al estado de React Router.
 *
 * El scope sale de la ruta: si el visitante está en la ficha de un inmueble
 * (`:slug/:code`), el chat queda amarrado a ESE inmueble; en cualquier otra
 * pantalla es el chat general que puede buscar. Cuando el scope cambia —abre
 * otro apartamento, o sale de la ficha— el hilo se descarta y empieza uno
 * nuevo, que es justo lo que pediste: no se arrastra una charla de un inmueble
 * a otro. La animación de ese reinicio la pone el panel, remontando la lista
 * por `scopeKey`.
 */

export interface UserItem {
  id: string
  kind: 'user'
  text: string
}
export interface AssistantItem {
  id: string
  kind: 'assistant'
  text: string
  error?: boolean
}
export interface CardItem {
  id: string
  kind: 'card'
  card: AssistantCard
}
export interface NoticeItem {
  id: string
  kind: 'notice'
  text: string
}

export type ChatItem = UserItem | AssistantItem | CardItem | NoticeItem

export interface UseAssistant {
  scope: ChatScope
  /** Cambia cuando cambia el inmueble o se sale de la ficha: la clave del hilo. */
  scopeKey: string
  items: ChatItem[]
  streaming: boolean
  greeting: string
  send: (text: string) => void
  stop: () => void
}

export function useAssistant(): UseAssistant {
  const matches = useMatches()
  const navigate = useNavigate()

  const scope = useMemo(() => deriveScope(matches), [matches])
  const scopeKey = scope.kind === 'PROPERTY' ? `P:${scope.code}` : 'G'

  const [items, setItems] = useState<ChatItem[]>([])
  const [streaming, setStreaming] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const itemsRef = useRef<ChatItem[]>(items)
  itemsRef.current = items
  const openIdRef = useRef<string | null>(null)
  const scopeRef = useRef<ChatScope>(scope)
  scopeRef.current = scope
  /** Lo que debe sembrar el hilo tras un reinicio provocado por el asistente. */
  const seedRef = useRef<ChatItem[] | null>(null)

  // Reinicio del hilo al cambiar de scope. Aborta lo que estuviera en vuelo y
  // arranca de cero (o con la semilla que dejó `ir_al_buscador`).
  const prevKey = useRef(scopeKey)
  useEffect(() => {
    if (prevKey.current === scopeKey) return
    prevKey.current = scopeKey
    abortRef.current?.abort()
    abortRef.current = null
    openIdRef.current = null
    setStreaming(false)
    setItems(seedRef.current ?? [])
    seedRef.current = null
  }, [scopeKey])

  // Al desmontar, corta cualquier stream vivo.
  useEffect(() => () => abortRef.current?.abort(), [])

  const handleAction = useCallback(
    (action: AssistantAction) => {
      if (action.type === 'go_to_search') {
        // El visitante pidió otros inmuebles desde una ficha: lo llevamos al
        // inicio, el hilo se reinicia solo (cambia el scope) y lo recibimos con
        // el mensaje que pediste.
        seedRef.current = [
          {
            id: newId(),
            kind: 'notice',
            text: 'Te llevé al inicio para ayudarte con todo el inventario.',
          },
          {
            id: newId(),
            kind: 'assistant',
            text: 'Listo 🙌 Ahora sí, dime de cuál te hablo: ¿qué zona, precio o cuántas alcobas buscas?',
          },
        ]
        navigate(ROUTES.home)
      }
    },
    [navigate],
  )

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim()
      if (!text || streaming) return

      abortRef.current?.abort()
      const ac = new AbortController()
      abortRef.current = ac
      openIdRef.current = null

      const turnScope = scopeRef.current
      const history: ChatTurn[] = toTurns(itemsRef.current)
      history.push({ role: 'user', content: text })

      setItems((prev) => [...prev, { id: newId(), kind: 'user', text }])
      setStreaming(true)

      void (async () => {
        try {
          for await (const event of streamChat({
            scope: turnScope,
            messages: history,
            shownCodes: codigosMostrados(itemsRef.current),
            bookedIds: citasPedidas(itemsRef.current),
            signal: ac.signal,
          })) {
            if (event.type === 'text') {
              pushText(setItems, openIdRef, event.delta)
            } else if (event.type === 'card') {
              // Un cierre del párrafo actual: la siguiente tanda de texto abre
              // una burbuja nueva, debajo de la tarjeta.
              openIdRef.current = null
              setItems((prev) => [
                ...prev,
                { id: newId(), kind: 'card', card: event.card },
              ])
            } else if (event.type === 'action') {
              handleAction(event.action)
            } else if (event.type === 'error') {
              openIdRef.current = null
              setItems((prev) => [
                ...prev,
                { id: newId(), kind: 'assistant', text: event.message, error: true },
              ])
            }
          }
        } finally {
          if (abortRef.current === ac) {
            abortRef.current = null
            setStreaming(false)
          }
        }
      })()
    },
    [streaming, handleAction],
  )

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setStreaming(false)
  }, [])

  const greeting =
    scope.kind === 'PROPERTY'
      ? 'Hola 👋 Puedo contarte todo de este inmueble: precio, área, qué incluye, más fotos o agendarte una visita. ¿Qué quieres saber?'
      : 'Hola 👋 Soy el asistente de Serrano Inmobiliaria. Dime qué buscas —zona, precio, alcobas— y te muestro opciones al instante.'

  return { scope, scopeKey, items, streaming, greeting, send, stop }
}

/**
 * Añade un fragmento de texto a la burbuja del asistente abierta, o crea una si
 * no hay ninguna. Trabaja con refs para no perder fragmentos entre renders.
 */
function pushText(
  setItems: React.Dispatch<React.SetStateAction<ChatItem[]>>,
  openIdRef: React.MutableRefObject<string | null>,
  delta: string,
): void {
  setItems((prev) => {
    const openId = openIdRef.current
    if (openId) {
      return prev.map((item) =>
        item.id === openId && item.kind === 'assistant'
          ? { ...item, text: item.text + delta }
          : item,
      )
    }
    const id = newId()
    openIdRef.current = id
    return [...prev, { id, kind: 'assistant', text: delta }]
  })
}

/** De los ítems del hilo al historial que entiende el servidor: solo texto. */
function toTurns(items: ChatItem[]): ChatTurn[] {
  const turns: ChatTurn[] = []
  for (const item of items) {
    if (item.kind === 'user' && item.text.trim()) {
      turns.push({ role: 'user', content: item.text })
    } else if (item.kind === 'assistant' && !item.error && item.text.trim()) {
      turns.push({ role: 'assistant', content: item.text })
    }
  }
  return turns
}

type RouteMatch = { params: Record<string, string | undefined> }

/** El inmueble de la ruta, si lo hay: el segmento `:code` de la ficha. */
function deriveScope(matches: RouteMatch[]): ChatScope {
  for (let i = matches.length - 1; i >= 0; i -= 1) {
    const code = matches[i]?.params?.code
    if (code) return { kind: 'PROPERTY', code }
  }
  return { kind: 'GLOBAL' }
}

let counter = 0
function newId(): string {
  counter += 1
  return `m${counter}`
}

/**
 * Los códigos de los inmuebles que ya se enseñaron en el hilo.
 *
 * Van de vuelta al servidor, que los relee de la base antes de cada respuesta.
 * Solo los códigos: los datos se quedan aquí y no se reenvían, porque el
 * servidor no tiene por qué fiarse de lo que le mande el navegador.
 *
 * Sin esto, el asistente no podía volver a consultar aquello de lo que ya había
 * hablado —sus mensajes anteriores son prosa, sin identificadores— y acababa
 * contestando de memoria: llegó a decir dos precios distintos del mismo
 * inmueble en la misma conversación.
 */
function codigosMostrados(items: ChatItem[]): string[] {
  const codes: string[] = []
  for (const item of items) {
    if (item.kind !== 'card') continue
    const card = item.card
    if (card.type === 'properties') codes.push(...card.items.map((i) => i.code))
    else if (card.type === 'property') codes.push(card.item.code)
    else codes.push(card.code)
  }
  // Los últimos: una charla larga acumula decenas y lo que importa es lo
  // reciente. Lo que caiga fuera el asistente lo vuelve a buscar si hace falta.
  return [...new Set(codes)].slice(-40)
}

/**
 * Los ids de las visitas pedidas en este hilo.
 *
 * Es lo que le permite al asistente CAMBIAR una visita en vez de crear otra:
 * tener el id es la prueba de que la cita es de quien está escribiendo. Antes,
 * al pedirle "muévela", agendaba una segunda y decía que la había cambiado —
 * el asesor se plantaba dos veces.
 */
function citasPedidas(items: ChatItem[]): string[] {
  const ids: string[] = []
  for (const item of items) {
    if (item.kind !== 'card' || item.card.type !== 'booked') continue
    if (item.card.appointmentId) ids.push(item.card.appointmentId)
  }
  return [...new Set(ids)].slice(-20)
}
