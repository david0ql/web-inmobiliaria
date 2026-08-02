import { Outlet, ScrollRestoration, useNavigation } from 'react-router-dom'

import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { TopBar } from '@/components/layout/top-bar'
import { Toaster } from '@/components/ui/sonner'

export function Root() {
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
      <ScrollRestoration />
      <Toaster />
    </div>
  )
}
