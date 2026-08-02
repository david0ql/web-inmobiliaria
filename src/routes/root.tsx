import { Outlet, ScrollRestoration, useNavigation } from 'react-router-dom'

import { usePortalSession } from '@/lib/use-portal'
import { ChatFab } from '@/components/assistant/chat-fab'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { TopBar } from '@/components/layout/top-bar'
import { Toaster } from '@/components/ui/sonner'

export function Root() {
  /*
    Recupera la sesión del portal para todo el sitio.

    Antes solo lo hacía la página de cuenta, así que quien había entrado veía
    "Entrar" en la cabecera de cualquier otra página: la sesión existía —la
    cookie estaba ahí— pero nadie la había preguntado.
  */
  usePortalSession()

  const navigation = useNavigation()

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <SiteHeader />

      {/* Una barra fina de progreso mientras el router cambia de pantalla: el
          contenido anterior se queda a la vista, que es justo la gracia. */}
      <div
        aria-hidden="true"
        className={
          navigation.state === 'loading'
            ? 'h-0.5 animate-pulse bg-primary'
            : 'h-0.5 opacity-0'
        }
      />

      <main className="flex-1">
        <Outlet />
      </main>

      <SiteFooter />

      {/* El asistente: flota en todas las pantallas, abajo a la derecha. Va
          después del pie a propósito, para que quede por encima en el apilado. */}
      <ChatFab />

      <ScrollRestoration />
      <Toaster />
    </div>
  )
}
