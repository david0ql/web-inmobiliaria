import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate, useNavigation } from 'react-router-dom'

import { useSmoothScrollTop } from '@/lib/scroll'
import { CurrencyProvider } from '@/lib/currency'
import { I18nProvider, leerPreferencia, otroIdioma } from '@/lib/i18n'
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
  useSmoothScrollTop()

  const navigation = useNavigation()

  return (
    /*
      La moneda envuelve el sitio entero: se elige una vez en la barra de
      arriba y manda en las tarjetas, en la ficha y en el buscador.
    */
    <I18nProvider>
      <PreferenciaDeIdioma />
      <CurrencyProvider>
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

      <Toaster />
      </div>
      </CurrencyProvider>
    </I18nProvider>
  )
}

/**
 * A quien llega en español pero prefiere ingles, se le lleva a `/en`.
 *
 * Solo con una preferencia GUARDADA, es decir, solo si ya eligio antes en este
 * navegador: adivinar el idioma por la cabecera del navegador y redirigir a
 * ciegas es lo que hace que un buscador indexe la pagina equivocada y que
 * alguien comparta un enlace que a otro le abre en otro idioma.
 */
function PreferenciaDeIdioma() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const guardada = leerPreferencia()
    const enIngles = pathname === '/en' || pathname.startsWith('/en/')
    if (guardada === 'en' && !enIngles) {
      navigate(otroIdioma(pathname, 'en') + window.location.search, {
        replace: true,
      })
    }
  }, [pathname, navigate])

  return null
}
