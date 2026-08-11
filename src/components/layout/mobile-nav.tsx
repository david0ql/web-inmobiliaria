import { LogIn, Mail, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'

import { AccountButton } from '@/components/layout/account-button'
import { CreditButton } from '@/components/credit/credit-button'
import { OfferButton } from '@/components/layout/offer-button'
import { SocialLinks } from '@/components/layout/social-links'
import { Button } from '@/components/ui/button'
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
import { useT } from '@/lib/i18n'
import { PANEL_URL, ROUTES, SITE } from '@/lib/site'
import { menuTypes, typePath, useSiteData } from '@/lib/site-data'

/** Mismo trato tipografico que la barra de escritorio: versalitas. */
const ITEM =
  'block border-b py-4 text-[0.8125rem] font-medium tracking-wide uppercase'

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
  const t = useT()
  const close = () => onOpenChange(false)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{SITE.name}</SheetTitle>
          <SheetDescription>{t(SITE.tagline)}</SheetDescription>
        </SheetHeader>

        {/* Mismo orden que en la barra de escritorio. Sin "Inicio": el logo de
            la cabecera ya lleva a la portada. */}
        <nav className="px-4">
          <Link to={ROUTES.projects} onClick={close} className={ITEM}>
            {t('nav.projects')}
          </Link>

          {/* Abre la consulta de viabilidad. El panel lateral se queda abierto
              debajo a proposito: cerrarlo desmontaria el boton, y con el el
              modal que acaba de abrir. Al cerrar la consulta se vuelve al menu,
              que es de donde se venia. */}
          <CreditButton className={`${ITEM} w-full text-left`} />

          <Accordion type="single" collapsible defaultValue="ventas">
            <AccordionItem value="ventas">
              <AccordionTrigger className="text-[0.8125rem] tracking-wide uppercase">
                {t('nav.sales')}
              </AccordionTrigger>
              <AccordionContent className="flex flex-col">
                <Link
                  to={ROUTES.sales}
                  onClick={close}
                  className="rounded-md px-2 py-2 font-medium hover:bg-secondary"
                >
                  {t('nav.sales.all')}
                </Link>
                {types.map((type) => (
                  <Link
                    key={type.id}
                    to={typePath(type)}
                    onClick={close}
                    className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-secondary"
                  >
                    <span>
                      {t(`catalog.propertyType.${type.id}`, undefined, type.name)}
                    </span>
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

          {/* Contactenos no esta aqui a proposito: vive en el pie. Aun asi, el
              telefono y el correo siguen ahi abajo, a un toque. */}
          <div className="flex flex-col gap-2 py-4">
            <OfferButton className="w-full tracking-wide uppercase" />
            <AccountButton className="w-full tracking-wide uppercase" />
            <Button
              asChild
              variant="outline"
              className="w-full tracking-wide uppercase"
            >
              <a href={PANEL_URL} target="_blank" rel="noreferrer noopener">
                <LogIn />
                {t('nav.signin')}
              </a>
            </Button>
          </div>
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
