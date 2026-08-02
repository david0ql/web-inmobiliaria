import { Mail, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'

import { SocialLinks } from '@/components/layout/social-links'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Separator } from '@/components/ui/misc'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ROUTES, SITE } from '@/lib/site'
import { menuTypes, typePath, useSiteData } from '@/lib/site-data'

/**
 * Por debajo de `lg` el mega-menu no cabe: los doce tipos pasan a un panel
 * lateral con la lista dentro de un acordeon, que es como se navega en un movil
 * sin tener que acertarle a un desplegable en hover.
 */
export function MobileNav({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const types = menuTypes(useSiteData())
  const close = () => onOpenChange(false)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{SITE.name}</SheetTitle>
          <SheetDescription>{SITE.tagline}</SheetDescription>
        </SheetHeader>

        <nav className="px-4">
          <Link
            to={ROUTES.home}
            onClick={close}
            className="block border-b py-4 text-sm font-medium"
          >
            Inicio
          </Link>

          <Accordion type="single" collapsible defaultValue="ventas">
            <AccordionItem value="ventas">
              <AccordionTrigger>Ventas</AccordionTrigger>
              <AccordionContent className="flex flex-col">
                <Link
                  to={ROUTES.sales}
                  onClick={close}
                  className="rounded-md px-2 py-2 font-medium hover:bg-secondary"
                >
                  Todos los inmuebles
                </Link>
                {types.map((type) => (
                  <Link
                    key={type.id}
                    to={typePath(type)}
                    onClick={close}
                    className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-secondary"
                  >
                    <span>{type.name}</span>
                    {type.count !== null && (
                      <span className="tabular text-xs text-muted-foreground">
                        ({type.count})
                      </span>
                    )}
                  </Link>
                ))}
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Link
            to={ROUTES.projects}
            onClick={close}
            className="block border-b py-4 text-sm font-medium"
          >
            Proyectos
          </Link>

          <Link
            to={ROUTES.contact}
            onClick={close}
            className="block border-b py-4 text-sm font-medium"
          >
            Contáctenos
          </Link>
        </nav>

        <Separator />

        <div className="flex flex-col gap-3 px-4 pb-6">
          <a
            href={SITE.phoneHref}
            className="flex items-center gap-2 text-sm hover:underline"
          >
            <Phone className="size-4 shrink-0" />
            {SITE.phone}
          </a>
          <a
            href={`mailto:${SITE.email}`}
            className="flex items-center gap-2 text-sm break-all hover:underline"
          >
            <Mail className="size-4 shrink-0" />
            {SITE.email}
          </a>
          <SocialLinks className="-ml-2 text-foreground" />
        </div>
      </SheetContent>
    </Sheet>
  )
}
