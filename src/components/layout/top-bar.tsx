import { Phone, Search } from 'lucide-react'
import { useNavigate } from '@/lib/nav'

import { LanguageSwitch } from '@/components/layout/language-switch'
import { SocialLinks } from '@/components/layout/social-links'
import { useT } from '@/lib/i18n'
import { SITE, ROUTES } from '@/lib/site'

/**
 * La barra negra de arriba del todo. En el tema original el buscador libre
 * desaparece por debajo de `md` y las redes por debajo de `sm`; el telefono se
 * queda siempre porque es lo que la gente busca desde el movil.
 */
export function TopBar() {
  const navigate = useNavigate()
  const t = useT()

  return (
    <section className="border-t-4 border-[#333] bg-[#0d0d0d] text-white">
      <div className="container-site flex items-center justify-between gap-4 py-2">
        <form
          className="hidden md:block"
          onSubmit={(event) => {
            event.preventDefault()
            const value = new FormData(event.currentTarget).get('match')
            const match = String(value ?? '').trim()
            navigate(match ? `${ROUTES.search}?match=${encodeURIComponent(match)}` : ROUTES.search)
          }}
        >
          <div className="flex w-[280px] items-center gap-1 rounded-md bg-white/10 px-2 transition-colors focus-within:bg-white/15">
            <input
              type="text"
              name="match"
              aria-label={t('nav.search.placeholder')}
              placeholder={t('nav.search.placeholder')}
              className="h-8 w-full bg-transparent text-xs text-white outline-none placeholder:text-white/50"
            />
            <button
              type="submit"
              className="flex size-6 shrink-0 items-center justify-center rounded transition-colors hover:bg-white/15"
            >
              <Search className="size-3.5" />
              <span className="sr-only">{t('nav.search.submit')}</span>
            </button>
          </div>
        </form>

        {/* Por debajo de md el buscador se oculta y el telefono se queda solo:
            centrado se lee como una barra, pegado a la derecha como un descuido. */}
        <div className="flex flex-1 items-center justify-center gap-3 md:justify-end">
          {/* Lo unico de esta barra que cambia lo que se lee en el resto del
              sitio: el idioma, que arrastra tambien la moneda. */}
          <LanguageSwitch />
          <a
            href={SITE.phoneHref}
            className="flex items-center gap-1.5 text-xs font-medium tracking-wide transition-opacity hover:opacity-80"
          >
            <Phone className="size-3.5" />
            {SITE.phone}
          </a>
          <SocialLinks className="hidden sm:flex" />
        </div>
      </div>
    </section>
  )
}
