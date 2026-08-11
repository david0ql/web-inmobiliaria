import { Home, SendHorizonal, Sparkles, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { ChatCard } from '@/components/assistant/chat-cards'
import { ChatIdentify } from '@/components/assistant/chat-identify'
import { Button } from '@/components/ui/button'
import { useT } from '@/lib/i18n'
import { SITE } from '@/lib/site'
import type { ChatItem, UseAssistant } from '@/lib/use-assistant'
import { cn } from '@/lib/utils'

/**
 * El panel del asistente.
 *
 * Es la conversación: hilo desplazable arriba, caja de escribir abajo. La lista
 * se remonta por `scopeKey` —la clave del hilo que da React Router—, así que al
 * cambiar de inmueble o salir de la ficha entra con una animación limpia en vez
 * de cortarse en seco. El acabado es el del sitio: cabecera negra, versalitas,
 * radios de 6px. Nada de degradados ni de morados de "IA".
 */
export function ChatPanel({
  assistant,
  onClose,
}: {
  assistant: UseAssistant
  onClose: () => void
}) {
  const t = useT()
  const {
    items,
    streaming,
    greeting,
    scope,
    scopeKey,
    send,
    visitor,
    setVisitor,
  } = assistant
  const [draft, setDraft] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Pegado al fondo según llega texto: una conversación crece por abajo.
  useLayoutEffect(() => {
    const node = scrollRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [items, streaming])

  useEffect(() => {
    inputRef.current?.focus()
  }, [scopeKey])

  const submit = () => {
    const text = draft.trim()
    if (!text || streaming) return
    send(text)
    setDraft('')
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Cabecera */}
      <header className="flex items-center gap-3 border-b bg-primary px-4 py-3 text-primary-foreground">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-foreground/10">
          <Sparkles className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm leading-tight font-semibold">
            {t('chat.header.title', { brand: SITE.name.split(' ')[0] })}
          </p>
          <p className="truncate text-[0.6875rem] text-primary-foreground/70">
            {scope.kind === 'PROPERTY'
              ? t('chat.header.property', { code: scope.code })
              : t('chat.header.general')}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('chat.close')}
          className="rounded-sm p-1 opacity-80 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground"
        >
          <X className="size-5" />
        </button>
      </header>

      {/* Hilo. `key={scopeKey}` lo remonta al cambiar de inmueble: la animación
          de reinicio que pediste, apoyada en el estado de React Router. */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4"
      >
        {!visitor ? (
          <ChatIdentify scope={scope} onReady={setVisitor} />
        ) : (
          <div
            key={scopeKey}
            className="animate-in fade-in-0 slide-in-from-bottom-1 space-y-3 duration-300"
          >
            <Bubble role="assistant">
              {t('chat.greeting.hello', { name: visitor.firstName })}{' '}
              {greeting}
            </Bubble>
            {items.map((item) => (
              <Item key={item.id} item={item} onNavigate={onClose} />
            ))}
            {streaming && lastIsUser(items) && <Typing />}
          </div>
        )}
      </div>

      {/* Caja de escribir. Sin identificarse no hay a quien contestar. */}
      {visitor && (
        <div className="border-t bg-background px-3 py-3">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              submit()
            }}
            className="flex items-end gap-2 rounded-lg border bg-card p-1.5 focus-within:ring-2 focus-within:ring-ring"
          >
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  submit()
                }
              }}
              rows={1}
              maxLength={3900}
              placeholder={
                scope.kind === 'PROPERTY'
                  ? t('chat.input.placeholder.property')
                  : t('chat.input.placeholder.general')
              }
              className="max-h-32 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!draft.trim() || streaming}
              aria-label={t('chat.send')}
              className="shrink-0"
            >
              <SendHorizonal className="size-4" />
            </Button>
          </form>
          <p className="mt-1.5 px-1 text-center text-[0.625rem] text-muted-foreground">
            {t('chat.disclaimer')}
          </p>
        </div>
      )}
    </div>
  )
}

function Item({
  item,
  onNavigate,
}: {
  item: ChatItem
  onNavigate: () => void
}) {
  if (item.kind === 'user') return <Bubble role="user">{item.text}</Bubble>
  if (item.kind === 'assistant')
    return (
      <Bubble role="assistant" error={item.error}>
        {item.text}
      </Bubble>
    )
  if (item.kind === 'notice')
    return (
      <div className="flex items-center justify-center gap-1.5 py-1 text-center text-[0.6875rem] text-muted-foreground">
        <Home className="size-3" />
        {item.text}
      </div>
    )
  return <ChatCard card={item.card} onNavigate={onNavigate} />
}

function Bubble({
  role,
  error,
  children,
}: {
  role: 'user' | 'assistant'
  error?: boolean
  children: React.ReactNode
}) {
  const isUser = role === 'user'
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-lg px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap',
          isUser
            ? 'rounded-br-sm bg-primary text-primary-foreground'
            : 'rounded-bl-sm border bg-card',
          error && 'border-destructive/40 bg-destructive/5 text-destructive',
        )}
      >
        {children}
      </div>
    </div>
  )
}

/** Los tres puntos mientras el asistente "piensa" antes del primer token. */
function Typing() {
  return (
    <div className="flex justify-start">
      <div className="flex gap-1 rounded-lg rounded-bl-sm border bg-card px-3.5 py-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  )
}

function lastIsUser(items: ChatItem[]): boolean {
  const last = items[items.length - 1]
  return last?.kind === 'user'
}
