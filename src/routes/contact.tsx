import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react'

import { SectionHeading } from '@/components/common/section-heading'
import { OfferButton } from '@/components/layout/offer-button'
import { SocialLinks } from '@/components/layout/social-links'
import { SITE } from '@/lib/site'

export function Contact() {
  const whatsapp = SITE.phone.replace(/\D/g, '')

  return (
    <div className="container-site py-12">
      <SectionHeading as="h1" light="Contá" strong="ctenos" />

      <div className="grid gap-8 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <p className="mb-8 max-w-xl text-sm text-muted-foreground">
            {SITE.tagline}. Escríbenos, llámanos o pásate por la oficina: te
            atendemos y te acompañamos en todo el proceso.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <ContactCard icon={MapPin} title="Ubicación">
              {SITE.address}
              <br />
              <strong className="font-medium">{SITE.city}</strong>
            </ContactCard>

            <ContactCard icon={Phone} title="Móvil">
              <a href={SITE.phoneHref} className="hover:underline">
                {SITE.phone}
              </a>
            </ContactCard>

            <ContactCard icon={Mail} title="Email">
              <a
                href={`mailto:${SITE.email}`}
                className="break-all hover:underline"
              >
                {SITE.email}
              </a>
            </ContactCard>

            <ContactCard icon={MessageCircle} title="WhatsApp">
              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noreferrer noopener"
                className="hover:underline"
              >
                Escríbenos por WhatsApp
              </a>
            </ContactCard>
          </div>

          <div className="mt-8">
            <p className="mb-2 text-xs font-bold tracking-widest uppercase">
              Síguenos
            </p>
            <SocialLinks className="-ml-2" />
          </div>
        </section>

        <section className="flex h-fit flex-col items-start gap-3 rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">
            Oferte su inmueble con nosotros
          </h2>
          <p className="text-sm text-muted-foreground">
            Cuéntanos lo básico y un asesor te contacta para agendar la visita de
            valoración.
          </p>
          <OfferButton />
        </section>
      </div>
    </div>
  )
}

function ContactCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof MapPin
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <p className="mb-2 flex items-center gap-2 text-xs font-bold tracking-widest uppercase">
        <Icon className="size-4 text-muted-foreground" />
        {title}
      </p>
      <div className="text-sm">{children}</div>
    </div>
  )
}
