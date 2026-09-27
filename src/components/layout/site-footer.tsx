import { Mail, MapPin, Phone } from 'lucide-react'
import { Link } from '@/lib/nav'

import { CreditButton } from '@/components/credit/credit-button'
import { SocialLinks } from '@/components/layout/social-links'
import { useT } from '@/lib/i18n'
import { ROUTES, SITE } from '@/lib/site'

/**
 * Dos bloques y nada mas: quienes somos y como contactar.
 *
 * Antes habia cuatro columnas —incluida una lista de enlaces que repetia el menu
 * y un bloque de OFERTAR—. La accion de ofertar subio a la cabecera como "Publica
 * tu inmueble", que es donde la gente la busca, y repetir la navegacion abajo no
 * aportaba nada en un sitio de cinco pantallas.
 */
/**
 * Los seis sitios a los que se llega desde el pie.
 *
 * No es el menu repetido: "Inicio" y "Busqueda avanzada" no pintan nada aqui
 * —quien esta en el pie viene de recorrer la portada— y "Mi cuenta" ya vive en
 * la cabecera, que es donde se busca.
 */
/* La lista guarda la clave, no la frase: el rotulo se traduce al pintarlo. */
const INFORMACION = [
  { to: ROUTES.projects, label: 'nav.projects' },
  { to: ROUTES.sales, label: 'nav.sales' },
  { to: ROUTES.contact, label: 'nav.contact' },
  { to: ROUTES.privacy, label: 'nav.privacy' },
]

export function SiteFooter() {
  const t = useT()

  return (
    <footer className="mt-16 border-t bg-secondary/40">
      <div className="container-site grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-3">
        <section>
          <FooterHeading>{t('footer.about.title')}</FooterHeading>
          <p className="max-w-sm text-sm text-muted-foreground">{t(SITE.tagline)}</p>
          <SocialLinks className="mt-4 -ml-2" />
        </section>

        <section>
          <FooterHeading>{t('nav.contact')}</FooterHeading>
          {/*
            El telefono primero, y despues el correo: en una inmobiliaria se
            llama, no se escribe. La direccion baja al final porque es lo que se
            mira una sola vez, cuando ya se decidio ir.
          */}
          <address className="flex min-w-0 flex-col gap-3 text-sm not-italic">
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
            <span className="flex gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span>
                {SITE.address}
                <br />
                <strong className="font-medium">{SITE.city}</strong>
              </span>
            </span>
          </address>
        </section>

        {/*
          Los mismos caminos que la cabecera.

          Quien llega al pie ya bajo la pagina entera: obligarle a subir para
          encontrar el menu es la forma mas barata de perderlo. Es tambien lo
          que espera un buscador —enlaces internos al final— y lo que hace
          cualquier inmobiliaria.

          Una sola columna, tambien en movil: a dos, los cinco rotulos caian de
          forma irregular —dos, dos y uno suelto— y no habia manera de recorrer
          la lista de arriba abajo de un solo barrido.
        */}
        <section className="sm:col-span-2 lg:col-span-1">
          <FooterHeading>{t('footer.links.title')}</FooterHeading>
          <nav aria-label={t('footer.links.nav')}>
            <ul className="grid gap-x-6 gap-y-2.5 text-sm">
              <li>
                <Link to={ROUTES.projects} className="hover:underline">
                  {t('nav.projects')}
                </Link>
              </li>
              <li>
                {/* Créditos no es una página: es el modal que abre el menú. */}
                <CreditButton className="h-auto p-0 text-sm font-normal tracking-normal normal-case hover:underline" />
              </li>
              {INFORMACION.filter((item) => item.to !== ROUTES.projects).map(
                (item) => (
                  <li key={item.to}>
                    <Link to={item.to} className="hover:underline">
                      {t(item.label)}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </nav>
        </section>
      </div>

      <div className="border-t">
        <div className="container-site flex flex-col gap-1 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            {t('footer.copyright', {
              year: new Date().getFullYear(),
              name: SITE.name,
            })}
          </p>
          {/* La politica de privacidad se queda: es un enlace exigible, no
              navegacion, y esta indexado desde el sitio anterior. */}
          {/*
            Sin el acceso del equipo. El panel es otra aplicacion, con su propia
            direccion, y quien trabaja aqui la tiene guardada: anunciarla en
            todas las paginas del sitio publico solo servia para que la
            encontrara quien no debe entrar.
          */}
          <div className="flex flex-wrap items-center gap-4">
            <Link to={ROUTES.privacy} className="hover:underline">
              {t('nav.privacy')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

/*
  h2 y no h4: los titulos del pie son secciones de primer nivel dentro del pie,
  no subapartados de lo ultimo que hubiera en la pagina. Con h4 el documento
  saltaba de h2 a h4 en cualquier pagina sin h3, que es lo que un lector de
  pantalla lee como "falta un nivel".
*/
function FooterHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 text-xs font-bold tracking-widest uppercase">
      {children}
    </h2>
  )
}
