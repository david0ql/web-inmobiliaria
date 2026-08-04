import { Phone, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { SocialLinks } from '@/components/layout/social-links'
import { SITE, ROUTES } from '@/lib/site'

/**
 * La barra negra de arriba del todo. En el tema original el buscador libre
 * desaparece por debajo de `md` y las redes por debajo de `sm`; el telefono se
 * queda siempre porque es lo que la gente busca desde el movil.
 */
export function TopBar() {
  const navigate = useNavigate()

  return (
    <section className="border-b bg-white text-neutral-800">
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
          <div className="flex w-[280px] items-center gap-1 rounded-md border bg-secondary px-2 transition-colors focus-within:bg-background">
            <input
              type="text"
              name="match"
              aria-label="Realizar búsqueda"
              placeholder="Realizar búsqueda"
              className="h-8 w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              className="flex size-6 shrink-0 items-center justify-center rounded transition-colors hover:bg-black/5"
            >
              <Search className="size-3.5" />
              <span className="sr-only">Buscar</span>
            </button>
          </div>
        </form>

        {/* Por debajo de md el buscador se oculta y el telefono se queda solo:
            centrado se lee como una barra, pegado a la derecha como un descuido. */}
        <div className="flex flex-1 items-center justify-center gap-3 md:justify-end">
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
