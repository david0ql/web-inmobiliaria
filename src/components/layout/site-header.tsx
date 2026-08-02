import { Menu, Search } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/misc'
import { menuTypes, typePath, useSiteData } from '@/lib/site-data'
import { ROUTES, SITE } from '@/lib/site'
import { cn } from '@/lib/utils'

/* El panel lateral solo existe por debajo de lg y solo si se pulsa. Radix Dialog
   mas el acordeon no tienen por que viajar en el trozo principal. */
const MobileNav = lazy(() =>
  import('@/components/layout/mobile-nav').then((m) => ({ default: m.MobileNav })),
)

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    navigationMenuTriggerStyle(),
    isActive && 'underline underline-offset-8 decoration-2',
  )

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className="container-site flex items-center gap-4 py-3">
        <Link to={ROUTES.home} className="shrink-0">
          <img
            src={SITE.logo}
            width={250}
            height={90}
            alt={SITE.name}
            /* El logo es lo primero que se ve: no se difiere. */
            fetchPriority="high"
            className="h-11 w-auto lg:h-14"
          />
        </Link>

        {/* El menu completo solo cabe a partir de lg, igual que en el tema
            original (col-lg-10). Por debajo se va al panel lateral. */}
        <nav className="ml-auto hidden lg:block">
          <NavigationMenu viewport={false}>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <NavLink to={ROUTES.home} end className={linkClass}>
                    Inicio
                  </NavLink>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuTrigger>Ventas</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="w-64 p-1">
                    <li>
                      <NavigationMenuLink asChild>
                        <Link to={ROUTES.sales} className="font-medium">
                          Todos los inmuebles
                        </Link>
                      </NavigationMenuLink>
                    </li>
                    {/* Los tipos dependen del catalogo. Se suspenden solos para no
                        retrasar el resto de la cabecera, que no necesita datos. */}
                    <Suspense fallback={<TypesFallback />}>
                      <TypeLinks />
                    </Suspense>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <NavLink to={ROUTES.projects} className={linkClass}>
                    Proyectos
                  </NavLink>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <NavLink to={ROUTES.contact} className={linkClass}>
                    Contáctenos
                  </NavLink>
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </nav>

        <div className="ml-auto flex items-center gap-1 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Buscar"
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen((open) => !open)}
          >
            <Search />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Abrir menú"
            onPointerEnter={() => void import('@/components/layout/mobile-nav')}
            onClick={() => setMobileOpen(true)}
          >
            <Menu />
          </Button>
        </div>
      </div>

      {searchOpen && <SlidingSearch onDone={() => setSearchOpen(false)} />}

      {mobileOpen && (
        <Suspense fallback={null}>
          <MobileNav open onOpenChange={setMobileOpen} />
        </Suspense>
      )}
    </header>
  )
}

function TypeLinks() {
  const types = menuTypes(useSiteData())
  return (
    <>
      {types.map((type) => (
        <li key={type.id}>
          <NavigationMenuLink asChild>
            <Link
              to={typePath(type)}
              className="flex-row items-center justify-between"
            >
              <span>{type.name}</span>
              {type.count !== null && (
                <span className="tabular text-xs text-muted-foreground">
                  ({type.count})
                </span>
              )}
            </Link>
          </NavigationMenuLink>
        </li>
      ))}
    </>
  )
}

function TypesFallback() {
  return (
    <>
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i} className="px-2 py-2">
          <Skeleton className="h-3.5 w-full" />
        </li>
      ))}
    </>
  )
}

/**
 * El `slidingSearch` del tema: la lupa del movil despliega una barra de ancho
 * completo justo debajo de la cabecera.
 */
function SlidingSearch({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate()

  return (
    <div className="border-t bg-secondary/60 lg:hidden">
      <form
        className="container-site flex gap-2 py-3"
        onSubmit={(event) => {
          event.preventDefault()
          const value = new FormData(event.currentTarget).get('match')
          const match = String(value ?? '').trim()
          navigate(
            match ? `${ROUTES.search}?match=${encodeURIComponent(match)}` : ROUTES.search,
          )
          onDone()
        }}
      >
        <input
          autoFocus
          type="text"
          name="match"
          aria-label="Realizar búsqueda"
          placeholder="Realizar búsqueda"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/15"
        />
        <Button type="submit">Buscar</Button>
      </form>
    </div>
  )
}
