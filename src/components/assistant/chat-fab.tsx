import { MessageCircle } from 'lucide-react'
import { lazy, Suspense, useEffect, useState } from 'react'

import { useT } from '@/lib/i18n'
import { useAssistant } from '@/lib/use-assistant'
import { cn } from '@/lib/utils'

/*
  El panel entero —hilo, tarjetas, formato de fechas— se pide al abrir el chat,
  no antes: la inmensa mayoría de visitantes no lo despliega, y cargarlo de
  entrada lo metería en el trozo principal que compite con la foto del inmueble.
  Al pasar el ratón por el botón se adelanta, así que al hacer clic ya está.
*/
const ChatPanel = lazy(() =>
  import('@/components/assistant/chat-panel').then((m) => ({
    default: m.ChatPanel,
  })),
)

let preloaded: Promise<unknown> | null = null
const preloadPanel = () => {
  preloaded ??= import('@/components/assistant/chat-panel')
}

/**
 * El botón flotante del asistente, y su panel.
 *
 * Vive en `Root`, así que sale en TODAS las pantallas, abajo a la derecha y
 * respetando el área segura del móvil. El estado de la conversación cuelga de
 * aquí —no del panel— para que cerrar y volver a abrir no borre el hilo; lo que
 * sí lo reinicia es cambiar de inmueble o salir de la ficha, y de eso se encarga
 * `useAssistant` mirando la ruta.
 *
 * En móvil el panel ocupa la pantalla; en escritorio es una tarjeta acoplada
 * sobre el botón. No usa el diálogo de Radix a propósito: así controla su propia
 * animación de entrada y el acoplado del escritorio sin pelear con el foco.
 */
export function ChatFab() {
  const t = useT()
  const assistant = useAssistant()
  const [open, setOpen] = useState(false)
  const isMobile = useIsMobile()

  // En móvil, con el panel a pantalla completa, se bloquea el scroll de detrás.
  useEffect(() => {
    if (!open || !isMobile) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open, isMobile])

  // Cerrar con Escape, como cualquier capa superpuesta.
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      {/* Botón. Se oculta mientras el panel está abierto: el panel lleva su
          propia X, y en escritorio nace justo de este rincón. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        onMouseEnter={preloadPanel}
        onFocus={preloadPanel}
        aria-label={t('chat.fab.open')}
        aria-expanded={open}
        className={cn(
          'fixed right-4 bottom-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-200 hover:bg-primary/90 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:right-6 sm:bottom-6',
          'pb-[env(safe-area-inset-bottom)]',
          open
            ? 'pointer-events-none scale-90 opacity-0'
            : 'scale-100 opacity-100',
        )}
      >
        <MessageCircle className="size-6" />
      </button>

      {open && (
        <>
          {/* Fondo, solo en móvil: en escritorio el panel es una tarjeta y no
              tapa el sitio. */}
          <div
            className="fixed inset-0 z-50 bg-black/40 sm:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-label={t('chat.panel.aria')}
            className={cn(
              'fixed z-50 overflow-hidden bg-background shadow-2xl',
              'animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200',
              // Móvil: pantalla completa.
              'inset-0',
              // Escritorio: tarjeta acoplada sobre el botón, rincón inferior derecho.
              'sm:inset-auto sm:right-6 sm:bottom-6 sm:h-[min(620px,calc(100vh-6rem))] sm:w-[24rem] sm:rounded-xl sm:border',
            )}
            style={{ transformOrigin: 'bottom right' }}
          >
            <Suspense fallback={<PanelLoading />}>
              <ChatPanel assistant={assistant} onClose={() => setOpen(false)} />
            </Suspense>
          </div>
        </>
      )}
    </>
  )
}

/** El armazón mientras el panel llega, para que la tarjeta no aparezca vacía. */
function PanelLoading() {
  return (
    <div className="flex h-full flex-col bg-background">
      <div className="h-14 border-b bg-primary" />
      <div className="flex flex-1 items-center justify-center">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-2 animate-bounce rounded-full bg-muted-foreground/50"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/** ¿Estamos por debajo del breakpoint `sm` (576px, el de Bootstrap del tema)? */
function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(max-width: 575px)')
    const update = () => setMobile(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return mobile
}
