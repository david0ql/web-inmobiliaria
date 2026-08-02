import { Home, Mail, MapPin, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'

import { OfferButton } from '@/components/layout/offer-button'
import { SocialLinks } from '@/components/layout/social-links'
import { ROUTES, SITE } from '@/lib/site'

const LINKS = [
  { to: ROUTES.home, label: 'Inicio' },
  { to: ROUTES.sales, label: 'Ventas' },
  { to: ROUTES.projects, label: 'Proyectos' },
  { to: ROUTES.contact, label: 'Contáctenos' },
  { to: ROUTES.privacy, label: 'Políticas de privacidad' },
]

/** Las cuatro columnas del pie, que en el tema original son `col-lg-3`. */
export function SiteFooter() {
  return (
    <footer className="mt-16 border-t bg-secondary/40">
      <div className="container-site grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <section>
          <FooterHeading>Quiénes somos</FooterHeading>
          <p className="text-sm text-muted-foreground">{SITE.tagline}</p>
        </section>

        <section>
          <FooterHeading>Ubicación y contacto</FooterHeading>
          <address className="flex flex-col gap-3 text-sm not-italic">
            <span className="flex gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span>
                {SITE.address}
                <br />
                <strong className="font-medium">{SITE.city}</strong>
              </span>
            </span>
            <a href={SITE.phoneHref} className="flex gap-2 hover:underline">
              <Phone className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              {SITE.phone}
            </a>
            <a
              href={`mailto:${SITE.email}`}
              className="flex gap-2 break-all hover:underline"
            >
              <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              {SITE.email}
            </a>
          </address>
          <SocialLinks className="mt-4 -ml-2" />
        </section>

        <section>
          <FooterHeading>Información</FooterHeading>
          <ul className="flex flex-col gap-2 text-sm">
            {LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col items-start gap-3 rounded-lg border bg-background p-5">
          <Home className="size-7" />
          <p className="font-medium">Oferte su inmueble con nosotros</p>
          <OfferButton />
        </section>
      </div>

      <div className="border-t">
        <div className="container-site flex flex-col gap-1 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {SITE.name}. Todos los derechos
            reservados.
          </p>
          <Link to={ROUTES.privacy} className="hover:underline">
            Políticas de privacidad
          </Link>
        </div>
      </div>
    </footer>
  )
}

function FooterHeading({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="mb-4 text-xs font-bold tracking-widest uppercase">
      {children}
    </h4>
  )
}
