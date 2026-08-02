import { Mail, MapPin, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'

import { SocialLinks } from '@/components/layout/social-links'
import { ROUTES, SITE } from '@/lib/site'

/**
 * Dos bloques y nada mas: quienes somos y como contactar.
 *
 * Antes habia cuatro columnas —incluida una lista de enlaces que repetia el menu
 * y un bloque de OFERTAR—. La accion de ofertar subio a la cabecera como "Publica
 * tu inmueble", que es donde la gente la busca, y repetir la navegacion abajo no
 * aportaba nada en un sitio de cinco pantallas.
 */
export function SiteFooter() {
  return (
    <footer className="mt-16 border-t bg-secondary/40">
      <div className="container-site grid gap-10 py-12 sm:grid-cols-2">
        <section>
          <FooterHeading>Sobre nosotros</FooterHeading>
          <p className="max-w-sm text-sm text-muted-foreground">{SITE.tagline}</p>
          <SocialLinks className="mt-4 -ml-2" />
        </section>

        <section>
          <FooterHeading>Contáctenos</FooterHeading>
          <address className="flex min-w-0 flex-col gap-3 text-sm not-italic">
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
              <span className="tabular">{SITE.phone}</span>
            </a>
            <a
              href={`mailto:${SITE.email}`}
              title={SITE.email}
              className="flex min-w-0 gap-2 hover:underline"
            >
              <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{SITE.email}</span>
            </a>
          </address>
          <Link
            to={ROUTES.contact}
            className="mt-4 inline-block text-sm font-medium hover:underline"
          >
            Ir a Contáctenos →
          </Link>
        </section>
      </div>

      <div className="border-t">
        <div className="container-site flex flex-col gap-1 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {SITE.name}. Todos los derechos
            reservados.
          </p>
          {/* La politica de privacidad se queda: es un enlace exigible, no
              navegacion, y esta indexado desde el sitio anterior. */}
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
