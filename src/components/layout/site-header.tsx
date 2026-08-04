import { Menu, Search } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'

import { AccountButton } from '@/components/layout/account-button'
import { CreditButton } from '@/components/credit/credit-button'
import { OfferButton } from '@/components/layout/offer-button'

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

/*
  Cadena, NO funcion.

  `NavigationMenuLink asChild` mete el enlace por un Slot de Radix, y el Slot
  fusiona los className concatenando cadenas. Si aqui llega la funcion que admite
  NavLink —la de `({ isActive }) => ...`— se convierte en texto al concatenarla y
  no se aplica ni una sola clase: era el motivo de que el menu no saliera en
  versalitas y de que nunca se viera el subrayado de la pagina activa.

  Con una cadena, NavLink añade el por su cuenta la clase `active`, y de ahi
  cuelga el subrayado.
*/
const linkClass = cn(
  navigationMenuTriggerStyle(),
  '[&.active]:underline [&.active]:underline-offset-8 [&.active]:decoration-2',
)

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <header
      // Lo lee `scrollToListTop` para descontar el alto de la cabecera al
      // traer una lista a la vista: si no, tapa las primeras tarjetas.
      data-site-header
      className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85"
    >
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
        <nav className="ml-auto hidden lg:flex lg:items-center">
          <NavigationMenu viewport={false}>
            {/* No hay "Inicio": el logo ya lleva a la portada, y un enlace mas
                para lo mismo solo alarga la barra. */}
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <NavLink to={ROUTES.projects} className={linkClass}>
                    Proyectos
                  </NavLink>
                </NavigationMenuLink>
              </NavigationMenuItem>

              {/* Créditos no lleva a ninguna parte: abre la consulta de
                  viabilidad aqui mismo. Va en la lista igualmente porque es
                  donde el visitante lo busca. */}
              <NavigationMenuItem>
                <CreditButton className={linkClass} />
              </NavigationMenuItem>

              <NavigationMenuItem>
                {/*
                  "Ventas" es a la vez enlace y desplegable: al pulsarlo lleva a
                  todo el inventario, y el menu solo sirve para afinar por tipo.
                  Antes habia dentro una entrada "Todos los inmuebles" que hacia
                  justo lo que ya hace el titulo — dos caminos al mismo sitio, y
                  uno de ellos escondido detras de un menu.
                */}
                <NavigationMenuTrigger asChild>
                  <Link to={ROUTES.sales}>Ventas</Link>
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="w-64 p-1">
                    {/* Los tipos dependen del catalogo. Se suspenden solos para no
                        retrasar el resto de la cabecera, que no necesita datos. */}
                    <Suspense fallback={<TypesFallback />}>
                      <TypeLinks />
                    </Suspense>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Contactenos no esta aqui a proposito: vive en el pie. */}
            </NavigationMenuList>
          </NavigationMenu>

          {/* Las dos acciones van fuera de la lista de navegacion: no son sitios
              del sitio, son cosas que se hacen. */}
          <div className="ml-3 flex items-center gap-2">
            <OfferButton size="sm" className="tracking-wide uppercase" />
            {/* "Entrar" es de los propietarios, no del equipo: el acceso al
                panel bajo al pie, que es donde lo busca quien trabaja aqui. */}
            <AccountButton size="sm" className="tracking-wide uppercase" />
          </div>
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
